"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import type { Edge, Node } from "reactflow"
import type {
  ButtonOption,
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
  WaitingMode,
} from "../lib/types"

type ChatBubble = {
  id: string
  nodeId?: string
  kind: "assistant" | "user" | "image" | "card"
  text: string
  alt?: string
  title?: string
  imageUrl?: string
  buttons?: ButtonOption[]
}

type TraceLevel = "info" | "step" | "branch" | "wait" | "ai" | "warn" | "error" | "done"

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

type RunnerIconName = "reset" | "close" | "copy" | "play"

type ExecuteState = {
  vars: RuntimeVariables
  bubbles: ChatBubble[]
  trace: TraceEvent[]
  nextButtons: ButtonOption[] | null
  waitingNodeId: string | null
  waitingMode: WaitingMode | null
  activeNodeId: string | null
  ended: boolean
  stepCount: number
}

type PanelTab = "chat" | "trace" | "vars"

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`

const renderTemplate = (value: string, variables: RuntimeVariables) =>
  value.replace(/{{\s*([\w.-]+)\s*}}/g, (_match, key: string) => variables[key] ?? "")

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
  const [tab, setTab] = useState<PanelTab>("chat")
  const [status, setStatus] = useState<RunStatus>("idle")
  const [bubbles, setBubbles] = useState<ChatBubble[]>([])
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [variables, setVariables] = useState<RuntimeVariables>({})
  const [pendingButtons, setPendingButtons] = useState<ButtonOption[] | null>(
    null
  )
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null)
  const [waitingMode, setWaitingMode] = useState<WaitingMode | null>(null)
  const [draftInput, setDraftInput] = useState("")
  const [copied, setCopied] = useState(false)
  // Freeze the graph for the lifetime of a run so Liveblocks/canvas edits
  // cannot restart or rewire mid-conversation.
  const runGraphRef = useRef<{
    nodes: Node<NodeData>[]
    edges: Edge[]
  } | null>(null)
  const [, setGraphEpoch] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const traceRef = useRef<HTMLDivElement>(null)
  const startRunRef = useRef<() => void>(() => {})
  const onAutoStartCompleteRef = useRef(onAutoStartComplete)
  const lastAutoStartKeyRef = useRef<number | undefined>(undefined)

  onAutoStartCompleteRef.current = onAutoStartComplete

  const freezeGraph = useCallback((nextNodes: Node<NodeData>[], nextEdges: Edge[]) => {
    runGraphRef.current = {
      nodes: nextNodes.map((node) => ({
        ...node,
        data: { ...node.data },
      })),
      edges: nextEdges.map((edge) => ({ ...edge })),
    }
    setGraphEpoch((value) => value + 1)
  }, [])

  const clearFrozenGraph = useCallback(() => {
    runGraphRef.current = null
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
        const byHandle = outgoing.find(
          (edge) => edge.sourceHandle === handleId
        )
        if (byHandle?.target) {
          return byHandle.target
        }
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
      startStep = 0
    ): ExecuteState => {
      const graphNodes = runGraphRef.current?.nodes ?? nodes
      const graphNodeMap = new Map(graphNodes.map((node) => [node.id, node]))

      let currentId = startId
      let vars = { ...startVars }
      const nextBubbles = [...startBubbles]
      const nextTrace = [...startTrace]
      let nextButtons: ButtonOption[] | null = null
      let waitingNodeId: string | null = null
      let nextWaitingMode: WaitingMode | null = null
      let activeNodeId: string | null = startId
      let steps = startStep
      let safety = 0

      while (currentId) {
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

        pushTrace(nextTrace, {
          level: "step",
          step: steps,
          nodeId: node.id,
          nodeType: node.type,
          title: `Enter ${nodeTypeLabel(node.type)}`,
          detail: node.data.customName
            ? `Custom name: ${node.data.customName}`
            : undefined,
        })

        switch (node.type) {
          case "start": {
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: "Workflow started",
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "message": {
            const data = node.data as MessageNodeData
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
              nodeType: node.type,
              title: "Sent message",
              detail: stripHtmlPreview(text).slice(0, 160) || "(empty)",
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "image": {
            const data = node.data as ImageNodeData
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
              nodeType: node.type,
              title: url ? "Sent image" : "Image missing URL",
              detail: url || data.alt || undefined,
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "card": {
            const data = node.data as CardNodeData
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
              nodeType: node.type,
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
                nodeType: node.type,
                title: "Waiting for card button",
                detail: data.buttons.map((b) => b.label).join(" · "),
              })
              currentId = null
            } else {
              currentId = getNextNodeId(node.id)
            }
            break
          }
          case "setVariable": {
            const data = node.data as SetVariableNodeData
            const key = data.key || "variable"
            const value = renderTemplate(data.value || "", vars)
            vars = { ...vars, [key]: value }
            pushTrace(nextTrace, {
              level: "info",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: `Set ${key}`,
              detail: value || "(empty)",
              varsChanged: diffVars(beforeVars, vars),
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "condition": {
            const data = node.data as ConditionNodeData
            const result = evaluateCondition(data, vars)
            const handle = result ? "true" : "false"
            pushTrace(nextTrace, {
              level: "branch",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: `Branch → ${handle}`,
              detail: `${data.key || "variable"} ${data.operator} ${
                data.operator === "exists" || data.operator === "not_exists"
                  ? ""
                  : `"${data.value}"`
              }`.trim(),
            })
            currentId = getNextNodeId(node.id, handle)
            break
          }
          case "buttons": {
            const data = node.data as ButtonsNodeData
            nextButtons = data.buttons
            waitingNodeId = node.id
            nextWaitingMode = "buttons"
            pushTrace(nextTrace, {
              level: "wait",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: "Waiting for button",
              detail: data.buttons.map((b) => b.label).join(" · "),
            })
            currentId = null
            break
          }
          case "choice": {
            const data = node.data as ChoiceNodeData
            if (data.prompt?.trim()) {
              const text = renderTemplate(data.prompt, vars)
              nextBubbles.push({
                id: createId("msg"),
                kind: "assistant",
                text,
                nodeId: node.id,
              })
            }
            nextButtons = data.choices ?? []
            waitingNodeId = node.id
            nextWaitingMode = "choice"
            pushTrace(nextTrace, {
              level: "wait",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: "Waiting for choice",
              detail: (data.choices ?? []).map((c) => c.label).join(" · "),
            })
            currentId = null
            break
          }
          case "capture": {
            const data = node.data as CaptureNodeData
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
              nodeType: node.type,
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
            const data = node.data as PromptNodeData & GenericNodeData
            const instructions =
              data.instructions ||
              data.description ||
              "Respond helpfully based on the conversation."
            const rendered = renderTemplate(instructions, vars)
            nextBubbles.push({
              id: createId("msg"),
              kind: "assistant",
              text: rendered,
              nodeId: node.id,
            })
            vars = {
              ...vars,
              lastAiResponse: rendered,
              ...(data.outputVariable
                ? { [data.outputVariable]: rendered }
                : {}),
            }
            pushTrace(nextTrace, {
              level: "ai",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: `${nodeTypeLabel(node.type)} reply (preview)`,
              detail: rendered.slice(0, 180),
              varsChanged: diffVars(beforeVars, vars),
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "kbSearch": {
            const data = node.data as KbSearchNodeData & GenericNodeData
            const query = renderTemplate(
              data.query ||
                vars.lastInput ||
                vars.lastUserMessage ||
                "knowledge query",
              vars
            )
            const answer = `Found knowledge for: ${query}`
            if (data.sendAsMessage !== false) {
              nextBubbles.push({
                id: createId("msg"),
                kind: "assistant",
                text: answer,
                nodeId: node.id,
              })
            }
            const key = data.outputVariable || "kbAnswer"
            vars = { ...vars, [key]: answer, lastAiResponse: answer }
            pushTrace(nextTrace, {
              level: "ai",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: "KB search (preview)",
              detail: `query="${query}" → ${key}`,
              varsChanged: diffVars(beforeVars, vars),
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "callForward": {
            const data = node.data as GenericNodeData
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
              nodeType: node.type,
              title: "Handoff to human",
              detail: text,
            })
            currentId = null
            break
          }
          case "component":
          case "carousel":
          case "tool":
          case "function":
          case "api":
          case "javascript":
          case "customAction": {
            const data = node.data as GenericNodeData
            pushTrace(nextTrace, {
              level: "warn",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: `${nodeTypeLabel(node.type)} stub`,
              detail:
                data.description ||
                "This step is a pass-through until the integration is wired.",
            })
            currentId = getNextNodeId(node.id)
            break
          }
          case "end": {
            const data = node.data as GenericNodeData
            const message = data.description?.trim()
            if (message) {
              nextBubbles.push({
                id: createId("msg"),
                kind: "assistant",
                text: message,
                nodeId: node.id,
              })
            }
            pushTrace(nextTrace, {
              level: "done",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: "Conversation ended",
              detail: message || undefined,
            })
            currentId = null
            break
          }
          default: {
            pushTrace(nextTrace, {
              level: "warn",
              step: steps,
              nodeId: node.id,
              nodeType: node.type,
              title: `Skipped unsupported "${node.type}"`,
            })
            currentId = getNextNodeId(node.id)
            break
          }
        }
      }

      const ended = !waitingNodeId
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
        activeNodeId: waitingNodeId ?? activeNodeId,
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
    setWaitingMode(result.waitingMode)
    setDraftInput("")
    setStatus(
      result.ended ? "ended" : result.waitingNodeId ? "waiting" : "running"
    )
    onActiveNodeChange?.({
      activeNodeId: result.activeNodeId,
      waitingNodeId: result.waitingNodeId,
    })
  }

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

    setTab("chat")
    applyResult(executeFrom(startNode.id, {}, [], []))
  }, [edges, executeFrom, freezeGraph, nodes, onActiveNodeChange])

  startRunRef.current = startRun

  useEffect(() => {
    if (!autoStartKey) return
    if (lastAutoStartKeyRef.current === autoStartKey) return
    lastAutoStartKeyRef.current = autoStartKey

    const timer = window.setTimeout(() => {
      startRunRef.current()
      onAutoStartCompleteRef.current?.()
    }, 280)

    return () => window.clearTimeout(timer)
  }, [autoStartKey])

  useEffect(() => {
    const el = tab === "trace" ? traceRef.current : bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [bubbles, trace, tab, pendingButtons])

  const resetRun = () => {
    setStatus("idle")
    setBubbles([])
    setTrace([])
    setVariables({})
    setPendingButtons(null)
    setPendingNodeId(null)
    setWaitingMode(null)
    setDraftInput("")
    clearFrozenGraph()
    onActiveNodeChange?.({ activeNodeId: null, waitingNodeId: null })
  }

  const handleButton = (buttonId: string) => {
    if (!pendingNodeId) return
    const button = pendingButtons?.find((entry) => entry.id === buttonId) ?? null
    const label = button?.label ?? buttonId
    const nextVars: RuntimeVariables = {
      ...variables,
      lastButtonId: buttonId,
      lastButtonLabel: label,
      lastInput: label,
      lastUserMessage: label,
    }

    if (waitingMode === "choice") {
      const data = nodeMap.get(pendingNodeId)?.data as ChoiceNodeData | undefined
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
    if (waitingMode !== "capture" && waitingMode !== "choice") return

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
        setTab("chat")
        return
      }
      handleButton(match.id)
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

    const nextId = getNextNodeId(pendingNodeId)
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
      setTab("trace")
      return
    }

    applyResult(
      executeFrom(
        nextId,
        nextVars,
        withUser,
        withTrace,
        withTrace.filter((t) => t.level === "step").length
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
    (waitingMode === "capture" || waitingMode === "choice")
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
            : "Waiting for button"
        : status === "ended"
          ? "Ended"
          : "Running"

  return (
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
            onClick={copyTrace}
            title={copied ? "Copied" : "Copy trace"}
            aria-label="Copy trace"
            disabled={trace.length === 0}
          >
            <RunnerIcon name="copy" />
          </button>
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

      <div className="run-tabs" role="tablist" aria-label="Run views">
        {(
          [
            ["chat", "Chat"],
            ["trace", `Trace${trace.length ? ` (${trace.length})` : ""}`],
            ["vars", `Vars${variableEntries.length ? ` (${variableEntries.length})` : ""}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`run-tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="chat-runner-body" ref={bodyRef}>
          {bubbles.length === 0 && status === "idle" ? (
            <div className="chat-empty-state">
              <strong>Preview the conversation</strong>
              <p>
                Run the published path locally. Trace and variables update as
                each step executes.
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
                ) : (
                  <article key={item.id} className="chat-card-message">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.alt || item.title || "Workflow card"}
                      />
                    )}
                    <div className="chat-card-content">
                      <h3>{item.title}</h3>
                      {item.text && (
                        <div
                          className="chat-card-description"
                          dangerouslySetInnerHTML={{ __html: item.text }}
                        />
                      )}
                      {item.buttons && item.buttons.length > 0 && (
                        <div className="chat-card-buttons">
                          {item.buttons.map((button) => (
                            <button
                              key={button.id}
                              type="button"
                              onClick={() => handleButton(button.id)}
                              disabled={
                                status !== "waiting" ||
                                pendingNodeId !== item.nodeId
                              }
                            >
                              {button.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                )
              )}

              {pendingButtons &&
                pendingButtons.length > 0 &&
                pendingButtonOwnerType !== "card" && (
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
      )}

      {tab === "trace" && (
        <div className="run-trace-body" ref={traceRef}>
          {trace.length === 0 ? (
            <div className="chat-empty-state">
              <strong>No trace yet</strong>
              <p>Start a run to see every step, branch, wait, and variable write.</p>
            </div>
          ) : (
            <ol className="run-trace-list">
              {trace.map((event) => (
                <li
                  key={event.id}
                  className={`run-trace-item level-${event.level}`}
                >
                  <div className="run-trace-meta">
                    <span className="run-trace-time">{formatTime(event.at)}</span>
                    {event.step != null && (
                      <span className="run-trace-step">#{event.step}</span>
                    )}
                    {event.nodeType && (
                      <span className="run-trace-type">
                        {nodeTypeLabel(event.nodeType)}
                      </span>
                    )}
                  </div>
                  <div className="run-trace-title">{event.title}</div>
                  {event.detail && (
                    <div className="run-trace-detail">{event.detail}</div>
                  )}
                  {event.varsChanged && (
                    <div className="run-trace-vars">
                      {Object.entries(event.varsChanged).map(([key, value]) => (
                        <span key={key} className="run-var-chip">
                          <em>{key}</em>
                          {value || "∅"}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === "vars" && (
        <div className="run-vars-body">
          {variableEntries.length === 0 ? (
            <div className="chat-empty-state">
              <strong>No variables yet</strong>
              <p>
                Capture, choice, set, and AI steps populate this table during a
                run.
              </p>
            </div>
          ) : (
            <table className="run-vars-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {variableEntries.map(([key, value]) => (
                  <tr key={key}>
                    <td>
                      <code>{key}</code>
                    </td>
                    <td>{value || <span className="muted">empty</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
          <button className="chat-start-button" type="button" onClick={startRun}>
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
  )
}

export default RunPanel
