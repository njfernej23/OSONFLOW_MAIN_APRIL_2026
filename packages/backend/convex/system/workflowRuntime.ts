import { saveMessage } from "@convex-dev/agent"
import { ConvexError, v } from "convex/values"
import { components, internal } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import { internalMutation } from "../_generated/server"
import {
  MAX_STEPS_PER_TURN,
  asBoolean,
  asString,
  evaluateCondition,
  getCaptureVariableKey,
  getEdgesBySource,
  getNextNodeId,
  getNodeMap,
  getStartNodeId,
  isAiNodeType,
  isBlockNodeType,
  isRecord,
  getBlockSteps,
  matchChoice,
  normalizeButtons,
  renderTemplate,
  stripHtml,
  type JsonRecord,
  type RuntimeVariables,
  type WaitingMode,
  type WorkflowDefinition,
} from "../lib/workflowEngine"

const MAX_TRACE_EVENTS = 80
const MAX_COMPONENT_DEPTH = 5

type TraceLevel =
  | "info"
  | "step"
  | "branch"
  | "wait"
  | "ai"
  | "warn"
  | "error"
  | "done"

type TraceEvent = {
  at: number
  level: TraceLevel
  nodeId?: string
  nodeType?: string
  title: string
  detail?: string
}

const appendTrace = (
  existing: TraceEvent[] | undefined,
  event: Omit<TraceEvent, "at"> & { at?: number }
) => {
  const next = [
    ...(existing ?? []),
    {
      at: event.at ?? Date.now(),
      level: event.level,
      nodeId: event.nodeId,
      nodeType: event.nodeType,
      title: event.title,
      detail: event.detail,
    },
  ]
  return next.length > MAX_TRACE_EVENTS
    ? next.slice(next.length - MAX_TRACE_EVENTS)
    : next
}

const getPublishedDefinition = (
  workflow: Doc<"workflows">
): WorkflowDefinition | null => {
  if (!workflow.publishedDefinition) {
    return null
  }

  return workflow.publishedDefinition as WorkflowDefinition
}

/**
 * The graph a session is currently inside. Inside a component this is the
 * child workflow, not the one the conversation started on.
 */
const getActiveDefinition = async (
  ctx: any,
  session: Doc<"workflowSessions">
): Promise<WorkflowDefinition | null> => {
  const workflow = await ctx.db.get(
    session.activeWorkflowId ?? session.workflowId
  )

  return workflow ? getPublishedDefinition(workflow) : null
}

const getActiveWorkflow = async (
  ctx: { db: any },
  organizationId: string
) => {
  const workflow = await ctx.db
    .query("workflows")
    .withIndex("by_organization_id_and_active", (q: any) =>
      q.eq("organizationId", organizationId).eq("isActive", true)
    )
    .first()

  if (!workflow?.publishedDefinition) {
    return null
  }

  return workflow as Doc<"workflows">
}

const saveAssistantMessage = async (
  ctx: any,
  threadId: string,
  content: string
) => {
  const text = content.trim()

  if (!text) {
    return false
  }

  await saveMessage(ctx, components.agent, {
    threadId,
    message: {
      role: "assistant",
      content: text,
    },
  })

  return true
}

const saveUserMessage = async (ctx: any, threadId: string, prompt: string) => {
  await saveMessage(ctx, components.agent, {
    threadId,
    prompt,
  })
}

const clearWaitState = () => ({
  pendingNodeId: null as string | null,
  pendingButtons: [] as Array<{ id: string; label: string }>,
  waitingMode: undefined as WaitingMode | undefined,
  pendingCaptureKey: undefined as string | undefined,
  pendingPrompt: undefined as string | undefined,
  pendingAiNodeId: null as string | null,
  pendingApiNodeId: null as string | null,
  pendingActionKind: undefined as
    | "api"
    | "javascript"
    | "tool"
    | "function"
    | undefined,
})

const patchSession = async (
  ctx: any,
  sessionId: Id<"workflowSessions">,
  patch: Partial<Doc<"workflowSessions">>,
  traceEvent?: Omit<TraceEvent, "at"> & { at?: number }
) => {
  const current = await ctx.db.get(sessionId)
  const executionTrace = traceEvent
    ? appendTrace(
        (current?.executionTrace as TraceEvent[] | undefined) ?? undefined,
        traceEvent
      )
    : undefined

  await ctx.db.patch(sessionId, {
    ...patch,
    ...(executionTrace ? { executionTrace } : {}),
    updatedAt: Date.now(),
  })
}

const markConversationResolvedByWorkflow = async (
  ctx: any,
  conversation: Doc<"conversations">
) => {
  if (conversation.status === "resolved") {
    return
  }

  const now = Date.now()

  await ctx.db.patch(conversation._id, {
    status: "resolved",
    resolvedAt: conversation.resolvedAt ?? now,
    resolutionSource: "workflow",
  })

  await ctx.runMutation(
    (internal as any).system.integrationWebhooks.dispatchEvent,
    {
      organizationId: conversation.organizationId,
      eventType: "conversation.status_changed",
      payload: {
        conversationId: conversation._id,
        threadId: conversation.threadId,
        previousStatus: conversation.status,
        status: "resolved",
        source: "workflow",
      },
    }
  )
}

const formatCardMessage = (
  data: Record<string, unknown>,
  variables: RuntimeVariables
) => {
  const title = renderTemplate(stripHtml(asString(data.title)), variables)
  const description = renderTemplate(stripHtml(asString(data.description)), variables)
  const url = renderTemplate(asString(data.url), variables).trim()
  const parts = [title, description, url ? `Image: ${url}` : ""]
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.join("\n\n")
}

const formatCarouselMessage = (
  data: JsonRecord,
  variables: RuntimeVariables
) => {
  const cards = Array.isArray(data.cards) ? data.cards : []
  const intro = renderTemplate(stripHtml(asString(data.description)), variables)
  const blocks = cards
    .filter(isRecord)
    .map((card: JsonRecord, index: number) => {
      const title =
        renderTemplate(stripHtml(asString(card.title)), variables) ||
        `Option ${index + 1}`
      const description = renderTemplate(stripHtml(asString(card.description)), variables)
      const url = renderTemplate(asString(card.url), variables).trim()

      return [title, description, url ? `Image: ${url}` : ""]
        .filter(Boolean)
        .join("\n")
    })
    .filter(Boolean)

  return [intro, ...blocks].filter(Boolean).join("\n\n")
}

const getCarouselButtons = (data: JsonRecord) => {
  const cards = Array.isArray(data.cards) ? data.cards : []

  return cards
    .filter(isRecord)
    .flatMap((card: JsonRecord) => normalizeButtons(card.buttons))
}

const formatImageMessage = (
  data: Record<string, unknown>,
  variables: RuntimeVariables
) => {
  const url = renderTemplate(asString(data.url), variables).trim()
  const alt = renderTemplate(stripHtml(asString(data.alt)), variables)

  if (!url) {
    return alt || ""
  }

  return alt ? `${alt}\n${url}` : url
}

type ExecuteResult = {
  handled: true
  assistantMessagesSent: number
  awaitingAi?: boolean
}

const executeFromNode = async (
  ctx: any,
  args: {
    conversation: Doc<"conversations">
    session: Doc<"workflowSessions">
    definition: WorkflowDefinition
    startNodeId: string | null
    startStepIndex?: number
    variables: RuntimeVariables
  }
): Promise<ExecuteResult> => {
  // The walk can move between workflows: a Component block pushes a frame and
  // continues in the child graph, so the definition is not fixed for the call.
  let currentDefinition = args.definition
  let nodeMap = getNodeMap(currentDefinition)
  let edgesBySource = getEdgesBySource(currentDefinition)
  let callStack = [...(args.session.callStack ?? [])]
  let activeWorkflowId: Id<"workflows"> =
    args.session.activeWorkflowId ?? args.session.workflowId
  let currentNodeId = args.startNodeId
  /** Position inside the current Block; always 0 for standalone nodes. */
  let currentStepIndex = args.startStepIndex ?? 0
  let variables = { ...args.variables }
  let steps = 0
  let assistantMessagesSent = 0
  let traceBuffer: TraceEvent[] = [
    ...(((args.session.executionTrace as TraceEvent[] | undefined) ??
      []) as TraceEvent[]),
  ]

  const record = (event: Omit<TraceEvent, "at"> & { at?: number }) => {
    traceBuffer = appendTrace(traceBuffer, event)
  }

  const flushPatch = async (
    patch: Partial<Doc<"workflowSessions">>,
    event?: Omit<TraceEvent, "at"> & { at?: number }
  ) => {
    if (event) {
      record(event)
    }
    await ctx.db.patch(args.session._id, {
      callStack,
      activeWorkflowId,
      pendingStepIndex: currentStepIndex,
      ...patch,
      executionTrace: traceBuffer,
      updatedAt: Date.now(),
    })
  }

  while (true) {
    if (!currentNodeId) {
      if (callStack.length === 0) {
        break
      }

      // The child graph ran out of steps: return to the caller and continue
      // past its Component block.
      const frame = callStack[callStack.length - 1]!
      callStack = callStack.slice(0, -1)

      const parentWorkflow = await ctx.db.get(frame.workflowId)
      const parentDefinition = parentWorkflow
        ? getPublishedDefinition(parentWorkflow)
        : null

      if (!parentDefinition) {
        record({
          level: "error",
          nodeId: frame.returnNodeId,
          title: "Component caller is unavailable",
        })
        break
      }

      currentDefinition = parentDefinition
      nodeMap = getNodeMap(currentDefinition)
      edgesBySource = getEdgesBySource(currentDefinition)
      activeWorkflowId = frame.workflowId

      record({
        level: "info",
        nodeId: frame.returnNodeId,
        title: "Returned from component",
      })

      const returnNode = nodeMap.get(frame.returnNodeId)

      if (isBlockNodeType(asString(returnNode?.type))) {
        // The Component was a step inside a block: carry on with the block.
        currentNodeId = frame.returnNodeId
        currentStepIndex = (frame.returnStepIndex ?? 0) + 1
      } else {
        currentNodeId = getNextNodeId(edgesBySource, frame.returnNodeId)
        currentStepIndex = 0
      }

      continue
    }

    steps += 1

    if (steps > MAX_STEPS_PER_TURN) {
      await saveAssistantMessage(
        ctx,
        args.conversation.threadId,
        "This workflow stopped because it looped too many times. A human operator will review the conversation."
      )
      await flushPatch(
        {
          status: "ended",
          currentNodeId,
          ...clearWaitState(),
          variables,
          endedAt: Date.now(),
        },
        {
          level: "error",
          nodeId: currentNodeId,
          title: "Loop guard tripped",
          detail: `Stopped after ${MAX_STEPS_PER_TURN} steps.`,
        }
      )
      return { handled: true, assistantMessagesSent: assistantMessagesSent + 1 }
    }

    const node = nodeMap.get(currentNodeId)

    if (!node) {
      await flushPatch(
        {
          status: "ended",
          currentNodeId,
          ...clearWaitState(),
          variables,
          endedAt: Date.now(),
        },
        {
          level: "error",
          nodeId: currentNodeId ?? undefined,
          title: "Missing node",
          detail: `Node ${currentNodeId} was not found in the published definition.`,
        }
      )
      return { handled: true, assistantMessagesSent }
    }

    const nodeData = isRecord(node.data) ? node.data : {}
    const nodeType = asString(node.type).trim()

    // A Block holds an ordered step list and is wired as a single unit; every
    // other node is one step in itself.
    const blockSteps = isBlockNodeType(nodeType)
      ? getBlockSteps(nodeData)
      : null

    if (blockSteps && currentStepIndex >= blockSteps.length) {
      // Ran off the end of the block: leave by the block's own edge.
      currentNodeId = getNextNodeId(edgesBySource, node.id)
      currentStepIndex = 0
      continue
    }

    const blockStep = blockSteps ? blockSteps[currentStepIndex]! : null
    const data = blockStep ? blockStep.data : nodeData
    const type = blockStep
      ? blockStep.type
      : nodeType || asString(data.label).trim().toLowerCase()

    /** Continue inside the block, or follow the node's outgoing edge. */
    const advance = () => {
      if (blockSteps) {
        currentStepIndex += 1
      } else {
        currentNodeId = getNextNodeId(edgesBySource, node.id)
      }
    }

    /**
     * Leave by a named port. Branching steps are always last in a block, so
     * this exits the block rather than continuing inside it.
     */
    const advanceVia = (handle: string) => {
      currentNodeId = getNextNodeId(edgesBySource, node.id, handle)
      currentStepIndex = 0
    }

    record({
      level: "step",
      nodeId: node.id,
      nodeType: type,
      title: `Enter ${type || "step"}`,
      detail: blockSteps ? `Block step ${currentStepIndex + 1}` : undefined,
    })

    switch (type) {
      case "start": {
        record({
          level: "info",
          nodeId: node.id,
          nodeType: type,
          title: "Workflow started",
        })
        advance()
        break
      }

      case "message": {
        const text = renderTemplate(stripHtml(asString(data.text)), variables)

        if (await saveAssistantMessage(ctx, args.conversation.threadId, text)) {
          assistantMessagesSent += 1
        }

        record({
          level: "info",
          nodeId: node.id,
          nodeType: type,
          title: "Sent message",
          detail: text.slice(0, 160) || "(empty)",
        })
        advance()
        break
      }

      case "image": {
        const text = formatImageMessage(data, variables)

        if (await saveAssistantMessage(ctx, args.conversation.threadId, text)) {
          assistantMessagesSent += 1
        }

        record({
          level: text ? "info" : "warn",
          nodeId: node.id,
          nodeType: type,
          title: text ? "Sent image" : "Image missing URL",
          detail: text.slice(0, 160) || undefined,
        })
        advance()
        break
      }

      case "setVariable": {
        const key = asString(data.key).trim()

        if (key) {
          variables[key] = renderTemplate(asString(data.value), variables)
          record({
            level: "info",
            nodeId: node.id,
            nodeType: type,
            title: `Set ${key}`,
            detail: variables[key] || "(empty)",
          })
        }

        advance()
        break
      }

      case "condition": {
        const passed = evaluateCondition(data, variables)
        const handle = passed ? "true" : "false"
        record({
          level: "branch",
          nodeId: node.id,
          nodeType: type,
          title: `Branch → ${handle}`,
          detail: `${asString(data.key)} ${asString(data.operator) || "equals"} ${asString(data.value)}`,
        })
        advanceVia(handle)
        break
      }

      case "buttons":
      case "card": {
        const buttons = normalizeButtons(data.buttons)

        if (type === "card") {
          const cardText = formatCardMessage(data, variables)
          if (
            await saveAssistantMessage(
              ctx,
              args.conversation.threadId,
              cardText
            )
          ) {
            assistantMessagesSent += 1
          }
          record({
            level: "info",
            nodeId: node.id,
            nodeType: type,
            title: "Showed card",
            detail: asString(data.title) || undefined,
          })
        }

        if (buttons.length === 0) {
          advance()
          break
        }

        await flushPatch(
          {
            status: "waiting",
            currentNodeId: node.id,
            pendingNodeId: node.id,
            pendingButtons: buttons,
            waitingMode: "buttons",
            pendingCaptureKey: undefined,
            pendingPrompt: undefined,
            pendingAiNodeId: null,
            variables,
          },
          {
            level: "wait",
            nodeId: node.id,
            nodeType: type,
            title: "Waiting for button",
            detail: buttons.map((button) => button.label).join(" · "),
          }
        )

        return { handled: true, assistantMessagesSent }
      }

      case "choice": {
        const choices = normalizeButtons(data.choices ?? data.buttons)
        const prompt = renderTemplate(stripHtml(asString(data.prompt)), variables)

        if (
          prompt &&
          (await saveAssistantMessage(ctx, args.conversation.threadId, prompt))
        ) {
          assistantMessagesSent += 1
        }

        if (choices.length === 0) {
          advance()
          break
        }

        await flushPatch(
          {
            status: "waiting",
            currentNodeId: node.id,
            pendingNodeId: node.id,
            pendingButtons: choices,
            waitingMode: "choice",
            pendingCaptureKey: getCaptureVariableKey(data),
            pendingPrompt: prompt || undefined,
            pendingAiNodeId: null,
            variables,
          },
          {
            level: "wait",
            nodeId: node.id,
            nodeType: type,
            title: "Waiting for choice",
            detail: choices.map((choice) => choice.label).join(" · "),
          }
        )

        return { handled: true, assistantMessagesSent }
      }

      case "capture": {
        const prompt = renderTemplate(stripHtml(asString(data.prompt)), variables)

        if (
          prompt &&
          (await saveAssistantMessage(ctx, args.conversation.threadId, prompt))
        ) {
          assistantMessagesSent += 1
        }

        await flushPatch(
          {
            status: "waiting",
            currentNodeId: node.id,
            pendingNodeId: node.id,
            pendingButtons: [],
            waitingMode: "capture",
            pendingCaptureKey: getCaptureVariableKey(data),
            pendingPrompt: prompt || undefined,
            pendingAiNodeId: null,
            variables,
          },
          {
            level: "wait",
            nodeId: node.id,
            nodeType: type,
            title: "Waiting for text capture",
            detail: `Stores into {{${getCaptureVariableKey(data)}}}`,
          }
        )

        return { handled: true, assistantMessagesSent }
      }

      case "callForward": {
        const message = renderTemplate(stripHtml(asString(data.description) ||
              "Connecting you with a human operator now."), variables)

        if (
          await saveAssistantMessage(ctx, args.conversation.threadId, message)
        ) {
          assistantMessagesSent += 1
        }

        await flushPatch(
          {
            status: "ended",
            currentNodeId: node.id,
            ...clearWaitState(),
            variables,
            endedAt: Date.now(),
          },
          {
            level: "warn",
            nodeId: node.id,
            nodeType: type,
            title: "Handoff to human",
            detail: message,
          }
        )
        await ctx.runMutation(internal.system.conversations.escalate, {
          threadId: args.conversation.threadId,
        })
        return { handled: true, assistantMessagesSent }
      }

      case "end": {
        const endMessage = renderTemplate(stripHtml(asString(data.description)), variables)

        if (
          await saveAssistantMessage(
            ctx,
            args.conversation.threadId,
            endMessage || "Conversation ended."
          )
        ) {
          assistantMessagesSent += 1
        }

        await flushPatch(
          {
            status: "ended",
            currentNodeId: node.id,
            ...clearWaitState(),
            variables,
            endedAt: Date.now(),
          },
          {
            level: "done",
            nodeId: node.id,
            nodeType: type,
            title: "Conversation ended",
            detail: endMessage || undefined,
          }
        )
        await markConversationResolvedByWorkflow(ctx, args.conversation)
        return { handled: true, assistantMessagesSent }
      }

      case "carousel": {
        const text = formatCarouselMessage(data, variables)
        const buttons = getCarouselButtons(data)

        if (await saveAssistantMessage(ctx, args.conversation.threadId, text)) {
          assistantMessagesSent += 1
        }

        record({
          level: "info",
          nodeId: node.id,
          nodeType: type,
          title: "Showed carousel",
          detail: `${(Array.isArray(data.cards) ? data.cards : []).length} card(s)`,
        })

        if (buttons.length === 0) {
          advance()
          break
        }

        await flushPatch(
          {
            status: "waiting",
            currentNodeId: node.id,
            pendingNodeId: node.id,
            pendingButtons: buttons,
            waitingMode: "buttons",
            pendingCaptureKey: undefined,
            pendingPrompt: undefined,
            pendingAiNodeId: null,
            variables,
          },
          {
            level: "wait",
            nodeId: node.id,
            nodeType: type,
            title: "Waiting for carousel button",
            detail: buttons
              .map((button: { label: string }) => button.label)
              .join(" · "),
          }
        )

        return { handled: true, assistantMessagesSent }
      }

      case "customAction": {
        const actionName =
          renderTemplate(asString(data.actionName), variables).trim() ||
          "custom_action"
        const rawPayload = renderTemplate(asString(data.payload), variables)

        let payload: unknown = rawPayload

        if (rawPayload.trim()) {
          try {
            payload = JSON.parse(rawPayload)
          } catch {
            // Not JSON — forward the interpolated string as-is.
          }
        } else {
          payload = {}
        }

        await ctx.runMutation(
          (internal as any).system.integrationWebhooks.dispatchEvent,
          {
            organizationId: args.conversation.organizationId,
            eventType: "workflow.action",
            payload: {
              action: actionName,
              data: payload,
              conversationId: args.conversation._id,
              threadId: args.conversation.threadId,
              nodeId: node.id,
            },
          }
        )

        record({
          level: "info",
          nodeId: node.id,
          nodeType: type,
          title: `Dispatched ${actionName}`,
          detail: rawPayload.slice(0, 160) || undefined,
        })

        advance()
        break
      }

      case "component": {
        const targetId = asString(data.workflowId).trim()
        const componentFailure = (detail: string) => {
          record({
            level: "error",
            nodeId: node.id,
            nodeType: type,
            title: "Component skipped",
            detail,
          })
        }

        if (!targetId) {
          componentFailure("No workflow is selected for this component.")
          advance()
          break
        }

        if (callStack.length >= MAX_COMPONENT_DEPTH) {
          componentFailure(
            `Component nesting is capped at ${MAX_COMPONENT_DEPTH} levels.`
          )
          advance()
          break
        }

        const wouldRecurse =
          targetId === activeWorkflowId ||
          callStack.some((frame) => frame.workflowId === targetId)

        if (wouldRecurse) {
          componentFailure("That component is already running (recursion).")
          advance()
          break
        }

        const childWorkflow = await ctx.db.get(
          targetId as Id<"workflows">
        )

        if (
          !childWorkflow ||
          childWorkflow.organizationId !== args.conversation.organizationId
        ) {
          componentFailure("That component workflow no longer exists.")
          advance()
          break
        }

        const childDefinition = getPublishedDefinition(childWorkflow)

        if (!childDefinition) {
          componentFailure(
            `"${childWorkflow.name}" has never been published, so it has no runnable version.`
          )
          advance()
          break
        }

        const childStartId = getStartNodeId(childDefinition)

        if (!childStartId) {
          componentFailure(`"${childWorkflow.name}" has no Start block.`)
          advance()
          break
        }

        // Inputs are plain variable assignments: the child shares the parent's
        // variable scope, which keeps {{templates}} working across the call.
        const inputs = Array.isArray(data.inputs) ? data.inputs : []

        for (const input of inputs) {
          if (!isRecord(input)) {
            continue
          }

          const name = asString(input.name).trim()

          if (name) {
            variables[name] = renderTemplate(asString(input.value), variables)
          }
        }

        callStack = [
          ...callStack,
          {
            workflowId: activeWorkflowId,
            returnNodeId: node.id,
            returnStepIndex: currentStepIndex,
          },
        ]
        activeWorkflowId = childWorkflow._id
        currentDefinition = childDefinition
        nodeMap = getNodeMap(currentDefinition)
        edgesBySource = getEdgesBySource(currentDefinition)

        record({
          level: "info",
          nodeId: node.id,
          nodeType: type,
          title: `Entering component ${childWorkflow.name}`,
        })

        currentNodeId = childStartId
        break
      }

      case "tool": {
        await flushPatch(
          {
            status: "active",
            currentNodeId: node.id,
            ...clearWaitState(),
            pendingApiNodeId: node.id,
            pendingActionKind: "tool",
            variables,
          },
          {
            level: "step",
            nodeId: node.id,
            nodeType: type,
            title: "Running tool",
            detail: asString(data.toolName) || undefined,
          }
        )

        await ctx.scheduler.runAfter(
          0,
          internal.system.workflowToolSteps.runNode,
          {
            sessionId: args.session._id,
            conversationId: args.conversation._id,
            nodeId: node.id,
          }
        )

        return { handled: true, assistantMessagesSent, awaitingAi: true }
      }

      case "function":
      case "javascript": {
        await flushPatch(
          {
            status: "active",
            currentNodeId: node.id,
            ...clearWaitState(),
            pendingApiNodeId: node.id,
            pendingActionKind: type === "function" ? "function" : "javascript",
            variables,
          },
          {
            level: "step",
            nodeId: node.id,
            nodeType: type,
            title: type === "function" ? "Running function" : "Running JavaScript",
          }
        )

        await ctx.scheduler.runAfter(
          0,
          internal.system.workflowJsSteps.runNode,
          {
            sessionId: args.session._id,
            conversationId: args.conversation._id,
            nodeId: node.id,
          }
        )

        return { handled: true, assistantMessagesSent, awaitingAi: true }
      }

      case "api": {
        await flushPatch(
          {
            status: "active",
            currentNodeId: node.id,
            ...clearWaitState(),
            pendingApiNodeId: node.id,
            pendingActionKind: "api",
            variables,
          },
          {
            level: "step",
            nodeId: node.id,
            nodeType: type,
            title: "Calling API",
            detail: asString(data.url) || undefined,
          }
        )

        await ctx.scheduler.runAfter(
          0,
          internal.system.workflowApiSteps.runNode,
          {
            sessionId: args.session._id,
            conversationId: args.conversation._id,
            nodeId: node.id,
          }
        )

        return { handled: true, assistantMessagesSent, awaitingAi: true }
      }

      default: {
        if (isAiNodeType(type)) {
          const talksFirst = asBoolean(data.talksFirst, true)

          if (
            (type === "playbook" ||
              type === "agent" ||
              type === "crew" ||
              type === "operator") &&
            !talksFirst &&
            !variables.__aiTurnReady
          ) {
            await flushPatch(
              {
                status: "waiting",
                currentNodeId: node.id,
                pendingNodeId: node.id,
                pendingButtons: [],
                waitingMode: "ai_turn",
                pendingCaptureKey: "lastInput",
                pendingPrompt: undefined,
                pendingAiNodeId: null,
                variables,
              },
              {
                level: "wait",
                nodeId: node.id,
                nodeType: type,
                title: "Waiting for user before AI turn",
              }
            )
            return { handled: true, assistantMessagesSent }
          }

          const { __aiTurnReady: _ready, ...cleanVariables } = variables
          variables = cleanVariables

          await flushPatch(
            {
              status: "active",
              currentNodeId: node.id,
              ...clearWaitState(),
              pendingAiNodeId: node.id,
              variables,
            },
            {
              level: "ai",
              nodeId: node.id,
              nodeType: type,
              title: `Scheduling ${type}`,
            }
          )

          await ctx.scheduler.runAfter(
            0,
            internal.system.workflowAiSteps.runNode,
            {
              sessionId: args.session._id,
              conversationId: args.conversation._id,
              nodeId: node.id,
            }
          )

          return {
            handled: true,
            assistantMessagesSent,
            awaitingAi: true,
          }
        }

        await saveAssistantMessage(
          ctx,
          args.conversation.threadId,
          `This workflow reached an unsupported step (${type || "unknown"}). A human operator will continue from here.`
        )
        await flushPatch(
          {
            status: "ended",
            currentNodeId: node.id,
            ...clearWaitState(),
            variables,
            endedAt: Date.now(),
          },
          {
            level: "error",
            nodeId: node.id,
            nodeType: type,
            title: "Unsupported step",
            detail: type,
          }
        )
        await ctx.runMutation(internal.system.conversations.escalate, {
          threadId: args.conversation.threadId,
        })
        return {
          handled: true,
          assistantMessagesSent: assistantMessagesSent + 1,
        }
      }
    }
  }

  await flushPatch(
    {
      status: "ended",
      currentNodeId: null,
      ...clearWaitState(),
      variables,
      endedAt: Date.now(),
    },
    {
      level: "done",
      title: "Run finished",
      detail: "No more connected steps.",
    }
  )

  return { handled: true, assistantMessagesSent }
}

export const startForConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.object({
    started: v.boolean(),
    sessionId: v.optional(v.id("workflowSessions")),
    assistantMessagesSent: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    const workflow = await getActiveWorkflow(ctx, conversation.organizationId)
    const definition = workflow ? getPublishedDefinition(workflow) : null

    if (!workflow || !definition) {
      return { started: false }
    }

    const existingSession = await ctx.db
      .query("workflowSessions")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .unique()

    if (existingSession) {
      return { started: true, sessionId: existingSession._id }
    }

    const now = Date.now()
    const sessionId = await ctx.db.insert("workflowSessions", {
      organizationId: conversation.organizationId,
      workflowId: workflow._id,
      conversationId: conversation._id,
      contactSessionId: conversation.contactSessionId,
      status: "active",
      currentNodeId: null,
      pendingNodeId: null,
      pendingButtons: [],
      waitingMode: undefined,
      pendingCaptureKey: undefined,
      pendingPrompt: undefined,
      pendingAiNodeId: null,
      variables: {},
      startedAt: now,
      updatedAt: now,
    })
    const session = (await ctx.db.get(sessionId))!
    const result = await executeFromNode(ctx, {
      conversation,
      session,
      definition,
      startNodeId: getStartNodeId(definition),
      variables: {},
    })

    return {
      started: true,
      sessionId,
      assistantMessagesSent: result.assistantMessagesSent,
    }
  },
})

export const continueAfterAi = internalMutation({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
    assistantText: v.string(),
    outputVariable: v.optional(v.string()),
    /** When assistantText is empty, still store this into the output variable. */
    outputValue: v.optional(v.string()),
  },
  returns: v.object({
    handled: v.boolean(),
    assistantMessagesSent: v.number(),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)
    const session = await ctx.db.get(args.sessionId)

    if (!conversation || !session || session.status === "ended") {
      return { handled: false, assistantMessagesSent: 0 }
    }

    if (session.pendingAiNodeId && session.pendingAiNodeId !== args.nodeId) {
      return { handled: false, assistantMessagesSent: 0 }
    }

    const workflow = await ctx.db.get(session.workflowId)
    const definition = await getActiveDefinition(ctx, session)

    if (!workflow || !definition) {
      return { handled: false, assistantMessagesSent: 0 }
    }

    let assistantMessagesSent = 0
    const text = args.assistantText.trim()
    const storedValue = (args.outputValue ?? args.assistantText).trim()

    if (text) {
      if (await saveAssistantMessage(ctx, conversation.threadId, text)) {
        assistantMessagesSent += 1
      }
    }

    const variables = {
      ...((isRecord(session.variables)
        ? session.variables
        : {}) as RuntimeVariables),
    }

    if (args.outputVariable?.trim() && storedValue) {
      variables[args.outputVariable.trim()] = storedValue
    }

    if (storedValue) {
      variables.lastAiResponse = storedValue
    }

    const aiNode = getNodeMap(definition).get(args.nodeId)
    const aiInBlock = isBlockNodeType(asString(aiNode?.type))
    // An AI step never branches, so inside a block the run continues with the
    // next step rather than leaving through an edge.
    const nextNodeId = aiInBlock
      ? args.nodeId
      : getNextNodeId(getEdgesBySource(definition), args.nodeId)
    const nextStepIndex = aiInBlock ? (session.pendingStepIndex ?? 0) + 1 : 0

    await patchSession(
      ctx,
      session._id,
      {
        status: "active",
        ...clearWaitState(),
        variables,
      },
      {
        level: "ai",
        nodeId: args.nodeId,
        title: "AI step completed",
        detail: storedValue.slice(0, 160) || "(no text)",
      }
    )

    const updatedSession = (await ctx.db.get(session._id))!
    const result = await executeFromNode(ctx, {
      conversation,
      session: updatedSession,
      definition,
      startNodeId: nextNodeId,
      startStepIndex: nextStepIndex,
      variables,
    })

    if (assistantMessagesSent + result.assistantMessagesSent > 0) {
      await ctx.runMutation(
        internal.system.conversations.touchAssistantMessage,
        {
          conversationId: conversation._id,
          timestamp: Date.now(),
        }
      )
    }

    return {
      handled: true,
      assistantMessagesSent:
        assistantMessagesSent + result.assistantMessagesSent,
    }
  },
})

export const handleUserMessage = internalMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    contactSessionId: v.id("contactSessions"),
    workflowButtonId: v.optional(v.string()),
  },
  returns: v.object({
    handled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique()

    if (!conversation) {
      return { handled: false }
    }

    const session = await ctx.db
      .query("workflowSessions")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .unique()

    if (!session || session.status === "ended") {
      return { handled: false }
    }

    // An out-of-band step is still running — ignore concurrent user messages.
    if (session.pendingAiNodeId || session.pendingApiNodeId) {
      return { handled: true }
    }

    const workflow = await ctx.db.get(session.workflowId)
    const definition = await getActiveDefinition(ctx, session)

    if (!workflow || !definition) {
      return { handled: false }
    }

    const now = Date.now()
    const prompt = args.prompt.trim()
    const waitingMode = session.waitingMode
    const pendingButtons = session.pendingButtons ?? []

    await saveUserMessage(ctx, conversation.threadId, prompt)

    if (session.status !== "waiting" || !session.pendingNodeId) {
      await saveAssistantMessage(
        ctx,
        conversation.threadId,
        "This workflow is not waiting for input yet. A human operator will review the conversation."
      )
      await patchSession(ctx, session._id, {
        status: "ended",
        ...clearWaitState(),
        endedAt: now,
      })
      await ctx.runMutation(internal.system.conversations.escalate, {
        threadId: conversation.threadId,
      })
      await ctx.runMutation(
        internal.system.conversations.touchCustomerMessage,
        {
          conversationId: conversation._id,
          timestamp: now,
        }
      )
      await ctx.runMutation(
        internal.system.conversations.touchAssistantMessage,
        {
          conversationId: conversation._id,
          timestamp: now,
        }
      )
      return { handled: true }
    }

    const baseVariables: RuntimeVariables = {
      ...((isRecord(session.variables)
        ? session.variables
        : {}) as RuntimeVariables),
      lastUserMessage: prompt,
      lastInput: prompt,
    }

    let variables: RuntimeVariables = baseVariables
    let nextNodeId: string | null = null
    let nextStepIndex = 0
    const edgesBySource = getEdgesBySource(definition)
    const pendingNode = getNodeMap(definition).get(session.pendingNodeId)
    const pendingNodeData = isRecord(pendingNode?.data) ? pendingNode!.data! : {}
    // Inside a block the waiting step is the one that owns the pending state.
    const pendingBlockStep = isBlockNodeType(asString(pendingNode?.type))
      ? getBlockSteps(pendingNodeData)[session.pendingStepIndex ?? 0]
      : undefined
    const pendingData = pendingBlockStep?.data ?? pendingNodeData

    const pendingInBlock = isBlockNodeType(asString(pendingNode?.type))

    if (waitingMode === "capture" || waitingMode === "ai_turn") {
      const key =
        session.pendingCaptureKey?.trim() ||
        getCaptureVariableKey(pendingData)
      variables = {
        ...baseVariables,
        [key]: prompt,
        ...(waitingMode === "ai_turn" ? { __aiTurnReady: "1" } : {}),
      }

      if (waitingMode === "ai_turn") {
        // Re-enter the same AI step now that the user has spoken.
        nextNodeId = session.pendingNodeId
        nextStepIndex = session.pendingStepIndex ?? 0
      } else if (pendingInBlock) {
        // Capture is not terminal: carry on with the next step of the block.
        nextNodeId = session.pendingNodeId
        nextStepIndex = (session.pendingStepIndex ?? 0) + 1
      } else {
        nextNodeId = getNextNodeId(edgesBySource, session.pendingNodeId)
      }
    } else if (waitingMode === "choice") {
      const choices = normalizeButtons(
        pendingData.choices ?? pendingButtons
      )
      const selected = matchChoice(choices, prompt, args.workflowButtonId)

      if (!selected) {
        await saveAssistantMessage(
          ctx,
          conversation.threadId,
          `Please choose one of: ${choices.map((c) => c.label).join(", ")}.`
        )
        await ctx.runMutation(
          internal.system.conversations.touchCustomerMessage,
          {
            conversationId: conversation._id,
            timestamp: now,
          }
        )
        await ctx.runMutation(
          internal.system.conversations.touchAssistantMessage,
          {
            conversationId: conversation._id,
            timestamp: now,
          }
        )
        return { handled: true }
      }

      const key =
        session.pendingCaptureKey?.trim() ||
        getCaptureVariableKey(pendingData)
      variables = {
        ...baseVariables,
        [key]: selected.label,
        lastButtonId: selected.id,
        lastButtonLabel: selected.label,
        lastInput: selected.label,
      }
      nextNodeId = getNextNodeId(
        edgesBySource,
        session.pendingNodeId,
        selected.id
      )
    } else {
      // buttons (default)
      const selectedButton =
        pendingButtons.find((button) => button.id === args.workflowButtonId) ??
        pendingButtons.find(
          (button) =>
            button.label.trim().toLowerCase() === prompt.toLowerCase()
        )

      if (!selectedButton) {
        await saveAssistantMessage(
          ctx,
          conversation.threadId,
          `Please choose one of: ${pendingButtons.map((button) => button.label).join(", ")}.`
        )
        await ctx.runMutation(
          internal.system.conversations.touchCustomerMessage,
          {
            conversationId: conversation._id,
            timestamp: now,
          }
        )
        await ctx.runMutation(
          internal.system.conversations.touchAssistantMessage,
          {
            conversationId: conversation._id,
            timestamp: now,
          }
        )
        return { handled: true }
      }

      variables = {
        ...baseVariables,
        lastButtonId: selectedButton.id,
        lastButtonLabel: selectedButton.label,
        lastInput: selectedButton.label,
      }
      nextNodeId = getNextNodeId(
        edgesBySource,
        session.pendingNodeId,
        selectedButton.id
      )
    }

    await patchSession(ctx, session._id, {
      status: "active",
      ...clearWaitState(),
      variables,
    })

    const updatedSession = (await ctx.db.get(session._id))!
    const result = await executeFromNode(ctx, {
      conversation,
      session: updatedSession,
      definition,
      startNodeId: nextNodeId,
      startStepIndex: nextStepIndex,
      variables,
    })

    await ctx.runMutation(internal.system.conversations.touchCustomerMessage, {
      conversationId: conversation._id,
      timestamp: now,
    })

    if (result.assistantMessagesSent > 0) {
      await ctx.runMutation(
        internal.system.conversations.touchAssistantMessage,
        {
          conversationId: conversation._id,
          timestamp: now,
        }
      )
    }

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.intelligence.analyzeChatConversation,
      {
        conversationId: conversation._id,
      }
    )

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: conversation.organizationId,
        eventType: "message.received",
        payload: {
          conversationId: conversation._id,
          threadId: args.threadId,
          contactSessionId: args.contactSessionId,
          prompt,
          source: "workflow",
          workflowId: workflow._id,
        },
      }
    )

    return { handled: true }
  },
})

export const continueAfterAction = internalMutation({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
    kind: v.union(
      v.literal("api"),
      v.literal("javascript"),
      v.literal("tool"),
      v.literal("function")
    ),
    ok: v.boolean(),
    status: v.number(),
    resultVariables: v.any(),
    /** Explicit port to leave by; falls back to success/fail when absent. */
    handle: v.optional(v.string()),
    /** Human-readable name of that port, for the trace. */
    handleLabel: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.object({
    handled: v.boolean(),
    assistantMessagesSent: v.number(),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)
    const session = await ctx.db.get(args.sessionId)

    if (!conversation || !session || session.status === "ended") {
      return { handled: false, assistantMessagesSent: 0 }
    }

    if (session.pendingApiNodeId && session.pendingApiNodeId !== args.nodeId) {
      return { handled: false, assistantMessagesSent: 0 }
    }

    const workflow = await ctx.db.get(session.workflowId)
    const definition = await getActiveDefinition(ctx, session)

    if (!workflow || !definition) {
      return { handled: false, assistantMessagesSent: 0 }
    }

    const variables: RuntimeVariables = {
      ...((isRecord(session.variables)
        ? session.variables
        : {}) as RuntimeVariables),
      ...((isRecord(args.resultVariables)
        ? args.resultVariables
        : {}) as RuntimeVariables),
    }

    const handle = args.handle ?? (args.ok ? "success" : "fail")
    const nextNodeId = getNextNodeId(
      getEdgesBySource(definition),
      args.nodeId,
      handle
    )

    await patchSession(
      ctx,
      session._id,
      {
        status: "active",
        ...clearWaitState(),
        variables,
      },
      {
        level: args.ok ? "branch" : "warn",
        nodeId: args.nodeId,
        title:
          args.kind === "api"
            ? `API ${handle} (${args.status})`
            : args.kind === "function"
              ? `Function → ${args.handleLabel ?? handle}`
              : `${args.kind} ${handle}`,
        detail: args.error,
      }
    )

    const updatedSession = (await ctx.db.get(session._id))!
    const result = await executeFromNode(ctx, {
      conversation,
      session: updatedSession,
      definition,
      startNodeId: nextNodeId,
      variables,
    })

    if (result.assistantMessagesSent > 0) {
      await ctx.runMutation(
        internal.system.conversations.touchAssistantMessage,
        {
          conversationId: conversation._id,
          timestamp: Date.now(),
        }
      )
    }

    return {
      handled: true,
      assistantMessagesSent: result.assistantMessagesSent,
    }
  },
})
