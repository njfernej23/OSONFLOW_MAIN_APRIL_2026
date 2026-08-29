"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import type { Edge, Node } from "reactflow"
import { useAction, useConvex } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { untokenizeVariables } from "../lib/variable-tokens"
import { isAgentStepType } from "../lib/types"
import type { Id } from "@workspace/backend/_generated/dataModel"
import type {
  ApiNodeData,
  BlockNodeData,
  ButtonOption,
  CarouselNodeData,
  CustomActionNodeData,
  FunctionNodeData,
  JavascriptNodeData,
  ToolNodeData,
  ComponentNodeData,
  ButtonsNodeData,
  CaptureNodeData,
  CardNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  GenericNodeData,
  ImageNodeData,
  KbSearchNodeData,
  MessageNodeData,
  NodeData,
  PromptNodeData,
  RuntimeVariables,
  SetVariableNodeData,
  NodeType,
  WaitingMode,
} from "../lib/types"

/** One face of a Card step, or one entry of a Carousel. */
type ChatCard = {
  id: string
  title: string
  text: string
  alt?: string
  imageUrl?: string
  buttons?: ButtonOption[]
}

type ChatBubble = {
  id: string
  nodeId?: string
  kind: "assistant" | "user" | "image" | "card" | "carousel"
  text: string
  alt?: string
  title?: string
  imageUrl?: string
  buttons?: ButtonOption[]
  /** Carousel entries, scrolled horizontally in one bubble. */
  cards?: ChatCard[]
}

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
  id: string
  at: number
  level: TraceLevel
  step?: number
  nodeId?: string
  nodeType?: string
  title: string
  detail?: string
  varsChanged?: Record<string, string>
}

type RunStatus = "idle" | "running" | "waiting" | "ended"

type RunPanelProps = {
  nodes: Node<NodeData>[]
  edges: Edge[]
  autoStartKey?: number
  onAutoStartComplete?: () => void
  onClose?: () => void
  onActiveNodeChange?: (state: {
    activeNodeId: string | null
    waitingNodeId: string | null
  }) => void
}

type RunnerIconName = "reset" | "close" | "copy" | "play" | "chevron"

type ExecuteState = {
  vars: RuntimeVariables
  bubbles: ChatBubble[]
  trace: TraceEvent[]
  nextButtons: ButtonOption[] | null
  waitingNodeId: string | null
  waitingMode: WaitingMode | null
  activeNodeId: string | null
  /** Set when the walk paused on a step the server has to run out of band. */
  asyncNode: {
    nodeId: string
    kind: "ai" | "api" | "javascript" | "tool" | "component" | "function"
  } | null
  /** Step index inside the paused block; 0 for standalone nodes. */
  pausedStepIndex: number
  ended: boolean
  stepCount: number
}

/**
 * The run surface is two docked panels: the conversation on the right, and
 * everything you inspect about the run — log, variables, issues — in a dock
 * pinned across the bottom of the canvas.
 */
type DockTab = "trace" | "vars" | "issues"

const DOCK_MIN_H = 150
const DOCK_MAX_H = 560
const DOCK_DEFAULT_H = 264
const DOCK_COLLAPSED_H = 44

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`

/**
 * Variable pills wrap {{name}} in markup, so unwrap before substituting.
 * That also keeps chat bubbles free of the editor's pill styling.
 */
const renderTemplate = (value: string, variables: RuntimeVariables) =>
  untokenizeVariables(value).replace(
    /{{\s*([\w.-]+)\s*}}/g,
    (_match, key: string) => variables[key] ?? ""
  )

const stripHtmlPreview = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim()

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

const nodeTypeLabel = (type?: string) => {
  if (!type) return "step"
  const labels: Record<string, string> = {
    start: "Start",
    message: "Message",
    image: "Image",
    card: "Card",
    buttons: "Buttons",
    choice: "Choice",
    capture: "Capture",
    setVariable: "Set",
    condition: "Condition",
    prompt: "Prompt",
    kbSearch: "KB search",
    playbook: "Playbook",
    agent: "Agent",
    crew: "Crew",
    operator: "Operator",
    callForward: "Handoff",
    end: "End",
    component: "Component",
    carousel: "Carousel",
    tool: "Tool",
    api: "API",
    javascript: "JavaScript",
    function: "Function",
    customAction: "Action",
  }
  return labels[type] ?? type
}

const RunnerIcon = ({ name }: { name: RunnerIconName }) => {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "reset") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    )
  }

  if (name === "copy") {
    return (
      <svg {...common}>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
    )
  }

  if (name === "chevron") {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    )
  }

  if (name === "play") {
    return (
      <svg {...common}>
        <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

const evaluateCondition = (
  data: ConditionNodeData,
  variables: RuntimeVariables
) => {
  const left = variables[data.key] ?? ""
  const expected = data.value ?? ""
  const hasValue = Boolean(left.trim())

  switch (data.operator) {
    case "not_equals":
      return left !== expected
    case "contains":
      return left.toLowerCase().includes(expected.toLowerCase())
    case "not_contains":
      return !left.toLowerCase().includes(expected.toLowerCase())
    case "exists":
      return hasValue
    case "not_exists":
      return !hasValue
    case "equals":
    default:
      return left === expected
  }
}

const diffVars = (
  before: RuntimeVariables,
  after: RuntimeVariables
): Record<string, string> | undefined => {
  const changed: Record<string, string> = {}
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changed[key] = after[key] ?? ""
    }
  }
  return Object.keys(changed).length ? changed : undefined
}

const RunPanel = ({
  nodes,
  edges,
  autoStartKey,
  onAutoStartComplete,
  onClose,
  onActiveNodeChange,
}: RunPanelProps) => {
  const [dockTab, setDockTab] = useState<DockTab>("trace")
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [dockHeight, setDockHeight] = useState(DOCK_DEFAULT_H)
  const [status, setStatus] = useState<RunStatus>("idle")
  const [bubbles, setBubbles] = useState<ChatBubble[]>([])
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [variables, setVariables] = useState<RuntimeVariables>({})
  const [pendingButtons, setPendingButtons] = useState<ButtonOption[] | null>(
    null
  )
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null)
  const [pendingStepIndex, setPendingStepIndex] = useState(0)
  const [waitingMode, setWaitingMode] = useState<WaitingMode | null>(null)
  const [draftInput, setDraftInput] = useState("")
  const [copied, setCopied] = useState(false)
  // Set while an AI step is generating server-side; keyed so a flow that loops
  // back onto the same AI block still re-triggers the effect.
  const [asyncRun, setAsyncRun] = useState<{
    nodeId: string
    kind: "ai" | "api" | "javascript" | "tool" | "component" | "function"
    key: number
    stepIndex: number
  } | null>(null)
  const asyncRunKeyRef = useRef(0)
  const previewAiStep = useAction(api.private.workflows.previewAiStep)
  const previewAgentTurn = useAction(api.private.workflows.previewAgentTurn)
  const previewApiStep = useAction(api.private.workflows.previewApiStep)
  const previewJsStep = useAction(api.private.workflows.previewJsStep)
  const previewToolStep = useAction(api.private.workflows.previewToolStep)
  // Component graphs are fetched on demand, so the query has to be imperative.
  const convex = useConvex()
  // Freeze the graph for the lifetime of a run so collaborator/canvas edits
  // cannot restart or rewire mid-conversation.
  const runGraphRef = useRef<{
    nodes: Node<NodeData>[]
    edges: Edge[]
  } | null>(null)
  /** Caller graphs to return to, innermost last. */
  const componentStackRef = useRef<
    Array<{
      graph: { nodes: Node<NodeData>[]; edges: Edge[] }
      returnNodeId: string
      returnStepIndex: number
      workflowId: string
    }>
  >([])
  const [, setGraphEpoch] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const traceRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const startRunRef = useRef<() => void>(() => {})
  const onAutoStartCompleteRef = useRef(onAutoStartComplete)
  const lastAutoStartKeyRef = useRef<number | undefined>(undefined)

  onAutoStartCompleteRef.current = onAutoStartComplete

  const freezeGraph = useCallback(
    (nextNodes: Node<NodeData>[], nextEdges: Edge[]) => {
      runGraphRef.current = {
        nodes: nextNodes.map((node) => ({
          ...node,
          data: { ...node.data },
        })),
        edges: nextEdges.map((edge) => ({ ...edge })),
      }
      componentStackRef.current = []
      setGraphEpoch((value) => value + 1)
    },
    []
  )

  const clearFrozenGraph = useCallback(() => {
    runGraphRef.current = null
    componentStackRef.current = []
    setGraphEpoch((value) => value + 1)
  }, [])

  const activeNodes = runGraphRef.current?.nodes ?? nodes

  const nodeMap = useMemo(
    () => new Map(activeNodes.map((node) => [node.id, node])),
    [activeNodes]
  )

  const getNextNodeId = useCallback(
    (sourceId: string, handleId?: string | null) => {
      const graph = runGraphRef.current
      const edgeList = graph?.edges ?? edges
      const outgoing = edgeList.filter((edge) => edge.source === sourceId)

      if (handleId) {
        // Mirrors the published runtime: a branch handle only follows its own
        // edge, never another handle's.
        return (
          outgoing.find((edge) => edge.sourceHandle === handleId)?.target ??
          null
        )
      }

      return (
        outgoing.find(
          (edge) => edge.sourceHandle == null || edge.sourceHandle === ""
        )?.target ??
        outgoing[0]?.target ??
        null
      )
    },
    [edges]
  )

  const pushTrace = (
    list: TraceEvent[],
    event: Omit<TraceEvent, "id" | "at">
  ) => {
    list.push({
      id: createId("tr"),
      at: Date.now(),
      ...event,
    })
  }

  const executeFrom = useCallback(
    (
      startId: string | null,
      startVars: RuntimeVariables,
      startBubbles: ChatBubble[],
      startTrace: TraceEvent[],
      startStep = 0,
      startStepIndex = 0
    ): ExecuteState => {
      let activeGraph = runGraphRef.current ?? { nodes, edges }
      let graphNodeMap = new Map(
        activeGraph.nodes.map((node) => [node.id, node])
      )
      let componentStack = [...componentStackRef.current]

      /** Edge lookup against the graph that is executing right now. */
      const nextFrom = (sourceId: string, handleId?: string | null) => {
        const outgoing = activeGraph.edges.filter(
          (edge) => edge.source === sourceId
        )

        if (handleId) {
          return (
            outgoing.find((edge) => edge.sourceHandle === handleId)?.target ??
            null
          )
        }

        return (
          outgoing.find(
            (edge) => edge.sourceHandle == null || edge.sourceHandle === ""
          )?.target ??
          outgoing[0]?.target ??
          null
        )
      }

      let currentId = startId
      let currentStepIndex = startStepIndex
      let vars = { ...startVars }
      const nextBubbles = [...startBubbles]
      const nextTrace = [...startTrace]
      let nextButtons: ButtonOption[] | null = null
      let waitingNodeId: string | null = null
      let nextWaitingMode: WaitingMode | null = null
      let asyncNode: ExecuteState["asyncNode"] = null
      let activeNodeId: string | null = startId
      let steps = startStep
      let safety = 0

      while (true) {
        if (!currentId) {
          if (componentStack.length === 0) {
            break
          }

          // Child flow ran out of steps: return to the caller's graph.
          const frame = componentStack[componentStack.length - 1]!
          componentStack = componentStack.slice(0, -1)
          activeGraph = frame.graph
          graphNodeMap = new Map(
            activeGraph.nodes.map((node) => [node.id, node])
          )
          pushTrace(nextTrace, {
            level: "info",
            nodeId: frame.returnNodeId,
            title: "Returned from component",
          })

          const returnNode = graphNodeMap.get(frame.returnNodeId)

          if (returnNode?.type === "block") {
            // The Component was a step inside a block: carry on with the block.
            currentId = frame.returnNodeId
            currentStepIndex = frame.returnStepIndex + 1
          } else {
            currentId = nextFrom(frame.returnNodeId)
            currentStepIndex = 0
          }

          continue
        }

        safety += 1
        if (safety > 50) {
          pushTrace(nextTrace, {
            level: "error",
            title: "Loop guard tripped",
            detail: "Stopped after 50 steps to prevent an infinite loop.",
          })
          currentId = null
          break
        }

        const node = graphNodeMap.get(currentId)
        if (!node) {
          pushTrace(nextTrace, {
            level: "error",
            title: "Missing node",
            detail: `Node ${currentId} is not on the canvas.`,
            nodeId: currentId,
          })
          currentId = null
          break
        }

        steps += 1
        activeNodeId = node.id
        const beforeVars = { ...vars }

        // A Block runs its steps in order and is wired as one unit; anything
        // else is a single step in itself.
        const blockSteps =
          node.type === "block"
            ? ((node.data as BlockNodeData).steps ?? [])
            : null

        if (blockSteps && currentStepIndex >= blockSteps.length) {
          currentId = nextFrom(node.id)
          currentStepIndex = 0
          continue
        }

        const blockStep = blockSteps ? blockSteps[currentStepIndex]! : null
        const stepData = blockStep ? blockStep.data : node.data
        const stepType = blockStep ? blockStep.type : node.type

        /** Continue inside the block, or follow the node's outgoing edge. */
        const advance = () => {
          if (blockSteps) {
            currentStepIndex += 1
          } else {
            currentId = nextFrom(node.id)
          }
        }

        /** Leave by a named port. Branching steps are always last in a block. */
        const advanceVia = (handle: string) => {
          currentId = nextFrom(node.id, handle)
          currentStepIndex = 0
        }

        pushTrace(nextTrace, {
          level: "step",
          step: steps,
          nodeId: node.id,
          nodeType: stepType,
          title: `Enter ${nodeTypeLabel(stepType)}`,
          detail: blockSteps
            ? `Block step ${currentStepIndex + 1}`
            : stepData.customName
              ? `Custom name: ${stepData.customName}`
              : undefined,
        })

        switch (stepType) {
          case "start": {
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Workflow started",
            })
            advance()
            break
          }
          case "message": {
            const data = stepData as MessageNodeData
            const text = renderTemplate(data.text || "Message step.", vars)
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text,
              nodeId: node.id,
            })
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Sent message",
              detail: stripHtmlPreview(text).slice(0, 160) || "(empty)",
            })
            advance()
            break
          }
          case "image": {
            const data = stepData as ImageNodeData
            const url = renderTemplate(data.url || "", vars)
            nextBubbles.push({
              id: createId("img"),
              kind: url ? "image" : "assistant",
              text: url || "Image step is missing a URL.",
              alt: data.alt,
              nodeId: node.id,
            })
            pushTrace(nextTrace, {
              level: url ? "info" : "warn",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: url ? "Sent image" : "Image missing URL",
              detail: url || data.alt || undefined,
            })
            advance()
            break
          }
          case "card": {
            const data = stepData as CardNodeData
            nextBubbles.push({
              id: createId("card"),
              nodeId: node.id,
              kind: "card",
              text: renderTemplate(data.description || "", vars),
              title: renderTemplate(data.title || "Card", vars),
              alt: data.alt,
              buttons: data.buttons,
              imageUrl: renderTemplate(data.url || "", vars),
            })
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Showed card",
              detail: data.title || undefined,
            })
            if (data.buttons.length > 0) {
              nextButtons = data.buttons
              waitingNodeId = node.id
              nextWaitingMode = "buttons"
              pushTrace(nextTrace, {
                level: "wait",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Waiting for card button",
                detail: data.buttons.map((b) => b.label).join(" · "),
              })
              currentId = null
            } else {
              advance()
            }
            break
          }
          case "setVariable": {
            const data = stepData as SetVariableNodeData
            const key = data.key || "variable"
            const value = renderTemplate(data.value || "", vars)
            vars = { ...vars, [key]: value }
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: `Set ${key}`,
              detail: value || "(empty)",
              varsChanged: diffVars(beforeVars, vars),
            })
            advance()
            break
          }
          case "condition": {
            const data = stepData as ConditionNodeData
            const result = evaluateCondition(data, vars)
            const handle = result ? "true" : "false"
            pushTrace(nextTrace, {
              level: "branch",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: `Branch → ${handle}`,
              detail: `${data.key || "variable"} ${data.operator} ${
                data.operator === "exists" || data.operator === "not_exists"
                  ? ""
                  : `"${data.value}"`
              }`.trim(),
            })
            advanceVia(handle)
            break
          }
          case "buttons": {
            const data = stepData as ButtonsNodeData
            const buttons = data.buttons ?? []

            if (buttons.length === 0) {
              pushTrace(nextTrace, {
                level: "warn",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Buttons step has no buttons",
                detail: "Passing through to the next step.",
              })
              advance()
              break
            }

            nextButtons = buttons
            waitingNodeId = node.id
            nextWaitingMode = "buttons"
            pushTrace(nextTrace, {
              level: "wait",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Waiting for button",
              detail: buttons.map((b) => b.label).join(" · "),
            })
            currentId = null
            break
          }
          case "choice": {
            const data = stepData as ChoiceNodeData
            if (data.prompt?.trim()) {
              const text = renderTemplate(data.prompt, vars)
              nextBubbles.push({
                id: createId("msg"),
                kind: "assistant",
                text,
                nodeId: node.id,
              })
            }
            const choices = data.choices ?? []

            if (choices.length === 0) {
              pushTrace(nextTrace, {
                level: "warn",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Choice step has no choices",
                detail: "Passing through to the next step.",
              })
              advance()
              break
            }

            nextButtons = choices
            waitingNodeId = node.id
            nextWaitingMode = "choice"
            pushTrace(nextTrace, {
              level: "wait",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Waiting for choice",
              detail: choices.map((c) => c.label).join(" · "),
            })
            currentId = null
            break
          }
          case "capture": {
            const data = stepData as CaptureNodeData
            if (data.prompt?.trim()) {
              const text = renderTemplate(data.prompt, vars)
              nextBubbles.push({
                id: createId("msg"),
                kind: "assistant",
                text,
                nodeId: node.id,
              })
            }
            waitingNodeId = node.id
            nextWaitingMode = "capture"
            nextButtons = null
            pushTrace(nextTrace, {
              level: "wait",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Waiting for text capture",
              detail: `Stores into {{${data.variableKey || "lastInput"}}}`,
            })
            currentId = null
            break
          }
          case "prompt":
          case "playbook":
          case "agent":
          case "crew":
          case "operator": {
            const data = stepData as PromptNodeData & GenericNodeData

            // Published runs hold an agent step until the user speaks first
            // when "talks first" is off. Mirror that here or the simulator
            // reports a reply the live workflow would never have sent yet.
            if (
              stepType !== "prompt" &&
              data.talksFirst === false &&
              !vars.__aiTurnReady
            ) {
              waitingNodeId = node.id
              nextWaitingMode = "ai_turn"
              nextButtons = null
              pushTrace(nextTrace, {
                level: "wait",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Waiting for user before AI turn",
              })
              currentId = null
              break
            }

            const { __aiTurnReady: _turnReady, ...readyVars } = vars
            vars = readyVars

            // Suspend here exactly like the published runtime does: it hands
            // the node to an action and resumes on the reply. The generation
            // itself runs server-side against the real model.
            asyncNode = { nodeId: node.id, kind: "ai" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              level: "ai",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: `Running ${nodeTypeLabel(stepType)}`,
              detail: renderTemplate(
                data.instructions || data.description || "",
                vars
              ).slice(0, 180),
            })
            currentId = null
            break
          }
          case "kbSearch": {
            asyncNode = { nodeId: node.id, kind: "ai" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              level: "ai",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Searching knowledge base",
              detail: renderTemplate(
                (stepData as KbSearchNodeData).query || "{{lastInput}}",
                vars
              ),
            })
            currentId = null
            break
          }
          case "callForward": {
            const data = stepData as GenericNodeData
            const text =
              data.description?.trim() ||
              "Connecting you with a human operator now."
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text,
              nodeId: node.id,
            })
            pushTrace(nextTrace, {
              level: "warn",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Handoff to human",
              detail: text,
            })
            currentId = null
            break
          }
          case "api": {
            const data = stepData as ApiNodeData
            asyncNode = { nodeId: node.id, kind: "api" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              level: "step",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Calling API",
              detail: `${data.method ?? "GET"} ${
                renderTemplate(data.url || "", vars) || "(no URL)"
              }`,
            })
            currentId = null
            break
          }
          case "carousel": {
            const data = stepData as CarouselNodeData
            const cards = data.cards ?? []

            if (cards.length > 0) {
              nextBubbles.push({
                id: createId("carousel"),
                nodeId: node.id,
                kind: "carousel",
                text: "",
                cards: cards.map((card, index) => ({
                  id: card.id,
                  title: renderTemplate(
                    card.title || `Option ${index + 1}`,
                    vars
                  ),
                  text: renderTemplate(card.description || "", vars),
                  imageUrl: renderTemplate(card.url || "", vars),
                  buttons: card.buttons,
                })),
              })
            }

            const carouselButtons = cards.flatMap((card) => card.buttons ?? [])

            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Showed carousel",
              detail: `${cards.length} card(s)`,
            })

            if (carouselButtons.length === 0) {
              advance()
              break
            }

            nextButtons = carouselButtons
            waitingNodeId = node.id
            nextWaitingMode = "buttons"
            pushTrace(nextTrace, {
              level: "wait",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Waiting for carousel button",
              detail: carouselButtons.map((b) => b.label).join(" · "),
            })
            currentId = null
            break
          }
          case "customAction": {
            const data = stepData as CustomActionNodeData
            const actionName =
              renderTemplate(data.actionName || "", vars).trim() ||
              "custom_action"
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: `Would dispatch ${actionName}`,
              detail:
                "Published runs send a workflow.action webhook; test runs do not fire integrations.",
            })
            advance()
            break
          }
          case "javascript": {
            asyncNode = { nodeId: node.id, kind: "javascript" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              level: "step",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Running JavaScript",
            })
            currentId = null
            break
          }
          case "tool": {
            const data = stepData as ToolNodeData
            asyncNode = { nodeId: node.id, kind: "tool" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              step: steps,
              level: "step",
              nodeId: node.id,
              nodeType: stepType,
              title: "Running tool",
              detail: data.toolName || "(none selected)",
            })
            currentId = null
            break
          }
          case "component": {
            const data = stepData as ComponentNodeData

            if (!data.workflowId) {
              pushTrace(nextTrace, {
                level: "error",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Component skipped",
                detail: "No workflow is selected for this component.",
              })
              advance()
              break
            }

            if (
              componentStack.some(
                (frame) => frame.workflowId === data.workflowId
              )
            ) {
              pushTrace(nextTrace, {
                level: "error",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Component skipped",
                detail: "That component is already running (recursion).",
              })
              advance()
              break
            }

            if (componentStack.length >= 5) {
              pushTrace(nextTrace, {
                level: "error",
                step: steps,
                nodeId: node.id,
                nodeType: stepType,
                title: "Component skipped",
                detail: "Component nesting is capped at 5 levels.",
              })
              advance()
              break
            }

            // The child graph has to be fetched, so pause like any other
            // out-of-band step and descend when it arrives.
            asyncNode = { nodeId: node.id, kind: "component" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              level: "step",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: `Entering component ${data.workflowName || ""}`.trim(),
            })
            currentId = null
            break
          }
          case "function": {
            asyncNode = { nodeId: node.id, kind: "function" }
            activeNodeId = node.id
            pushTrace(nextTrace, {
              level: "step",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Running function",
            })
            currentId = null
            break
          }
          case "end": {
            const data = stepData as GenericNodeData
            // The published runtime always says something before it closes.
            const message =
              renderTemplate(data.description?.trim() ?? "", vars) ||
              "Conversation ended."
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text: message,
              nodeId: node.id,
            })
            pushTrace(nextTrace, {
              level: "done",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: "Conversation ended",
              detail: message,
            })
            currentId = null
            break
          }
          default: {
            // The published runtime ends the run and escalates here, so the
            // simulator must not quietly skip past it.
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text: `This workflow reached an unsupported step (${
                stepType ?? "unknown"
              }). A human operator will continue from here.`,
              nodeId: node.id,
            })
            pushTrace(nextTrace, {
              level: "error",
              step: steps,
              nodeId: node.id,
              nodeType: stepType,
              title: `Unsupported step "${stepType}"`,
              detail: "Published runs escalate to a human operator here.",
            })
            currentId = null
            break
          }
        }
      }

      componentStackRef.current = componentStack
      runGraphRef.current = activeGraph

      const ended = !waitingNodeId && !asyncNode
      if (ended) {
        const last = nextTrace[nextTrace.length - 1]
        if (last?.level !== "done" && last?.level !== "error") {
          pushTrace(nextTrace, {
            level: "done",
            title: "Run finished",
            detail: "No more connected steps.",
          })
        }
      }

      return {
        vars,
        bubbles: nextBubbles,
        trace: nextTrace,
        nextButtons,
        waitingNodeId,
        waitingMode: nextWaitingMode,
        activeNodeId: waitingNodeId ?? asyncNode?.nodeId ?? activeNodeId,
        asyncNode,
        pausedStepIndex: currentStepIndex,
        ended,
        stepCount: steps,
      }
    },
    [getNextNodeId, nodes]
  )

  const applyResult = (result: ExecuteState) => {
    setBubbles(result.bubbles)
    setTrace(result.trace)
    setVariables(result.vars)
    setPendingButtons(result.nextButtons)
    setPendingNodeId(result.waitingNodeId)
    setPendingStepIndex(result.pausedStepIndex)
    setWaitingMode(result.waitingMode)
    setDraftInput("")
    asyncRunKeyRef.current += 1
    setAsyncRun(
      result.asyncNode
        ? {
            ...result.asyncNode,
            key: asyncRunKeyRef.current,
            stepIndex: result.pausedStepIndex,
          }
        : null
    )
    setStatus(
      result.ended ? "ended" : result.waitingNodeId ? "waiting" : "running"
    )
    onActiveNodeChange?.({
      activeNodeId: result.activeNodeId,
      waitingNodeId: result.waitingNodeId,
    })
  }

  /**
   * Mirrors system/workflowRuntime.continueAfterAi and continueAfterApi: the
   * step runs server-side, its result lands in variables, and the walk resumes
   * at the block's outgoing edge (success/fail for API).
   */
  useEffect(() => {
    if (!asyncRun) {
      return
    }

    const node = (runGraphRef.current?.nodes ?? nodes).find(
      (candidate) => candidate.id === asyncRun.nodeId
    )

    if (!node) {
      return
    }

    let cancelled = false
    const isStale = () => cancelled || asyncRunKeyRef.current !== asyncRun.key
    const resumeStep = trace.filter((event) => event.level === "step").length

    const inBlock = node.type === "block"

    /** Data of the step that paused: the block entry, or the node itself. */
    const pausedData: NodeData = inBlock
      ? (((node.data as BlockNodeData).steps ?? [])[asyncRun.stepIndex]?.data ??
        node.data)
      : node.data

    const pausedType =
      (inBlock
        ? ((node.data as BlockNodeData).steps ?? [])[asyncRun.stepIndex]?.type
        : node.type) ?? node.type

    const resume = (
      nextVars: RuntimeVariables,
      nextBubbles: ChatBubble[],
      nextTrace: TraceEvent[],
      handleId?: string
    ) => {
      // handleId means the step branched, which only terminal steps do, so it
      // leaves the block. Without one an in-block step carries on internally.
      const continuesInBlock = inBlock && !handleId

      applyResult(
        executeFrom(
          continuesInBlock ? node.id : getNextNodeId(node.id, handleId),
          nextVars,
          nextBubbles,
          nextTrace,
          resumeStep,
          continuesInBlock ? asyncRun.stepIndex + 1 : 0
        )
      )
    }

    const fail = (title: string, detail: string, message: string) => {
      const nextTrace = [...trace]
      pushTrace(nextTrace, {
        level: "error",
        nodeId: node.id,
        nodeType: node.type,
        title,
        detail,
      })

      setBubbles([
        ...bubbles,
        {
          id: createId("msg"),
          kind: "assistant",
          text: message,
          nodeId: node.id,
        },
      ])
      setTrace(nextTrace)
      setAsyncRun(null)
      setStatus("ended")
      onActiveNodeChange?.({ activeNodeId: node.id, waitingNodeId: null })
    }

    void (async () => {
      if (asyncRun.kind === "component") {
        const data = pausedData as ComponentNodeData

        try {
          const definition = (await convex.query(
            api.private.workflows.getPublishedDefinition,
            { workflowId: data.workflowId as Id<"workflows"> }
          )) as {
            nodes?: Array<{ id: string; type?: string; data?: unknown }>
            edges?: Array<{
              id?: string
              source?: string
              target?: string
              sourceHandle?: string | null
            }>
          } | null

          if (isStale()) {
            return
          }

          const childNodes = (definition?.nodes ?? []) as Node<NodeData>[]
          const startNode = childNodes.find((entry) => entry.type === "start")
          const nextTrace = [...trace]

          if (!definition || !startNode) {
            pushTrace(nextTrace, {
              level: "error",
              nodeId: node.id,
              nodeType: node.type,
              title: "Component skipped",
              detail: !definition
                ? `"${data.workflowName ?? "That workflow"}" has never been published, so it has no runnable version.`
                : `"${data.workflowName ?? "That workflow"}" has no Start block.`,
            })
            resume(variables, [...bubbles], nextTrace)
            return
          }

          // Inputs are plain assignments: parent and child share one variable
          // scope, exactly as the published runtime does it.
          const nextVars: RuntimeVariables = { ...variables }

          for (const input of data.inputs ?? []) {
            if (input.name.trim()) {
              nextVars[input.name.trim()] = renderTemplate(
                input.value,
                nextVars
              )
            }
          }

          const callerGraph = runGraphRef.current ?? { nodes, edges }
          componentStackRef.current = [
            ...componentStackRef.current,
            {
              graph: callerGraph,
              returnNodeId: node.id,
              returnStepIndex: asyncRun.stepIndex,
              workflowId: data.workflowId,
            },
          ]
          runGraphRef.current = {
            nodes: childNodes,
            edges: (definition.edges ?? []) as Edge[],
          }

          applyResult(
            executeFrom(
              startNode.id,
              nextVars,
              [...bubbles],
              nextTrace,
              resumeStep
            )
          )
        } catch (error) {
          if (isStale()) {
            return
          }

          fail(
            "Component failed",
            error instanceof Error ? error.message : "Could not load component",
            "I had trouble running a step. A human operator will continue from here."
          )
        }
        return
      }

      if (asyncRun.kind === "tool") {
        try {
          const result = await previewToolStep({
            data: pausedData,
            variables,
          })

          if (isStale()) {
            return
          }

          const nextVars: RuntimeVariables = { ...variables }

          if (result.ok && result.outputVariable) {
            nextVars[result.outputVariable] = result.result
          }

          const nextTrace = [...trace]
          pushTrace(nextTrace, {
            level: result.ok ? "branch" : "warn",
            nodeId: node.id,
            nodeType: node.type,
            title: `Tool ${result.ok ? "ok" : "error"}`,
            detail: result.error ?? result.result.slice(0, 180),
            varsChanged: diffVars(variables, nextVars),
          })

          resume(
            nextVars,
            [...bubbles],
            nextTrace,
            result.ok ? "success" : "fail"
          )
        } catch (error) {
          if (isStale()) {
            return
          }

          fail(
            "Tool step failed",
            error instanceof Error ? error.message : "Tool failed",
            "I had trouble running a step. A human operator will continue from here."
          )
        }
        return
      }

      if (asyncRun.kind === "function") {
        const data = pausedData as FunctionNodeData
        const paths = data.paths ?? []

        try {
          const result = await previewJsStep({
            code: data.code ?? "",
            variables,
          })

          if (isStale()) {
            return
          }

          const nextVars: RuntimeVariables = {
            ...variables,
            ...((result.variables ?? {}) as RuntimeVariables),
          }
          const nextTrace = [...trace]

          for (const line of result.logs) {
            pushTrace(nextTrace, {
              level: "info",
              nodeId: node.id,
              title: "console.log",
              detail: line,
            })
          }

          // Mirrors workflowJsSteps.runNode: a named path wins, an unknown one
          // falls back to the first, a throw looks for a path called "error".
          const chosen = result.ok
            ? ((result.next
                ? paths.find((path) => path.name === result.next)
                : undefined) ?? paths[0])
            : paths.find((path) => path.name === "error")

          pushTrace(nextTrace, {
            level: result.ok ? "branch" : "warn",
            nodeId: node.id,
            title: result.ok
              ? `Function → ${chosen?.name ?? "no path"}`
              : "Function error",
            detail:
              result.error ??
              (result.next && !paths.some((path) => path.name === result.next)
                ? `No path named "${result.next}"; took the first one.`
                : undefined),
            varsChanged: diffVars(variables, nextVars),
          })

          resume(nextVars, [...bubbles], nextTrace, chosen?.id)
        } catch (error) {
          if (isStale()) {
            return
          }

          fail(
            "Function failed",
            error instanceof Error ? error.message : "Snippet failed",
            "I had trouble running a step. A human operator will continue from here."
          )
        }
        return
      }

      if (asyncRun.kind === "javascript") {
        try {
          const result = await previewJsStep({
            code: (pausedData as JavascriptNodeData).code ?? "",
            variables,
          })

          if (isStale()) {
            return
          }

          const nextVars: RuntimeVariables = {
            ...variables,
            ...((result.variables ?? {}) as RuntimeVariables),
          }
          const nextTrace = [...trace]

          for (const line of result.logs) {
            pushTrace(nextTrace, {
              level: "info",
              nodeId: node.id,
              nodeType: node.type,
              title: "console.log",
              detail: line,
            })
          }

          pushTrace(nextTrace, {
            level: result.ok ? "branch" : "warn",
            nodeId: node.id,
            nodeType: node.type,
            title: `JavaScript ${result.ok ? "ok" : "error"}`,
            detail: result.error,
            varsChanged: diffVars(variables, nextVars),
          })

          resume(
            nextVars,
            [...bubbles],
            nextTrace,
            result.ok ? "success" : "fail"
          )
        } catch (error) {
          if (isStale()) {
            return
          }

          fail(
            "JavaScript step failed",
            error instanceof Error ? error.message : "Snippet failed",
            "I had trouble running a step. A human operator will continue from here."
          )
        }
        return
      }

      if (asyncRun.kind === "api") {
        try {
          const result = await previewApiStep({
            data: pausedData,
            variables,
          })

          if (isStale()) {
            return
          }

          const nextVars: RuntimeVariables = {
            ...variables,
            ...((result.variables ?? {}) as RuntimeVariables),
          }
          const nextTrace = [...trace]

          pushTrace(nextTrace, {
            level: result.ok ? "branch" : "warn",
            nodeId: node.id,
            nodeType: node.type,
            title: `API ${result.ok ? "success" : "fail"} (${result.status})`,
            detail: result.error,
            varsChanged: diffVars(variables, nextVars),
          })

          resume(
            nextVars,
            [...bubbles],
            nextTrace,
            result.ok ? "success" : "fail"
          )
        } catch (error) {
          if (isStale()) {
            return
          }

          fail(
            "API step failed",
            error instanceof Error ? error.message : "Request failed",
            "I had trouble reaching that service. A human operator will continue from here."
          )
        }
        return
      }

      // An agent turn is not just a completion: it can pick one of the node's
      // exits, collect variables, offer quick replies, or close the chat.
      if (pausedType && isAgentStepType(pausedType as NodeType)) {
        try {
          const turn = await previewAgentTurn({
            data: pausedData,
            variables,
          })

          if (isStale()) {
            return
          }

          const nextBubbles = [...bubbles]
          const nextTrace = [...trace]
          const nextVars: RuntimeVariables = {
            ...variables,
            ...(turn.variables as RuntimeVariables),
          }
          const reply = turn.reply.trim()

          for (const call of turn.toolCalls) {
            pushTrace(nextTrace, {
              level: "step",
              nodeId: node.id,
              nodeType: pausedType,
              title: `Agent called ${call.name}`,
              detail: call.result.slice(0, 180),
            })
          }

          if (reply) {
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text: reply,
              nodeId: node.id,
            })
            if (turn.outputVariable) {
              nextVars[turn.outputVariable] = reply
            }
            nextVars.lastAiResponse = reply
          }

          for (const message of turn.exitMessages) {
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text: message,
              nodeId: node.id,
            })
          }

          pushTrace(nextTrace, {
            level: "ai",
            nodeId: node.id,
            nodeType: pausedType,
            title: `${nodeTypeLabel(pausedType)} replied`,
            detail: reply.slice(0, 180) || "(no text)",
            varsChanged: diffVars(variables, nextVars),
          })

          if (turn.blockedExitId) {
            pushTrace(nextTrace, {
              level: "info",
              nodeId: node.id,
              nodeType: pausedType,
              title: "Exit held back",
              detail:
                "The agent matched an exit but is still missing a value it requires.",
            })
          }

          if (turn.exitId) {
            pushTrace(nextTrace, {
              level: "branch",
              nodeId: node.id,
              nodeType: pausedType,
              title: `Exit → ${turn.exitName ?? turn.exitId}`,
            })
            resume(nextVars, nextBubbles, nextTrace, turn.exitId)
            return
          }

          if (turn.action === "end" || turn.action === "callForward") {
            const ending = turn.action === "end"
            pushTrace(nextTrace, {
              level: ending ? "done" : "warn",
              nodeId: node.id,
              nodeType: pausedType,
              title: ending
                ? "Agent ended the conversation"
                : "Agent handed off to a human",
            })
            setBubbles(nextBubbles)
            setTrace(nextTrace)
            setVariables(nextVars)
            setAsyncRun(null)
            setStatus("ended")
            setPendingButtons(null)
            setPendingNodeId(null)
            setWaitingMode(null)
            onActiveNodeChange?.({
              activeNodeId: node.id,
              waitingNodeId: null,
            })
            return
          }

          // An agent with no exits is a plain AI reply: carry on to the next
          // node instead of waiting on a turn it can never leave.
          if (!turn.hasExits) {
            resume(nextVars, nextBubbles, nextTrace)
            return
          }

          // No exit and no terminal move: the agent keeps the turn and waits.
          pushTrace(nextTrace, {
            level: "wait",
            nodeId: node.id,
            nodeType: pausedType,
            title: "Waiting for the user",
            detail: turn.buttons.length
              ? turn.buttons.map((button) => button.label).join(" · ")
              : undefined,
          })
          setBubbles(nextBubbles)
          setTrace(nextTrace)
          setVariables(nextVars)
          setAsyncRun(null)
          setStatus("waiting")
          setWaitingMode("ai_turn")
          setPendingNodeId(node.id)
          setPendingStepIndex(asyncRun.stepIndex)
          setPendingButtons(turn.buttons.length > 0 ? turn.buttons : null)
          onActiveNodeChange?.({
            activeNodeId: node.id,
            waitingNodeId: node.id,
          })
          return
        } catch (error) {
          if (isStale()) {
            return
          }

          fail(
            "Agent turn failed",
            error instanceof Error ? error.message : "Agent step failed",
            "I had trouble completing this agent step. A human operator will continue from here."
          )
          return
        }
      }

      try {
        const result = await previewAiStep({
          nodeType: node.type ?? "prompt",
          data: pausedData,
          variables,
        })

        if (isStale()) {
          return
        }

        const text = result.text.trim()
        const nextBubbles = [...bubbles]

        if (result.sendMessage && text) {
          nextBubbles.push({
            id: createId("msg"),
            kind: "assistant",
            text,
            nodeId: node.id,
          })
        }

        const nextVars: RuntimeVariables = { ...variables }

        if (text) {
          if (result.outputVariable) {
            nextVars[result.outputVariable] = text
          }
          nextVars.lastAiResponse = text
        }

        const nextTrace = [...trace]
        pushTrace(nextTrace, {
          level: "ai",
          nodeId: node.id,
          nodeType: node.type,
          title: `${nodeTypeLabel(node.type)} completed`,
          detail: text.slice(0, 180) || "(no text)",
          varsChanged: diffVars(variables, nextVars),
        })

        resume(nextVars, nextBubbles, nextTrace)
      } catch (error) {
        if (isStale()) {
          return
        }

        fail(
          "AI step failed",
          error instanceof Error ? error.message : "Workflow AI step failed",
          "I had trouble completing this AI step. A human operator will continue from here."
        )
      }
    })()

    return () => {
      cancelled = true
    }
    // Intentionally keyed on the run token only: bubbles/trace/variables are
    // read from the render that scheduled this step and must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncRun])

  const startRun = useCallback(() => {
    freezeGraph(nodes, edges)

    const startNode =
      runGraphRef.current?.nodes.find((node) => node.type === "start") ??
      runGraphRef.current?.nodes[0]

    if (!startNode) {
      setBubbles([])
      setTrace([
        {
          id: createId("tr"),
          at: Date.now(),
          level: "warn",
          title: "Nothing to run",
          detail: "Add a Start node and connect steps.",
        },
      ])
      setStatus("idle")
      onActiveNodeChange?.({ activeNodeId: null, waitingNodeId: null })
      return
    }

    applyResult(executeFrom(startNode.id, {}, [], []))
  }, [edges, executeFrom, freezeGraph, nodes, onActiveNodeChange])

  startRunRef.current = startRun

  useEffect(() => {
    if (!autoStartKey) return
    if (lastAutoStartKeyRef.current === autoStartKey) return

    const timer = window.setTimeout(() => {
      // Claim the key only once the run actually starts. Claiming it up front
      // meant StrictMode's mount/unmount/remount cancelled the first timer and
      // then short-circuited the second, so Run opened the panel without ever
      // starting the conversation.
      lastAutoStartKeyRef.current = autoStartKey
      startRunRef.current()
      onAutoStartCompleteRef.current?.()
    }, 280)

    return () => window.clearTimeout(timer)
  }, [autoStartKey])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [bubbles, pendingButtons])

  useEffect(() => {
    if (dockCollapsed || dockTab === "vars") return
    const el = traceRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [trace, dockTab, dockCollapsed])

  // The chat panel and the canvas tools sit above the dock, so publish its
  // live height on the shell rather than hard-coding it in three places.
  useEffect(() => {
    const shell = dockRef.current?.closest(".builder-shell")
    if (!(shell instanceof HTMLElement)) return
    shell.style.setProperty(
      "--dock-h",
      `${dockCollapsed ? DOCK_COLLAPSED_H : dockHeight}px`
    )
    return () => {
      shell.style.removeProperty("--dock-h")
    }
  }, [dockCollapsed, dockHeight])

  const resetRun = () => {
    asyncRunKeyRef.current += 1
    setAsyncRun(null)
    setStatus("idle")
    setBubbles([])
    setTrace([])
    setVariables({})
    setPendingButtons(null)
    setPendingNodeId(null)
    setWaitingMode(null)
    setDraftInput("")
    setDockTab("trace")
    clearFrozenGraph()
    onActiveNodeChange?.({ activeNodeId: null, waitingNodeId: null })
  }

  /** Bring a dock view forward, expanding the dock if it was collapsed. */
  const revealDock = (next: DockTab) => {
    setDockTab(next)
    setDockCollapsed(false)
  }

  const startDockResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = dockCollapsed ? DOCK_COLLAPSED_H : dockHeight
    setDockCollapsed(false)

    const onMove = (move: globalThis.PointerEvent) => {
      const next = startHeight + (startY - move.clientY)
      setDockHeight(Math.min(DOCK_MAX_H, Math.max(DOCK_MIN_H, next)))
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.classList.remove("dock-resizing")
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    document.body.classList.add("dock-resizing")
  }

  const handleButton = (buttonId: string) => {
    if (!pendingNodeId) return
    const button =
      pendingButtons?.find((entry) => entry.id === buttonId) ?? null
    const label = button?.label ?? buttonId

    // An agent's quick replies are things the user says, not ports on the
    // node, so they re-enter the same agent turn instead of following an edge.
    if (waitingMode === "ai_turn") {
      const turnVars: RuntimeVariables = {
        ...variables,
        lastInput: label,
        lastUserMessage: label,
        lastButtonId: buttonId,
        lastButtonLabel: label,
        __aiTurnReady: "1",
      }
      const turnBubbles: ChatBubble[] = [
        ...bubbles,
        { id: createId("usr"), kind: "user", text: label },
      ]
      const turnTrace = [...trace]
      pushTrace(turnTrace, {
        level: "info",
        nodeId: pendingNodeId,
        title: "User replied to the agent",
        detail: label,
      })

      applyResult(
        executeFrom(
          pendingNodeId,
          turnVars,
          turnBubbles,
          turnTrace,
          turnTrace.filter((event) => event.level === "step").length,
          pendingStepIndex
        )
      )
      return
    }

    const nextVars: RuntimeVariables = {
      ...variables,
      lastButtonId: buttonId,
      lastButtonLabel: label,
      lastInput: label,
      lastUserMessage: label,
    }

    if (waitingMode === "choice") {
      const data = nodeMap.get(pendingNodeId)?.data as
        | ChoiceNodeData
        | undefined
      nextVars[data?.variableKey || "lastInput"] = label
    }

    const withUser: ChatBubble[] = [
      ...bubbles,
      { id: createId("usr"), kind: "user", text: label },
    ]
    const withTrace = [...trace]
    pushTrace(withTrace, {
      level: "info",
      nodeId: pendingNodeId,
      title: "User selected",
      detail: label,
      varsChanged: diffVars(variables, nextVars),
    })

    applyResult(
      executeFrom(
        getNextNodeId(pendingNodeId, buttonId),
        nextVars,
        withUser,
        withTrace,
        withTrace.filter((t) => t.level === "step").length
      )
    )
  }

  const handleTextSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!pendingNodeId || !draftInput.trim()) return
    if (
      waitingMode !== "capture" &&
      waitingMode !== "choice" &&
      waitingMode !== "ai_turn"
    )
      return

    const text = draftInput.trim()

    if (waitingMode === "choice") {
      const match = pendingButtons?.find(
        (button) => button.label.trim().toLowerCase() === text.toLowerCase()
      )
      if (!match) {
        const withUser: ChatBubble[] = [
          ...bubbles,
          { id: createId("usr"), kind: "user", text },
        ]
        const withTrace = [...trace]
        pushTrace(withTrace, {
          level: "warn",
          nodeId: pendingNodeId,
          title: "Choice not matched",
          detail: `Got "${text}". Expected: ${(pendingButtons ?? [])
            .map((b) => b.label)
            .join(", ")}`,
        })
        setBubbles(withUser)
        setTrace(withTrace)
        setDraftInput("")
        return
      }
      handleButton(match.id)
      return
    }

    if (waitingMode === "ai_turn") {
      // The agent step itself resumes, not the step after it.
      const nextVars: RuntimeVariables = {
        ...variables,
        lastInput: text,
        lastUserMessage: text,
        __aiTurnReady: "1",
      }
      const withUser: ChatBubble[] = [
        ...bubbles,
        { id: createId("usr"), kind: "user", text },
      ]
      const withTrace = [...trace]
      pushTrace(withTrace, {
        level: "info",
        nodeId: pendingNodeId,
        title: "User spoke first",
        detail: text,
      })

      applyResult(
        executeFrom(
          pendingNodeId,
          nextVars,
          withUser,
          withTrace,
          withTrace.filter((t) => t.level === "step").length,
          pendingStepIndex
        )
      )
      return
    }

    const data = nodeMap.get(pendingNodeId)?.data as CaptureNodeData | undefined
    const key = data?.variableKey || "lastInput"
    const nextVars: RuntimeVariables = {
      ...variables,
      [key]: text,
      lastInput: text,
      lastUserMessage: text,
    }
    const withUser: ChatBubble[] = [
      ...bubbles,
      { id: createId("usr"), kind: "user", text },
    ]
    const withTrace = [...trace]
    pushTrace(withTrace, {
      level: "info",
      nodeId: pendingNodeId,
      title: "Captured user text",
      detail: `${key} = "${text}"`,
      varsChanged: diffVars(variables, nextVars),
    })

    const pendingIsBlock =
      (runGraphRef.current?.nodes ?? nodes).find(
        (entry) => entry.id === pendingNodeId
      )?.type === "block"
    // Capture never branches, so a block simply carries on with its next step.
    const nextId = pendingIsBlock ? pendingNodeId : getNextNodeId(pendingNodeId)
    if (!nextId) {
      pushTrace(withTrace, {
        level: "error",
        nodeId: pendingNodeId,
        nodeType: "capture",
        title: "No next step after Capture",
        detail:
          "Connect the Capture node’s right handle to the next Message (or other step), then start a new chat.",
      })
      setBubbles(withUser)
      setTrace(withTrace)
      setVariables(nextVars)
      setDraftInput("")
      setStatus("ended")
      setPendingNodeId(null)
      setWaitingMode(null)
      setPendingButtons(null)
      onActiveNodeChange?.({
        activeNodeId: pendingNodeId,
        waitingNodeId: null,
      })
      revealDock("trace")
      return
    }

    applyResult(
      executeFrom(
        nextId,
        nextVars,
        withUser,
        withTrace,
        withTrace.filter((t) => t.level === "step").length,
        pendingIsBlock ? pendingStepIndex + 1 : 0
      )
    )
  }

  const copyTrace = async () => {
    const lines = trace.map((event) => {
      const stamp = formatTime(event.at)
      const step = event.step != null ? `#${event.step} ` : ""
      const type = event.nodeType ? `[${event.nodeType}] ` : ""
      const detail = event.detail ? ` — ${event.detail}` : ""
      const vars = event.varsChanged
        ? ` | vars ${Object.entries(event.varsChanged)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")}`
        : ""
      return `${stamp} ${step}${type}${event.title}${detail}${vars}`
    })
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const pendingButtonOwnerType = pendingNodeId
    ? nodeMap.get(pendingNodeId)?.type
    : null
  const showTextInput =
    status === "waiting" &&
    (waitingMode === "capture" ||
      waitingMode === "choice" ||
      waitingMode === "ai_turn")
  const variableEntries = Object.entries(variables).filter(
    ([key]) => !key.startsWith("__")
  )
  const statusLabel =
    status === "idle"
      ? "Ready"
      : status === "waiting"
        ? waitingMode === "capture"
          ? "Waiting for reply"
          : waitingMode === "choice"
            ? "Waiting for choice"
            : waitingMode === "ai_turn"
              ? "Waiting for you to speak first"
              : "Waiting for button"
        : status === "ended"
          ? "Ended"
          : asyncRun
            ? asyncRun.kind === "api"
              ? "Calling API"
              : asyncRun.kind === "javascript"
                ? "Running code"
                : asyncRun.kind === "tool"
                  ? "Running tool"
                  : asyncRun.kind === "component"
                    ? "Entering component"
                    : asyncRun.kind === "function"
                      ? "Running function"
                      : "Generating"
            : "Running"

  const stepsRun = trace.filter((event) => event.level === "step").length
  const issues = trace.filter(
    (event) => event.level === "warn" || event.level === "error"
  )
  /** Which step last wrote each variable, so the table can show provenance. */
  const variableOrigins = new Map<
    string,
    { at: number; nodeType?: string; title: string }
  >()
  for (const event of trace) {
    if (!event.varsChanged) continue
    for (const key of Object.keys(event.varsChanged)) {
      variableOrigins.set(key, {
        at: event.at,
        nodeType: event.nodeType,
        title: event.title,
      })
    }
  }

  const renderCard = (card: ChatCard, ownerNodeId?: string) => (
    <article key={card.id} className="chat-card-message">
      {card.imageUrl && (
        <img
          src={card.imageUrl}
          alt={card.alt || card.title || "Workflow card"}
        />
      )}
      <div className="chat-card-content">
        <h3>{card.title}</h3>
        {card.text && (
          <div
            className="chat-card-description"
            dangerouslySetInnerHTML={{ __html: card.text }}
          />
        )}
        {card.buttons && card.buttons.length > 0 && (
          <div className="chat-card-buttons">
            {card.buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                onClick={() => handleButton(button.id)}
                disabled={status !== "waiting" || pendingNodeId !== ownerNodeId}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  )

  const renderLogTable = (events: TraceEvent[]) => (
    <table className="run-log-table">
      <thead>
        <tr>
          <th className="col-time">Time</th>
          <th className="col-step">Step</th>
          <th className="col-type">Block</th>
          <th className="col-event">Event</th>
          <th className="col-detail">Detail</th>
          <th className="col-vars">Variables written</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id} className={`level-${event.level}`}>
            <td className="col-time">{formatTime(event.at)}</td>
            <td className="col-step">
              {event.step != null ? `#${event.step}` : ""}
            </td>
            <td className="col-type">
              {event.nodeType && (
                <span className="run-log-badge">
                  {nodeTypeLabel(event.nodeType)}
                </span>
              )}
            </td>
            <td className="col-event">{event.title}</td>
            <td className="col-detail">{event.detail}</td>
            <td className="col-vars">
              {event.varsChanged &&
                Object.entries(event.varsChanged).map(([key, value]) => (
                  <span key={key} className="run-var-chip">
                    <em>{key}</em>
                    {value || "∅"}
                  </span>
                ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <>
      <aside className="side-drawer chat-inspector-sheet">
        <section className="chat-runner">
          <div className="chat-runner-header">
            <div className="chat-runner-heading">
              <h2>Test run</h2>
              <span className={`run-status-pill run-status-${status}`}>
                {statusLabel}
              </span>
            </div>
            <div className="chat-runner-actions">
              <button
                type="button"
                onClick={resetRun}
                title="Reset"
                aria-label="Reset chat"
              >
                <RunnerIcon name="reset" />
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  title="Close"
                  aria-label="Close chat"
                >
                  <RunnerIcon name="close" />
                </button>
              )}
            </div>
          </div>

          <div className="chat-runner-body" ref={bodyRef}>
            {bubbles.length === 0 && status === "idle" ? (
              <div className="chat-empty-state">
                <strong>Preview the conversation</strong>
                <p>
                  Run the published path locally. The log and variables below
                  update as each step executes.
                </p>
              </div>
            ) : (
              <>
                <div className="chat-start-label">Live preview</div>
                {bubbles.map((item) =>
                  item.kind === "assistant" ? (
                    <div
                      key={item.id}
                      className="chat-message message"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  ) : item.kind === "user" ? (
                    <div key={item.id} className="chat-message user">
                      {item.text}
                    </div>
                  ) : item.kind === "image" ? (
                    <div key={item.id} className="chat-image-message">
                      <img src={item.text} alt={item.alt || "Workflow image"} />
                    </div>
                  ) : item.kind === "carousel" ? (
                    <div key={item.id} className="chat-carousel">
                      {(item.cards ?? []).map((card) =>
                        renderCard(card, item.nodeId)
                      )}
                    </div>
                  ) : (
                    renderCard(
                      {
                        id: item.id,
                        title: item.title ?? "",
                        text: item.text,
                        alt: item.alt,
                        imageUrl: item.imageUrl,
                        buttons: item.buttons,
                      },
                      item.nodeId
                    )
                  )
                )}

                {pendingButtons &&
                  pendingButtons.length > 0 &&
                  pendingButtonOwnerType !== "card" &&
                  pendingButtonOwnerType !== "carousel" && (
                    <div className="chat-choice-list">
                      {pendingButtons.map((button) => (
                        <button
                          key={button.id}
                          className="chat-choice"
                          onClick={() => handleButton(button.id)}
                          disabled={status !== "waiting"}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  )}

                {status === "ended" && (
                  <div className="chat-ended-divider">
                    <span>Chat has ended</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="chat-runner-footer">
            {showTextInput ? (
              <form className="run-reply-form" onSubmit={handleTextSubmit}>
                <input
                  value={draftInput ?? ""}
                  onChange={(event) => setDraftInput(event.target.value)}
                  placeholder={
                    waitingMode === "capture"
                      ? "Type a reply…"
                      : "Type a choice or tap a button…"
                  }
                  autoFocus
                />
                <button className="chat-start-button" type="submit">
                  Send
                </button>
              </form>
            ) : (
              <button
                className="chat-start-button"
                type="button"
                onClick={startRun}
              >
                <RunnerIcon name="play" />
                <span>
                  {status === "idle" && bubbles.length === 0
                    ? "Start workflow"
                    : "Start new chat"}
                </span>
              </button>
            )}
          </div>
        </section>
      </aside>

      <section
        className={`run-dock ${dockCollapsed ? "collapsed" : ""}`}
        ref={dockRef}
        aria-label="Run inspector"
      >
        <div
          className="run-dock-resize"
          role="separator"
          aria-orientation="horizontal"
          title="Drag to resize"
          onPointerDown={startDockResize}
        />
        <div className="run-dock-bar">
          <div className="run-dock-tabs" role="tablist" aria-label="Run views">
            {(
              [
                ["trace", "Log", trace.length],
                ["vars", "Variables", variableEntries.length],
                ["issues", "Issues", issues.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={!dockCollapsed && dockTab === id}
                className={`run-dock-tab ${
                  !dockCollapsed && dockTab === id ? "active" : ""
                } ${id === "issues" && count > 0 ? "has-issues" : ""}`}
                onClick={() => revealDock(id)}
              >
                {label}
                {count > 0 && <span className="run-dock-count">{count}</span>}
              </button>
            ))}
          </div>

          <div className="run-dock-summary">
            <span className={`run-status-pill run-status-${status}`}>
              {statusLabel}
            </span>
            <span className="run-dock-metric">
              {stepsRun} {stepsRun === 1 ? "step" : "steps"}
            </span>
          </div>

          <div className="run-dock-actions">
            <button
              type="button"
              onClick={copyTrace}
              title={copied ? "Copied" : "Copy log"}
              aria-label="Copy log"
              disabled={trace.length === 0}
            >
              <RunnerIcon name="copy" />
            </button>
            <button
              type="button"
              className={`run-dock-collapse ${dockCollapsed ? "collapsed" : ""}`}
              onClick={() => setDockCollapsed((value) => !value)}
              title={dockCollapsed ? "Expand panel" : "Collapse panel"}
              aria-label={dockCollapsed ? "Expand panel" : "Collapse panel"}
              aria-expanded={!dockCollapsed}
            >
              <RunnerIcon name="chevron" />
            </button>
          </div>
        </div>

        {!dockCollapsed && (
          <div className="run-dock-body" ref={traceRef}>
            {dockTab === "trace" &&
              (trace.length === 0 ? (
                <div className="run-dock-empty">
                  <strong>No log yet</strong>
                  <p>
                    Start a run to see every step, branch, wait, and variable
                    write in order.
                  </p>
                </div>
              ) : (
                renderLogTable(trace)
              ))}

            {dockTab === "vars" &&
              (variableEntries.length === 0 ? (
                <div className="run-dock-empty">
                  <strong>No variables yet</strong>
                  <p>
                    Capture, Choice, Set variable, API and AI steps populate
                    this table during a run.
                  </p>
                </div>
              ) : (
                <table className="run-vars-table">
                  <thead>
                    <tr>
                      <th className="col-key">Variable</th>
                      <th className="col-value">Value</th>
                      <th className="col-source">Written by</th>
                      <th className="col-time">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variableEntries.map(([key, value]) => {
                      const origin = variableOrigins.get(key)
                      return (
                        <tr key={key}>
                          <td className="col-key">
                            <code>{key}</code>
                          </td>
                          <td className="col-value">
                            {value || <span className="muted">empty</span>}
                          </td>
                          <td className="col-source">
                            {origin ? (
                              <>
                                {origin.nodeType && (
                                  <span className="run-log-badge">
                                    {nodeTypeLabel(origin.nodeType)}
                                  </span>
                                )}
                                <span className="run-vars-origin">
                                  {origin.title}
                                </span>
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td className="col-time">
                            {origin ? formatTime(origin.at) : ""}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ))}

            {dockTab === "issues" &&
              (issues.length === 0 ? (
                <div className="run-dock-empty">
                  <strong>No issues</strong>
                  <p>
                    Warnings and errors raised while running — unmatched
                    choices, dead ends, failed API and AI steps — collect here.
                  </p>
                </div>
              ) : (
                renderLogTable(issues)
              ))}
          </div>
        )}
      </section>
    </>
  )
}

export default RunPanel
