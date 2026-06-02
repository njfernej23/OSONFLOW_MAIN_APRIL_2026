import { saveMessage } from "@convex-dev/agent"
import { ConvexError, v } from "convex/values"
import { components, internal } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import { internalMutation } from "../_generated/server"

type JsonRecord = Record<string, unknown>

type WorkflowButton = {
  id: string
  label: string
}

type WorkflowNode = {
  id: string
  type?: string
  data?: JsonRecord
}

type WorkflowEdge = {
  id?: string
  source?: string
  target?: string
  sourceHandle?: string | null
}

type WorkflowDefinition = {
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
}

type RuntimeVariables = Record<string, string>

const MAX_STEPS_PER_TURN = 50

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const asString = (value: unknown) => (typeof value === "string" ? value : "")

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const renderTemplate = (value: string, variables: RuntimeVariables) =>
  value.replace(/{{\s*([\w.-]+)\s*}}/g, (_match, key: string) => {
    return variables[key] ?? ""
  })

const normalizeButtons = (value: unknown): WorkflowButton[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((button) => {
      if (!isRecord(button)) {
        return null
      }

      const id = asString(button.id).trim()
      const label = asString(button.label).trim()

      if (!id || !label) {
        return null
      }

      return { id, label }
    })
    .filter((button): button is WorkflowButton => button !== null)
}

const getNodeMap = (definition: WorkflowDefinition) =>
  new Map((definition.nodes ?? []).map((node) => [node.id, node]))

const getEdgesBySource = (definition: WorkflowDefinition) => {
  const map = new Map<string, WorkflowEdge[]>()

  for (const edge of definition.edges ?? []) {
    if (!edge.source || !edge.target) {
      continue
    }

    const edges = map.get(edge.source) ?? []
    edges.push(edge)
    map.set(edge.source, edges)
  }

  return map
}

const getNextNodeId = (
  edgesBySource: Map<string, WorkflowEdge[]>,
  sourceId: string,
  handleId?: string | null
) => {
  const outgoing = edgesBySource.get(sourceId) ?? []

  if (handleId) {
    return (
      outgoing.find((edge) => edge.sourceHandle === handleId)?.target ?? null
    )
  }

  return (
    outgoing.find((edge) => !edge.sourceHandle)?.target ??
    outgoing[0]?.target ??
    null
  )
}

const getStartNodeId = (definition: WorkflowDefinition) => {
  const nodes = definition.nodes ?? []
  return nodes.find((node) => node.type === "start")?.id ?? nodes[0]?.id ?? null
}

const evaluateCondition = (data: JsonRecord, variables: RuntimeVariables) => {
  const key = asString(data.key).trim()
  const operator = asString(data.operator)
  const expected = asString(data.value)
  const actual = variables[key] ?? ""

  return operator === "not_equals" ? actual !== expected : actual === expected
}

const getPublishedDefinition = (
  workflow: Doc<"workflows">
): WorkflowDefinition | null => {
  if (!workflow.publishedDefinition) {
    return null
  }

  return workflow.publishedDefinition as WorkflowDefinition
}

const getActiveWorkflow = async (ctx: any, organizationId: string) => {
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

const patchSession = async (
  ctx: any,
  sessionId: Id<"workflowSessions">,
  patch: Partial<Doc<"workflowSessions">>
) => {
  await ctx.db.patch(sessionId, {
    ...patch,
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

const executeFromNode = async (
  ctx: any,
  args: {
    conversation: Doc<"conversations">
    session: Doc<"workflowSessions">
    definition: WorkflowDefinition
    startNodeId: string | null
    variables: RuntimeVariables
  }
) => {
  const nodeMap = getNodeMap(args.definition)
  const edgesBySource = getEdgesBySource(args.definition)
  let currentNodeId = args.startNodeId
  let variables = { ...args.variables }
  let steps = 0
  let assistantMessagesSent = 0

  while (currentNodeId) {
    steps += 1

    if (steps > MAX_STEPS_PER_TURN) {
      await saveAssistantMessage(
        ctx,
        args.conversation.threadId,
        "This workflow stopped because it looped too many times. A human operator will review the conversation."
      )
      await patchSession(ctx, args.session._id, {
        status: "ended",
        currentNodeId,
        pendingNodeId: null,
        pendingButtons: [],
        variables,
        endedAt: Date.now(),
      })
      return { handled: true, assistantMessagesSent: assistantMessagesSent + 1 }
    }

    const node = nodeMap.get(currentNodeId)

    if (!node) {
      await patchSession(ctx, args.session._id, {
        status: "ended",
        currentNodeId,
        pendingNodeId: null,
        pendingButtons: [],
        variables,
        endedAt: Date.now(),
      })
      return { handled: true, assistantMessagesSent }
    }

    const data = isRecord(node.data) ? node.data : {}

    switch (node.type) {
      case "start": {
        currentNodeId = getNextNodeId(edgesBySource, node.id)
        break
      }

      case "message": {
        const text = stripHtml(renderTemplate(asString(data.text), variables))

        if (await saveAssistantMessage(ctx, args.conversation.threadId, text)) {
          assistantMessagesSent += 1
        }

        currentNodeId = getNextNodeId(edgesBySource, node.id)
        break
      }

      case "setVariable": {
        const key = asString(data.key).trim()

        if (key) {
          variables[key] = renderTemplate(asString(data.value), variables)
        }

        currentNodeId = getNextNodeId(edgesBySource, node.id)
        break
      }

      case "condition": {
        currentNodeId = getNextNodeId(
          edgesBySource,
          node.id,
          evaluateCondition(data, variables) ? "true" : "false"
        )
        break
      }

      case "buttons": {
        const buttons = normalizeButtons(data.buttons)

        if (buttons.length === 0) {
          currentNodeId = getNextNodeId(edgesBySource, node.id)
          break
        }

        await patchSession(ctx, args.session._id, {
          status: "waiting",
          currentNodeId: node.id,
          pendingNodeId: node.id,
          pendingButtons: buttons,
          variables,
        })

        return { handled: true, assistantMessagesSent }
      }

      case "end": {
        const endMessage = stripHtml(
          renderTemplate(asString(data.description), variables)
        )

        if (
          await saveAssistantMessage(
            ctx,
            args.conversation.threadId,
            endMessage || "Conversation ended."
          )
        ) {
          assistantMessagesSent += 1
        }

        await patchSession(ctx, args.session._id, {
          status: "ended",
          currentNodeId: node.id,
          pendingNodeId: null,
          pendingButtons: [],
          variables,
          endedAt: Date.now(),
        })
        await markConversationResolvedByWorkflow(ctx, args.conversation)
        return { handled: true, assistantMessagesSent }
      }

      default: {
        await saveAssistantMessage(
          ctx,
          args.conversation.threadId,
          "This workflow reached a step that is not available in the MVP runtime yet. A human operator will continue from here."
        )
        await patchSession(ctx, args.session._id, {
          status: "ended",
          currentNodeId: node.id,
          pendingNodeId: null,
          pendingButtons: [],
          variables,
          endedAt: Date.now(),
        })
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

  await patchSession(ctx, args.session._id, {
    status: "ended",
    currentNodeId: null,
    pendingNodeId: null,
    pendingButtons: [],
    variables,
    endedAt: Date.now(),
  })

  return { handled: true, assistantMessagesSent }
}

export const startForConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
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

export const handleUserMessage = internalMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    contactSessionId: v.id("contactSessions"),
    workflowButtonId: v.optional(v.string()),
  },
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

    const workflow = await ctx.db.get(session.workflowId)
    const definition = workflow ? getPublishedDefinition(workflow) : null

    if (!workflow || !definition) {
      return { handled: false }
    }

    const now = Date.now()
    const prompt = args.prompt.trim()
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
        pendingNodeId: null,
        pendingButtons: [],
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

    const normalizedPrompt = prompt.toLowerCase()
    const selectedButton =
      pendingButtons.find((button) => button.id === args.workflowButtonId) ??
      pendingButtons.find(
        (button) => button.label.trim().toLowerCase() === normalizedPrompt
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

    const variables = {
      ...((isRecord(session.variables)
        ? session.variables
        : {}) as RuntimeVariables),
      lastButtonId: selectedButton.id,
      lastButtonLabel: selectedButton.label,
      lastInput: selectedButton.label,
    }
    const nextNodeId = getNextNodeId(
      getEdgesBySource(definition),
      session.pendingNodeId,
      selectedButton.id
    )

    await patchSession(ctx, session._id, {
      status: "active",
      pendingNodeId: null,
      pendingButtons: [],
      variables,
    })

    const updatedSession = (await ctx.db.get(session._id))!
    const result = await executeFromNode(ctx, {
      conversation,
      session: updatedSession,
      definition,
      startNodeId: nextNodeId,
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
