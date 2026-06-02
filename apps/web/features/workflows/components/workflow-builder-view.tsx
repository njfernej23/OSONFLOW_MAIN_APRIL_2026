"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  useStore,
  type Connection,
  type ConnectionLineComponentProps,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeDragHandler,
  type NodeMouseHandler,
  type OnConnectEnd,
  type OnConnectStart,
  type ReactFlowInstance,
  type FitViewOptions,
  type Viewport,
} from "reactflow"
import "reactflow/dist/style.css"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { toast } from "sonner"
import {
  WORKFLOW_SCHEMA_VERSION,
  type BlockColor,
  type ButtonOption,
  type ButtonsNodeData,
  type CardNodeData,
  type ConditionNodeData,
  type GenericNodeData,
  type ImageNodeData,
  type MessageNodeData,
  type NodeData,
  type NodeType,
  type SetVariableNodeData,
  type WorkflowDefinition,
  type WorkflowEdgeData,
} from "../lib/types"
import StartNode from "../nodes/StartNode"
import MessageNode from "../nodes/MessageNode"
import ImageNode from "../nodes/ImageNode"
import CardNode from "../nodes/CardNode"
import ButtonsNode from "../nodes/ButtonsNode"
import SetVariableNode from "../nodes/SetVariableNode"
import ConditionNode from "../nodes/ConditionNode"
import GenericStepNode from "../nodes/GenericStepNode"
import { NodeRenameContext } from "../nodes/NodeRenameContext"
import RunPanel from "./run-panel"

type WorkflowSummary = {
  id: Id<"workflows">
  name: string
  description: string | null
  updatedAt: number
  isActive?: boolean
  publishedAt?: number | null
}

type WorkflowRecord = WorkflowSummary & {
  definition: WorkflowDefinition
  publishedDefinition?: WorkflowDefinition | null
  createdAt: number
  updatedBy?: string
  publishedBy?: string | null
}

type WorkflowPresenceMember = {
  userId: string
  name: string
  initials: string
  imageUrl?: string
  color: string
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
  isSelf: boolean
}

type RemoteCursor = {
  userId: string
  name: string
  initials: string
  color: string
  x: number
  y: number
}

type OrganizationCollaborator = {
  id: string
  name: string
  initials: string
  identifier: string
  role: string
  isActive: boolean
}

type WorkflowNode = Node<NodeData>
type WorkflowEdge = Edge<WorkflowEdgeData>
type DefinitionNode = WorkflowDefinition["nodes"][number]
type DefinitionEdge = WorkflowDefinition["edges"][number]
type JsonRecord = Record<string, unknown>
type CategoryId = "agent" | "talk" | "listen" | "logic" | "dev"
type ConnectCategoryId = CategoryId | "actions"
type DrawerMode = "run" | "library" | "settings" | null
type MessageFormat = "bold" | "italic" | "underline" | "strike" | "link"
type CanvasNavigationMode = "trackpad" | "mouse"

type MessageEditorInputProps = {
  nodeId: string
  value: string
  placeholder: string
  ariaLabel: string
  onSync: (nodeId: string, html: string) => void
}

type NodeActionMenuState = {
  nodeId: string
  x: number
  y: number
  colorOpen: boolean
  renaming: boolean
  renameValue: string
}

type CanvasActionMenuState = {
  x: number
  y: number
  flowPosition: { x: number; y: number }
}

const DEFAULT_CANVAS_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 0.88 }
const WORKFLOW_FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.45,
  maxZoom: 0.88,
}
const CANVAS_DOT_GAP = 28
const CANVAS_DOT_SIZE = 2.8
const CANVAS_DOT_COLOR = "rgba(91, 111, 123, 0.19)"
const CONNECT_MENU_WIDTH = 246
const CONNECT_SUBMENU_WIDTH = 228
const CONNECT_MENU_GAP = 10
const CONNECT_MENU_HEIGHT = 292
const CONNECT_MENU_PLUS_CENTER_OFFSET = { x: -3, y: 1 }

type EdgeActionMenuState = {
  edgeId: string
  x: number
  y: number
  colorOpen: boolean
  labeling: boolean
  labelValue: string
}

type PendingConnection = {
  source: string
  sourceHandle: string | null
  sourceScreenPoint?: { x: number; y: number }
}

type ConnectActionMenuState = PendingConnection & {
  x: number
  y: number
  sourceFlowPoint: { x: number; y: number }
  activeCategory: ConnectCategoryId | null
}

type CardButtonEditorState = {
  nodeId: string
  buttonId: string
}

type StepOption = {
  type: NodeType
  label: string
  description: string
  category: CategoryId
  icon: IconName
}

type Category = {
  id: CategoryId
  label: string
  icon: IconName
  steps: StepOption[]
}

type ConnectStepOption = Pick<
  StepOption,
  "type" | "label" | "description" | "icon"
>

type ConnectCategory = {
  id: ConnectCategoryId
  label: string
  icon?: IconName
  steps: ConnectStepOption[]
}

type IconName =
  | "agent"
  | "talk"
  | "listen"
  | "logic"
  | "dev"
  | "message"
  | "prompt"
  | "image"
  | "card"
  | "carousel"
  | "buttons"
  | "choice"
  | "capture"
  | "condition"
  | "set"
  | "component"
  | "end"
  | "tool"
  | "function"
  | "api"
  | "javascript"
  | "kb"
  | "call"
  | "custom"
  | "plus"
  | "play"
  | "publish"
  | "library"
  | "navigation"
  | "fit"
  | "close"
  | "chevronRight"
  | "link"
  | "settings"
  | "workflow"
  | "crew"
  | "operator"
  | "lineText"
  | "trash"
  | "palette"
  | "check"
  | "more"

const genericNodeTypes = {
  playbook: GenericStepNode,
  agent: GenericStepNode,
  crew: GenericStepNode,
  operator: GenericStepNode,
  prompt: GenericStepNode,
  carousel: GenericStepNode,
  choice: GenericStepNode,
  capture: GenericStepNode,
  component: GenericStepNode,
  end: GenericStepNode,
  tool: GenericStepNode,
  function: GenericStepNode,
  api: GenericStepNode,
  javascript: GenericStepNode,
  kbSearch: GenericStepNode,
  callForward: GenericStepNode,
  customAction: GenericStepNode,
}

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  image: ImageNode,
  card: CardNode,
  buttons: ButtonsNode,
  setVariable: SetVariableNode,
  condition: ConditionNode,
  ...genericNodeTypes,
}

const getNodeBounds = (node?: Node | null) => {
  if (!node) {
    return null
  }

  const width = node.width ?? 156
  const height = node.height ?? 56
  const position = node.positionAbsolute ?? node.position

  return {
    x: position.x,
    y: position.y,
    width,
    height,
    centerX: position.x + width / 2,
    centerY: position.y + height / 2,
  }
}

const getEstimatedNodeSize = (type: NodeType | null | undefined) => {
  switch (type) {
    case "start":
      return { width: 148, height: 56 }
    case "message":
      return { width: 320, height: 126 }
    case "image":
      return { width: 336, height: 126 }
    case "card":
      return { width: 336, height: 154 }
    default:
      return { width: 300, height: 126 }
  }
}

const getNodePositionForTargetPoint = (
  type: NodeType,
  targetPoint: { x: number; y: number },
  sourceIsLeftOfTarget: boolean
) => {
  const size = getEstimatedNodeSize(type)

  return {
    x: sourceIsLeftOfTarget ? targetPoint.x : targetPoint.x - size.width,
    y: targetPoint.y - size.height / 2,
  }
}

const buildEdgeStyle = (color = DEFAULT_EDGE_COLOR): CSSProperties => ({
  stroke: color,
  strokeWidth: 2,
})

const buildInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return "??"
  }

  if (parts.length === 1) {
    return (parts[0] ?? "").slice(0, 2).toUpperCase()
  }

  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase()
}

const createWorkflowEdge = (
  edge: {
    id?: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  },
  data?: Partial<WorkflowEdgeData>
): WorkflowEdge => {
  const color = data?.color ?? DEFAULT_EDGE_COLOR

  return {
    ...edge,
    id: edge.id ?? createId("edge"),
    type: "workflow",
    animated: true,
    data: {
      color,
      label: data?.label,
    },
    style: buildEdgeStyle(color),
  }
}

const SmartWorkflowEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  interactionWidth,
  data,
  style,
  selected,
}: EdgeProps<WorkflowEdgeData>) => {
  const sourceNode = useStore((store) => store.nodeInternals.get(source))
  const targetNode = useStore((store) => store.nodeInternals.get(target))
  const sourceBounds = getNodeBounds(sourceNode)
  const targetBounds = getNodeBounds(targetNode)

  const sourceIsLeftOfTarget =
    sourceBounds && targetBounds
      ? sourceBounds.centerX <= targetBounds.centerX
      : true
  const nextSourcePosition = sourceBounds
    ? sourceIsLeftOfTarget
      ? Position.Right
      : Position.Left
    : sourcePosition
  const nextTargetPosition = targetBounds
    ? sourceIsLeftOfTarget
      ? Position.Left
      : Position.Right
    : targetPosition
  const nextSourceX = sourceBounds
    ? sourceIsLeftOfTarget
      ? sourceBounds.x + sourceBounds.width
      : sourceBounds.x
    : sourceX
  const nextTargetX = targetBounds
    ? sourceIsLeftOfTarget
      ? targetBounds.x
      : targetBounds.x + targetBounds.width
    : targetX

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: nextSourceX,
    sourceY,
    sourcePosition: nextSourcePosition,
    targetX: nextTargetX,
    targetY,
    targetPosition: nextTargetPosition,
    borderRadius: 16,
  })
  const color = data?.color ?? DEFAULT_EDGE_COLOR

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
        style={{
          ...style,
          stroke: color,
          strokeWidth: selected ? 3 : 2,
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={
              {
                "--edge-color": color,
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              } as CSSProperties
            }
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const edgeTypes = {
  workflow: SmartWorkflowEdge,
}

const DynamicConnectionLine = ({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  connectionLineStyle,
  fromNode,
}: ConnectionLineComponentProps) => {
  const sourceBounds = getNodeBounds(fromNode)
  const shouldShowFromLeft = sourceBounds
    ? toX < sourceBounds.centerX
    : fromPosition === Position.Left
  const sourcePosition = shouldShowFromLeft ? Position.Left : Position.Right
  const sourceX = sourceBounds
    ? shouldShowFromLeft
      ? sourceBounds.x
      : sourceBounds.x + sourceBounds.width
    : fromX
  const targetPosition =
    sourcePosition === Position.Left ? Position.Right : Position.Left
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY: fromY,
    sourcePosition,
    targetX: toX,
    targetY: toY,
    targetPosition,
    borderRadius: 16,
  })

  return (
    <path
      className="react-flow__connection-path"
      d={path}
      fill="none"
      style={connectionLineStyle}
    />
  )
}

const MessageEditorInput = ({
  nodeId,
  value,
  placeholder,
  ariaLabel,
  onSync,
}: MessageEditorInputProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const previousNodeIdRef = useRef(nodeId)

  useLayoutEffect(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const nextHtml = value || ""
    const nodeChanged = previousNodeIdRef.current !== nodeId
    const editorFocused = document.activeElement === editor

    if (nodeChanged || (!editorFocused && editor.innerHTML !== nextHtml)) {
      editor.innerHTML = nextHtml
    }

    previousNodeIdRef.current = nodeId
  }, [nodeId, value])

  const handleInput = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const editor = event.currentTarget
      const isEmpty = editor.textContent?.trim().length === 0
      const html = isEmpty ? "" : editor.innerHTML

      editor.dir = "ltr"
      onSync(nodeId, html)
    },
    [nodeId, onSync]
  )

  return (
    <div
      ref={editorRef}
      className="message-editor-input"
      contentEditable
      dir="ltr"
      lang="en"
      data-empty={!value}
      data-placeholder={placeholder}
      role="textbox"
      aria-label={ariaLabel}
      style={{
        direction: "ltr",
        textAlign: "left",
        unicodeBidi: "isolate",
      }}
      suppressContentEditableWarning
      onInput={handleInput}
    />
  )
}

const colorOptions: Array<{ value: BlockColor; label: string; hex: string }> = [
  { value: "default", label: "Default", hex: "#d5dfe1" },
  { value: "blue", label: "Blue", hex: "#4385f5" },
  { value: "green", label: "Green", hex: "#4d8d35" },
  { value: "orange", label: "Orange", hex: "#e4a62f" },
  { value: "purple", label: "Purple", hex: "#9b5bd5" },
  { value: "rose", label: "Rose", hex: "#bd4d68" },
]

const DEFAULT_EDGE_COLOR = "#395064"

const edgeColorOptions: Array<{ value: string; label: string; hex: string }> = [
  { value: DEFAULT_EDGE_COLOR, label: "Default", hex: DEFAULT_EDGE_COLOR },
  { value: "#3f73f6", label: "Blue", hex: "#3f73f6" },
  { value: "#2f946f", label: "Green", hex: "#2f946f" },
  { value: "#d69526", label: "Orange", hex: "#d69526" },
  { value: "#a855c5", label: "Purple", hex: "#a855c5" },
  { value: "#c44865", label: "Rose", hex: "#c44865" },
]

const stepsByCategory: Category[] = [
  {
    id: "agent",
    label: "Agent",
    icon: "agent",
    steps: [
      {
        type: "playbook",
        label: "Playbook",
        description: "Hand off to an agentic playbook with exit paths.",
        category: "agent",
        icon: "workflow",
      },
      {
        type: "agent",
        label: "Agent",
        description: "Return control to the top-level agent.",
        category: "agent",
        icon: "agent",
      },
      {
        type: "crew",
        label: "Crew",
        description: "Coordinate multiple AI workers mid-flow.",
        category: "agent",
        icon: "crew",
      },
      {
        type: "operator",
        label: "Operator",
        description: "Run an AI operator inside deterministic logic.",
        category: "agent",
        icon: "operator",
      },
    ],
  },
  {
    id: "talk",
    label: "Talk",
    icon: "talk",
    steps: [
      {
        type: "message",
        label: "Message",
        description: "Send a scripted message.",
        category: "talk",
        icon: "message",
      },
      {
        type: "prompt",
        label: "Prompt",
        description: "Generate one response with AI.",
        category: "talk",
        icon: "prompt",
      },
      {
        type: "image",
        label: "Image",
        description: "Send an image in chat.",
        category: "talk",
        icon: "image",
      },
      {
        type: "card",
        label: "Card",
        description: "Show an image, text, and buttons.",
        category: "talk",
        icon: "card",
      },
      {
        type: "carousel",
        label: "Carousel",
        description: "Show multiple scrollable cards.",
        category: "talk",
        icon: "carousel",
      },
    ],
  },
  {
    id: "listen",
    label: "Listen",
    icon: "listen",
    steps: [
      {
        type: "buttons",
        label: "Buttons",
        description: "Branch with clickable choices.",
        category: "listen",
        icon: "buttons",
      },
      {
        type: "choice",
        label: "Choice",
        description: "Route by matched user choice.",
        category: "listen",
        icon: "choice",
      },
      {
        type: "capture",
        label: "Capture",
        description: "Save the user reply to a variable.",
        category: "listen",
        icon: "capture",
      },
    ],
  },
  {
    id: "logic",
    label: "Logic",
    icon: "logic",
    steps: [
      {
        type: "condition",
        label: "Condition",
        description: "Route by variable conditions.",
        category: "logic",
        icon: "condition",
      },
      {
        type: "setVariable",
        label: "Set",
        description: "Set or update variables.",
        category: "logic",
        icon: "set",
      },
      {
        type: "component",
        label: "Component",
        description: "Reuse a component inside the flow.",
        category: "logic",
        icon: "component",
      },
      {
        type: "end",
        label: "End",
        description: "End the conversation.",
        category: "logic",
        icon: "end",
      },
    ],
  },
  {
    id: "dev",
    label: "Dev",
    icon: "dev",
    steps: [
      {
        type: "tool",
        label: "Tool",
        description: "Run an integration or MCP tool.",
        category: "dev",
        icon: "tool",
      },
      {
        type: "function",
        label: "Function",
        description: "Execute a reusable function tool.",
        category: "dev",
        icon: "function",
      },
      {
        type: "api",
        label: "API",
        description: "Make an HTTP request.",
        category: "dev",
        icon: "api",
      },
      {
        type: "javascript",
        label: "JavaScript",
        description: "Run a JavaScript snippet.",
        category: "dev",
        icon: "javascript",
      },
      {
        type: "kbSearch",
        label: "KB search",
        description: "Query the knowledge base.",
        category: "dev",
        icon: "kb",
      },
      {
        type: "callForward",
        label: "Call forward",
        description: "Transfer a phone call.",
        category: "dev",
        icon: "call",
      },
      {
        type: "customAction",
        label: "Custom action",
        description: "Emit a custom action trace.",
        category: "dev",
        icon: "custom",
      },
    ],
  },
]

const connectCategories: ConnectCategory[] = [
  ...stepsByCategory,
  {
    id: "actions",
    label: "Actions",
    steps: [
      {
        type: "customAction",
        label: "Custom action",
        description: "Emit a custom action trace.",
        icon: "custom",
      },
      {
        type: "component",
        label: "Component",
        description: "Reuse a component inside the flow.",
        icon: "component",
      },
      {
        type: "end",
        label: "End",
        description: "End the conversation.",
        icon: "end",
      },
    ],
  },
]

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`

const createButton = (label: string): ButtonOption => ({
  id: createId("btn"),
  label,
})

const createStarterGraph = () => {
  const nodes: WorkflowNode[] = [
    {
      id: "start",
      type: "start",
      position: { x: 420, y: 260 },
      data: { label: "Start" },
    },
  ]

  return { nodes, edges: [] as WorkflowEdge[] }
}

const initialGraph = createStarterGraph()

const getStepOption = (type: NodeType) =>
  stepsByCategory
    .flatMap((category) => category.steps)
    .find((step) => step.type === type)

const getAccent = (type: NodeType): GenericNodeData["accent"] => {
  if (type === "start") {
    return "system"
  }

  return getStepOption(type)?.category ?? "system"
}

const createNodeData = (type: NodeType): NodeData => {
  switch (type) {
    case "start":
      return { label: "Start" }
    case "message":
      return { label: "Message", text: "" }
    case "image":
      return { label: "Image", source: "upload", url: "", alt: "" }
    case "card":
      return {
        label: "Card",
        source: "upload",
        url: "",
        alt: "",
        title: "",
        description: "",
        buttons: [],
      }
    case "buttons":
      return {
        label: "Buttons",
        buttons: [createButton("I agree"), createButton("I don't agree")],
      }
    case "setVariable":
      return { label: "Set Variable", key: "variable", value: "value" }
    case "condition":
      return {
        label: "Condition",
        key: "variable",
        operator: "equals",
        value: "value",
      }
    case "end":
      return {
        label: "End",
        description: "Conversation ended.",
        accent: "logic",
      }
    default: {
      const step = getStepOption(type)
      return {
        label: step?.label ?? "Step",
        description: step?.description,
        accent: getAccent(type),
      }
    }
  }
}

const cloneNodeData = (data: NodeData): NodeData => {
  const copy = JSON.parse(JSON.stringify(data)) as NodeData

  if ("buttons" in copy) {
    return {
      ...copy,
      buttons: copy.buttons.map((button) => ({
        ...button,
        id: createId("btn"),
      })),
    }
  }

  return copy
}

const getNodeDisplayName = (node: WorkflowNode) =>
  node.data.customName ?? node.data.label

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null

  return Boolean(
    element &&
    (element.isContentEditable ||
      element.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

const cloneWorkflowDefinition = (
  definition: WorkflowDefinition
): WorkflowDefinition =>
  JSON.parse(JSON.stringify(definition)) as WorkflowDefinition

const isJsonRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeJsonForCompare = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonForCompare)
  }

  if (!isJsonRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, normalizeJsonForCompare(value[key])])
  )
}

const stableSerialize = (value: unknown) =>
  JSON.stringify(normalizeJsonForCompare(value))

const valuesEqual = (a: unknown, b: unknown) =>
  stableSerialize(a) === stableSerialize(b)

const definitionsEqual = (a: WorkflowDefinition, b: WorkflowDefinition) =>
  valuesEqual(a, b)

const mergeRecordFields = (
  base: JsonRecord,
  local: JsonRecord,
  remote: JsonRecord
) => {
  const next: JsonRecord = { ...remote }
  const keys = new Set([...Object.keys(base), ...Object.keys(local)])

  for (const key of keys) {
    if (!valuesEqual(local[key], base[key])) {
      if (local[key] === undefined) {
        delete next[key]
      } else {
        next[key] = local[key]
      }
    }
  }

  return next
}

const mergeStructuredValue = (
  base: unknown,
  local: unknown,
  remote: unknown
) => {
  if (isJsonRecord(base) && isJsonRecord(local) && isJsonRecord(remote)) {
    return mergeRecordFields(base, local, remote)
  }

  return valuesEqual(local, base) ? remote : local
}

const mergeDefinitionNode = (
  base: DefinitionNode,
  local: DefinitionNode,
  remote: DefinitionNode
): DefinitionNode => {
  const merged = mergeRecordFields(
    base as unknown as JsonRecord,
    local as unknown as JsonRecord,
    remote as unknown as JsonRecord
  ) as unknown as DefinitionNode

  merged.id = local.id

  if (
    isJsonRecord(base.data) &&
    isJsonRecord(local.data) &&
    isJsonRecord(remote.data)
  ) {
    merged.data = mergeRecordFields(
      base.data as unknown as JsonRecord,
      local.data as unknown as JsonRecord,
      remote.data as unknown as JsonRecord
    ) as NodeData
  }

  return merged
}

const mergeDefinitionEdge = (
  base: DefinitionEdge,
  local: DefinitionEdge,
  remote: DefinitionEdge
): DefinitionEdge => {
  const merged = mergeRecordFields(
    base as unknown as JsonRecord,
    local as unknown as JsonRecord,
    remote as unknown as JsonRecord
  ) as unknown as DefinitionEdge
  const data = mergeStructuredValue(
    base.data ?? null,
    local.data ?? null,
    remote.data ?? null
  )

  merged.id = local.id
  merged.data = data as WorkflowEdgeData | null

  return merged
}

const mapById = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]))

const mergeDefinitionItems = <T extends { id: string }>(
  baseItems: T[],
  localItems: T[],
  remoteItems: T[],
  mergeItem: (base: T, local: T, remote: T) => T
) => {
  const baseById = mapById(baseItems)
  const localById = mapById(localItems)
  const remoteById = mapById(remoteItems)
  const orderedIds = Array.from(
    new Set([
      ...remoteItems.map((item) => item.id),
      ...localItems.map((item) => item.id),
    ])
  )
  const merged: T[] = []

  for (const id of orderedIds) {
    const baseItem = baseById.get(id)
    const localItem = localById.get(id)
    const remoteItem = remoteById.get(id)

    if (!localItem) {
      if (!baseItem && remoteItem) {
        merged.push(remoteItem)
      }
      continue
    }

    if (!remoteItem) {
      if (!baseItem) {
        merged.push(localItem)
      }
      continue
    }

    if (!baseItem) {
      merged.push(localItem)
      continue
    }

    const localChanged = !valuesEqual(localItem, baseItem)
    const remoteChanged = !valuesEqual(remoteItem, baseItem)

    if (localChanged && remoteChanged) {
      merged.push(mergeItem(baseItem, localItem, remoteItem))
    } else {
      merged.push(localChanged ? localItem : remoteItem)
    }
  }

  return merged
}

const removeDanglingEdges = (
  edges: DefinitionEdge[],
  nodes: DefinitionNode[]
) => {
  const nodeIds = new Set(nodes.map((node) => node.id))

  return edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
}

const mergeWorkflowDefinitions = (
  base: WorkflowDefinition,
  local: WorkflowDefinition,
  remote: WorkflowDefinition
): WorkflowDefinition => {
  const description = !valuesEqual(
    local.description ?? null,
    base.description ?? null
  )
    ? local.description
    : remote.description
  const nodes = mergeDefinitionItems(
    base.nodes,
    local.nodes,
    remote.nodes,
    mergeDefinitionNode
  )
  const edges = removeDanglingEdges(
    mergeDefinitionItems(
      base.edges,
      local.edges,
      remote.edges,
      mergeDefinitionEdge
    ),
    nodes
  )

  const merged: WorkflowDefinition = {
    schemaVersion:
      local.schemaVersion || remote.schemaVersion || base.schemaVersion,
    id: local.id ?? remote.id ?? base.id,
    name: !valuesEqual(local.name, base.name) ? local.name : remote.name,
    nodes,
    edges,
  }

  if (description) {
    merged.description = description
  }

  return cloneWorkflowDefinition(merged)
}

const normalizeLoadedWorkflowDefinition = (
  workflow: WorkflowRecord
): WorkflowDefinition => {
  const definition = cloneWorkflowDefinition(workflow.definition)

  definition.id = workflow.id
  definition.name = workflow.name
  definition.nodes = Array.isArray(definition.nodes) ? definition.nodes : []
  definition.edges = Array.isArray(definition.edges) ? definition.edges : []

  if (workflow.description) {
    definition.description = workflow.description
  } else {
    delete definition.description
  }

  return definition
}

const nodesFromDefinition = (definition: WorkflowDefinition): WorkflowNode[] =>
  definition.nodes.map((node) => ({
    ...node,
    type: node.type,
    data: node.data,
  }))

const edgesFromDefinition = (definition: WorkflowDefinition): WorkflowEdge[] =>
  definition.edges.map((edge) =>
    createWorkflowEdge(
      {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      },
      edge.data ?? undefined
    )
  )

const getPointerClientPoint = (
  event: MouseEvent | PointerEvent | TouchEvent
) => {
  if ("changedTouches" in event && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0]

    if (!touch) {
      return { x: 0, y: 0 }
    }

    return {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  return {
    x: (event as MouseEvent | PointerEvent).clientX,
    y: (event as MouseEvent | PointerEvent).clientY,
  }
}

const connectReleaseBlockerSelector = [
  ".top-actions",
  ".bottom-tools",
  ".category-rail",
  ".step-popover",
  ".canvas-navigation-panel",
  ".node-action-menu",
  ".fit-button",
  ".collaboration-strip",
].join(", ")

const isConnectReleaseBlocked = (target: Element | null) =>
  Boolean(target?.closest(connectReleaseBlockerSelector))

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

const isPointInsideElement = (
  point: { x: number; y: number },
  element: HTMLElement
) => {
  const rect = element.getBoundingClientRect()

  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  )
}

const getSourceHandleScreenPoint = (
  root: HTMLElement | null,
  sourceId: string,
  sourceHandle: string | null
) => {
  if (!root) {
    return null
  }

  const sourceElement =
    Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node")).find(
      (element) => element.getAttribute("data-id") === sourceId
    ) ?? null

  if (!sourceElement) {
    return null
  }

  const sourceHandles = Array.from(
    sourceElement.querySelectorAll<HTMLElement>(".react-flow__handle")
  ).filter(
    (handle) =>
      handle.classList.contains("source") ||
      handle.classList.contains("react-flow__handle-right") ||
      handle.getAttribute("data-handlepos") === "right"
  )
  const matchedHandle = sourceHandle
    ? sourceHandles.find(
        (handle) => handle.getAttribute("data-handleid") === sourceHandle
      )
    : null
  const defaultHandle =
    sourceHandles.find((handle) => !handle.getAttribute("data-handleid")) ??
    sourceHandles.find((handle) =>
      handle.classList.contains("react-flow__handle-right")
    ) ??
    sourceHandles[0]
  const handle = matchedHandle ?? defaultHandle

  if (!handle) {
    return null
  }

  const rect = handle.getBoundingClientRect()

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

const Icon = ({ name, size = 24 }: { name: IconName; size?: number }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (name) {
    case "agent":
      return (
        <svg {...common}>
          <rect x="6" y="5" width="12" height="8" rx="3" />
          <path d="M9 3v2m6-2v2M8 18c1.2-2 2.5-3 4-3s2.8 1 4 3" />
          <path d="M8 21c.6-1.2 1.3-2 2.1-2.4M16 21c-.6-1.2-1.3-2-2.1-2.4" />
          <path d="M10 9h.01M14 9h.01" />
        </svg>
      )
    case "talk":
      return (
        <svg {...common}>
          <path d="M5.5 16.5 4 21l4.2-1.8A8 8 0 1 0 5.5 16.5Z" />
          <path d="M15 6.5c1.5.6 2.5 1.7 3 3.2M11 5.2c1.1 0 2.1.2 3 .7" />
        </svg>
      )
    case "listen":
      return (
        <svg {...common}>
          <path d="M12 3 5 7v7c0 4 3.1 6.2 7 7 3.9-.8 7-3 7-7V7l-7-4Z" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M8 16c.9-1.7 2.2-2.5 4-2.5s3.1.8 4 2.5" />
        </svg>
      )
    case "logic":
      return (
        <svg {...common}>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="4"
            transform="rotate(45 12 12)"
          />
          <path d="m9 12-2 2 2 2M15 8l2 2-2 2M8 14h8" />
        </svg>
      )
    case "dev":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="4" />
          <path d="m10 9-2 3 2 3M14 9l2 3-2 3" />
          <path d="m13 8-2 8" />
        </svg>
      )
    case "message":
      return (
        <svg {...common}>
          <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H10l-4 4v-4.4A3.5 3.5 0 0 1 4 11.5v-5Z" />
          <path d="M8 8h.01M12 8h.01M16 8h.01" />
        </svg>
      )
    case "prompt":
      return (
        <svg {...common}>
          <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z" />
          <path d="m5 13 .7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13ZM19 13l.6 1.8L21 15.5l-1.4.7L19 18l-.6-1.8-1.4-.7 1.4-.7L19 13Z" />
        </svg>
      )
    case "image":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m7 17 4.2-4.2 2.8 2.8 1.4-1.4L18 17" />
        </svg>
      )
    case "card":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )
    case "carousel":
      return (
        <svg {...common}>
          <rect x="9" y="5" width="10" height="14" rx="2" />
          <path d="M5 7v10M2 9v6" />
        </svg>
      )
    case "buttons":
      return (
        <svg {...common}>
          <path d="M7 8a4 4 0 0 1 4-4h2a4 4 0 0 1 1.5 7.7L14 17l-3.4-4.7H11A4 4 0 0 1 7 8Z" />
          <path d="M7 12H5a3 3 0 0 0 0 6h6" />
        </svg>
      )
    case "choice":
      return (
        <svg {...common}>
          <path d="M6 17c5 0 3-10 8-10h3" />
          <path d="m15 4 3 3-3 3M6 7h3M14 17h3M15 14l3 3-3 3" />
        </svg>
      )
    case "capture":
      return (
        <svg {...common}>
          <path d="M4 9V7a3 3 0 0 1 3-3h2M15 4h2a3 3 0 0 1 3 3v2M20 15v2a3 3 0 0 1-3 3h-2M9 20H7a3 3 0 0 1-3-3v-2" />
          <path d="M9 12h.01M12 12h.01M15 12h.01" />
        </svg>
      )
    case "condition":
      return (
        <svg {...common}>
          <rect
            x="5"
            y="5"
            width="14"
            height="14"
            rx="3"
            transform="rotate(45 12 12)"
          />
          <path d="M9 12h6M9 9h6" />
        </svg>
      )
    case "set":
      return (
        <svg {...common}>
          <path d="M8 5H6a2 2 0 0 0-2 2v2M8 19H6a2 2 0 0 1-2-2v-2M16 5h2a2 2 0 0 1 2 2v2M16 19h2a2 2 0 0 0 2-2v-2" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      )
    case "component":
      return (
        <svg {...common}>
          <rect
            x="5"
            y="5"
            width="6"
            height="6"
            rx="1"
            transform="rotate(45 8 8)"
          />
          <rect
            x="13"
            y="5"
            width="6"
            height="6"
            rx="1"
            transform="rotate(45 16 8)"
          />
          <rect
            x="9"
            y="13"
            width="6"
            height="6"
            rx="1"
            transform="rotate(45 12 16)"
          />
        </svg>
      )
    case "end":
      return (
        <svg {...common}>
          <path d="M7 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M12 5v14M17 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />
        </svg>
      )
    case "tool":
      return (
        <svg {...common}>
          <path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />
        </svg>
      )
    case "function":
      return (
        <svg {...common}>
          <path d="M9 4c-3 1-3 5-1 6-2 1-2 5 1 6M15 4c3 1 3 5 1 6 2 1 2 5-1 6" />
          <path d="M11 12h2" />
        </svg>
      )
    case "api":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 7v4M12 11 6.4 17M12 11l5.6 6" />
        </svg>
      )
    case "javascript":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <path d="M9 9v5a2 2 0 0 1-2 2M13 16c2 0 3-.7 3-2s-1-2-3-2c-1.2 0-2-.5-2-1.5S12 9 14 9" />
        </svg>
      )
    case "kb":
      return (
        <svg {...common}>
          <path d="M12 4a5 5 0 0 0-4 8v3h8v-3a5 5 0 0 0-4-8Z" />
          <path d="M9 19h6M10 15v4M14 15v4M7 9H5M19 9h-2M8 4.5 6.5 3M16 4.5 17.5 3" />
        </svg>
      )
    case "call":
      return (
        <svg {...common}>
          <path d="M7 4h4L9.5 8C10.6 10.5 13.5 13.4 16 14.5L20 13v4c0 1.7-1.4 3-3.1 2.8C9.9 18.9 5.1 14.1 4.2 7.1 4 5.4 5.3 4 7 4Z" />
          <path d="M15 4h5v5M14 10l6-6" />
        </svg>
      )
    case "custom":
      return (
        <svg {...common}>
          <path d="M4 12h4l2-3 4 6 2-3h4M6 6a8 8 0 0 1 12 0M6 18a8 8 0 0 0 12 0" />
        </svg>
      )
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case "play":
      return (
        <svg {...common}>
          <path d="m8 5 11 7-11 7V5Z" />
        </svg>
      )
    case "publish":
      return (
        <svg {...common}>
          <path d="m13 2-3 9h5l-4 11 10-14h-6l3-6h-5Z" />
          <path d="M4 13h4M4 17h6" />
        </svg>
      )
    case "library":
      return (
        <svg {...common}>
          <path d="M4 5h12a4 4 0 0 1 4 4v10H8a4 4 0 0 1-4-4V5Z" />
          <path d="M8 9h8M8 13h6" />
        </svg>
      )
    case "fit":
      return (
        <svg {...common}>
          <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
          <path d="m9 9-5-5M15 9l5-5M15 15l5 5M9 15l-5 5" />
        </svg>
      )
    case "navigation":
      return (
        <svg {...common}>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          <path d="m8 7 4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
        </svg>
      )
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      )
    case "chevronRight":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )
    case "link":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.6 5.3" />
          <path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" />
        </svg>
      )
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.2.1-2-3 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3 .2.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.2-.1 2 3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3.4H20a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      )
    case "workflow":
      return (
        <svg {...common}>
          <path d="M6 5h8l4 4-4 4H6l4-4-4-4Z" />
          <path d="M6 19h12M12 13v6" />
        </svg>
      )
    case "crew":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <path d="M3.5 19c.8-3 2.3-4.5 4.5-4.5S11.7 16 12.5 19M11.5 19c.8-3 2.3-4.5 4.5-4.5S19.7 16 20.5 19" />
        </svg>
      )
    case "operator":
      return (
        <svg {...common}>
          <path d="M4 12h5l2-7 2 14 2-7h5" />
        </svg>
      )
    case "lineText":
      return (
        <svg {...common}>
          <path d="M4 7h10M4 17h16" />
          <path d="M17 7h4M19 7v8M17 15h4" />
        </svg>
      )
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M10 11v6M14 11v6" />
          <path d="M6 7l1 14h10l1-14M9 7V4h6v3" />
        </svg>
      )
    case "palette":
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A8.5 8.5 0 0 0 12 3Z" />
          <path d="M7.5 11h.01M9.5 7.5h.01M14 7.5h.01M16.5 11h.01" />
        </svg>
      )
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case "more":
      return (
        <svg {...common}>
          <path d="M5 12h.01M12 12h.01M19 12h.01" />
        </svg>
      )
  }
}

export const WorkflowBuilderView = ({
  initialWorkflowId,
}: {
  initialWorkflowId?: string
}) => {
  const { userId } = useAuth()
  const {
    organization,
    memberships: organizationMemberships,
    isLoaded: organizationIsLoaded,
  } = useOrganization({
    memberships: {
      pageSize: 24,
      keepPreviousData: true,
    },
  })
  const workflowList = useQuery(api.private.workflows.list) as
    | WorkflowSummary[]
    | undefined
  const saveWorkflow = useMutation(api.private.workflows.save)
  const publishWorkflow = useMutation(api.private.workflows.publish)
  const deactivateWorkflow = useMutation(api.private.workflows.deactivate)
  const syncLiveWorkflow = useMutation(api.private.workflows.syncLive)
  const heartbeatPresence = useMutation(api.private.workflows.heartbeatPresence)
  const movePresenceCursor = useMutation(
    api.private.workflows.movePresenceCursor
  )
  const builderShellRef = useRef<HTMLDivElement | null>(null)
  const lastCanvasPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastFlowCursorRef = useRef<{ x: number; y: number } | null>(null)
  const pendingConnectionRef = useRef<PendingConnection | null>(null)
  const suppressNextPaneClickRef = useRef(false)
  const suppressSelectionRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const hasLoadedWorkflowRef = useRef(false)
  const liveSyncTimerRef = useRef<number | null>(null)
  const liveSyncInFlightRef = useRef(false)
  const pendingLiveSyncRef = useRef(false)
  const flushLiveSyncRef = useRef<(() => void) | null>(null)
  const latestDefinitionRef = useRef<WorkflowDefinition | null>(null)
  const lastSyncedDefinitionRef = useRef<WorkflowDefinition | null>(null)
  const lastRemoteUpdatedAtRef = useRef(0)
  const lastCursorSentAtRef = useRef(0)
  const selectedNodeIdRef = useRef<string | null>(null)
  const categoryCloseTimerRef = useRef<number | null>(null)
  const runLaunchTimerRef = useRef<number | null>(null)
  const loadedWorkflowRef = useRef<string | null>(null)
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => initialGraph.nodes)
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => initialGraph.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState<Id<"workflows"> | null>(null)
  const [loadWorkflowId, setLoadWorkflowId] = useState<Id<"workflows"> | null>(
    (initialWorkflowId as Id<"workflows"> | undefined) ?? null
  )
  const [workflowName, setWorkflowName] = useState("New workflow")
  const [workflowDescription, setWorkflowDescription] = useState(
    "Route users through deterministic steps with agent handoffs where needed."
  )
  const [presenceNow, setPresenceNow] = useState(() => Date.now())
  const [status, setStatus] = useState<string>("Ready.")
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false)
  const [isPublishingWorkflow, setIsPublishingWorkflow] = useState(false)
  const [isDeactivatingWorkflow, setIsDeactivatingWorkflow] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [nodeMenu, setNodeMenu] = useState<NodeActionMenuState | null>(null)
  const [inspectorMenuOpen, setInspectorMenuOpen] = useState(false)
  const [navigationPanelOpen, setNavigationPanelOpen] = useState(false)
  const [collaboratorsPanelOpen, setCollaboratorsPanelOpen] = useState(false)
  const [canvasNavigationMode, setCanvasNavigationMode] =
    useState<CanvasNavigationMode>("mouse")
  const [cardButtonEditor, setCardButtonEditor] =
    useState<CardButtonEditorState | null>(null)
  const [canvasMenu, setCanvasMenu] = useState<CanvasActionMenuState | null>(
    null
  )
  const [edgeMenu, setEdgeMenu] = useState<EdgeActionMenuState | null>(null)
  const [connectMenu, setConnectMenu] = useState<ConnectActionMenuState | null>(
    null
  )
  const [copiedNode, setCopiedNode] = useState<WorkflowNode | null>(null)
  const [runLaunchKey, setRunLaunchKey] = useState(0)
  const [isRunLaunching, setIsRunLaunching] = useState(false)
  const [viewportVersion, setViewportVersion] = useState(0)
  const [canvasViewport, setCanvasViewport] = useState<Viewport>(
    DEFAULT_CANVAS_VIEWPORT
  )
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const [reactFlow, setReactFlow] = useState<ReactFlowInstance<
    WorkflowNode,
    WorkflowEdge
  > | null>(null)
  const loadedWorkflow = useQuery(
    api.private.workflows.get,
    loadWorkflowId ? { workflowId: loadWorkflowId } : "skip"
  ) as WorkflowRecord | null | undefined
  const presenceMembers = useQuery(
    api.private.workflows.listPresence,
    workflowId ? { workflowId, now: presenceNow } : "skip"
  ) as WorkflowPresenceMember[] | undefined
  const library = workflowList ?? []
  const currentWorkflowIsActive = Boolean(
    workflowId &&
    library.some((workflow) => workflow.id === workflowId && workflow.isActive)
  )
  const visiblePresenceMembers = (presenceMembers ?? []).slice(0, 3)
  const hiddenPresenceCount = Math.max(0, (presenceMembers?.length ?? 0) - 3)
  const activePresenceUserIds = useMemo(
    () => new Set((presenceMembers ?? []).map((member) => member.userId)),
    [presenceMembers]
  )
  const organizationCollaborators = useMemo<OrganizationCollaborator[]>(
    () =>
      (organizationMemberships?.data ?? []).map((membership) => {
        const user = membership.publicUserData
        const fullName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim()
        const name = fullName || user?.identifier || "Organization member"
        const identifier =
          user?.identifier && user.identifier !== name ? user.identifier : ""
        const id = user?.userId ?? membership.id

        return {
          id,
          name,
          initials: buildInitials(name),
          identifier,
          role: membership.roleName || membership.role,
          isActive: user?.userId
            ? activePresenceUserIds.has(user.userId)
            : false,
        }
      }),
    [activePresenceUserIds, organizationMemberships?.data]
  )
  const organizationMemberCount =
    organizationMemberships?.count ?? organizationCollaborators.length
  const isTrackpadNavigation = canvasNavigationMode === "trackpad"

  const activeCategoryConfig = useMemo(
    () =>
      activeCategory
        ? (stepsByCategory.find((category) => category.id === activeCategory) ??
          null)
        : null,
    [activeCategory]
  )
  const activeCategoryIndex = stepsByCategory.findIndex(
    (category) => category.id === activeCategory
  )
  const renderedNodeTypes = useMemo(() => nodeTypes, [])
  const renderedEdgeTypes = useMemo(() => edgeTypes, [])

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  const remoteSelectionByNodeId = useMemo(() => {
    const selections = new Map<string, WorkflowPresenceMember>()

    for (const member of presenceMembers ?? []) {
      if (
        !member.isSelf &&
        member.selectedNodeId &&
        !selections.has(member.selectedNodeId)
      ) {
        selections.set(member.selectedNodeId, member)
      }
    }

    return selections
  }, [presenceMembers])

  const renderedNodes = useMemo(() => {
    if (remoteSelectionByNodeId.size === 0) {
      return nodes
    }

    return nodes.map((node) => {
      const selection = remoteSelectionByNodeId.get(node.id)

      if (!selection) {
        return node
      }

      return {
        ...node,
        className: [node.className, "remote-selected-node"]
          .filter(Boolean)
          .join(" "),
        style: {
          ...node.style,
          "--remote-selection-color": selection.color,
        } as CSSProperties,
      }
    })
  }, [nodes, remoteSelectionByNodeId])

  const menuNode = useMemo(
    () => nodes.find((node) => node.id === nodeMenu?.nodeId) ?? null,
    [nodes, nodeMenu?.nodeId]
  )
  const menuEdge = useMemo(
    () => edges.find((edge) => edge.id === edgeMenu?.edgeId) ?? null,
    [edges, edgeMenu?.edgeId]
  )
  const activeConnectCategory = useMemo(
    () =>
      connectCategories.find(
        (category) => category.id === connectMenu?.activeCategory
      ) ?? null,
    [connectMenu?.activeCategory]
  )

  const clearCategoryCloseTimer = useCallback(() => {
    if (categoryCloseTimerRef.current !== null) {
      window.clearTimeout(categoryCloseTimerRef.current)
      categoryCloseTimerRef.current = null
    }
  }, [])

  const showCategory = useCallback(
    (categoryId: CategoryId) => {
      clearCategoryCloseTimer()
      setActiveCategory(categoryId)
    },
    [clearCategoryCloseTimer]
  )

  const scheduleCategoryClose = useCallback(() => {
    if (categoryCloseTimerRef.current !== null) {
      return
    }

    categoryCloseTimerRef.current = window.setTimeout(() => {
      setActiveCategory(null)
      categoryCloseTimerRef.current = null
    }, 90)
  }, [])

  useEffect(() => clearCategoryCloseTimer, [clearCategoryCloseTimer])

  useEffect(() => {
    if (!activeCategory) {
      return
    }

    const handlePalettePointerMove = (event: PointerEvent) => {
      const target = event.target as Element | null

      if (target?.closest(".category-rail, .step-popover")) {
        clearCategoryCloseTimer()
        return
      }

      scheduleCategoryClose()
    }

    window.addEventListener("pointermove", handlePalettePointerMove, true)

    return () => {
      window.removeEventListener("pointermove", handlePalettePointerMove, true)
    }
  }, [activeCategory, clearCategoryCloseTimer, scheduleCategoryClose])

  useEffect(() => {
    const shellRect = builderShellRef.current?.getBoundingClientRect()

    if (!reactFlow || !shellRect) {
      setRemoteCursors([])
      return
    }

    setRemoteCursors(
      (presenceMembers ?? [])
        .filter((member) => !member.isSelf && member.cursor)
        .map((member) => {
          const cursor = member.cursor ?? { x: 0, y: 0 }
          const screenPosition = reactFlow.flowToScreenPosition(cursor)

          return {
            userId: member.userId,
            name: member.name,
            initials: member.initials,
            color: member.color,
            x: screenPosition.x - shellRect.left,
            y: screenPosition.y - shellRect.top,
          }
        })
    )
  }, [presenceMembers, reactFlow, viewportVersion])

  const connectPreviewPath = useMemo(() => {
    if (!connectMenu) {
      return null
    }

    const sourcePoint = {
      x: connectMenu.sourceFlowPoint.x * canvasViewport.zoom + canvasViewport.x,
      y: connectMenu.sourceFlowPoint.y * canvasViewport.zoom + canvasViewport.y,
    }
    const targetPoint = {
      x: connectMenu.x + CONNECT_MENU_PLUS_CENTER_OFFSET.x,
      y: connectMenu.y + CONNECT_MENU_PLUS_CENTER_OFFSET.y,
    }
    const sourcePosition =
      targetPoint.x < sourcePoint.x ? Position.Left : Position.Right
    const targetPosition =
      sourcePosition === Position.Left ? Position.Right : Position.Left
    const [path] = getSmoothStepPath({
      sourceX: sourcePoint.x,
      sourceY: sourcePoint.y,
      sourcePosition,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
      targetPosition,
      borderRadius: 16,
    })

    return path
  }, [canvasViewport, connectMenu])

  useEffect(() => {
    return () => {
      if (runLaunchTimerRef.current !== null) {
        window.clearTimeout(runLaunchTimerRef.current)
      }
    }
  }, [])

  const clearSelectedNode = useCallback(() => {
    setSelectedNodeId(null)
    setNodes((next) => {
      let changed = false
      const cleared = next.map((node) => {
        if (!node.selected) {
          return node
        }

        changed = true
        return { ...node, selected: false }
      })

      return changed ? cleared : next
    })
  }, [])

  const openSelectedNode = useCallback((node: WorkflowNode) => {
    setSelectedNodeId(node.id)
    setNodes((next) => {
      let changed = false
      const selected = next.map((candidate) => {
        const shouldSelect = candidate.id === node.id

        if (candidate.selected === shouldSelect) {
          return candidate
        }

        changed = true
        return { ...candidate, selected: shouldSelect }
      })

      return changed ? selected : next
    })
  }, [])

  const handleRun = useCallback(() => {
    setDrawerMode("run")
    clearSelectedNode()
    setIsRunLaunching(true)
    setRunLaunchKey((current) => current + 1)
    setNodeMenu(null)
    setCanvasMenu(null)
    setEdgeMenu(null)
    setConnectMenu(null)

    if (runLaunchTimerRef.current !== null) {
      window.clearTimeout(runLaunchTimerRef.current)
    }

    runLaunchTimerRef.current = window.setTimeout(() => {
      setIsRunLaunching(false)
      runLaunchTimerRef.current = null
    }, 780)
  }, [clearSelectedNode])

  const completeRunLaunch = useCallback(() => {
    if (runLaunchTimerRef.current !== null) {
      window.clearTimeout(runLaunchTimerRef.current)
      runLaunchTimerRef.current = null
    }

    setIsRunLaunching(false)
  }, [])

  const focusSelectedNodeBesideChat = useCallback(
    (node: WorkflowNode) => {
      if (!reactFlow) {
        return
      }

      const width = node.width ?? (node.type === "start" ? 148 : 300)
      const height = node.height ?? (node.type === "start" ? 56 : 126)
      const chatWidth = Math.min(430, Math.max(0, window.innerWidth - 36))
      const availableWidth = Math.max(320, window.innerWidth - chatWidth - 78)
      const targetScreenX = Math.min(
        96 + availableWidth * 0.56,
        window.innerWidth - chatWidth - 96
      )
      const targetScreenY = window.innerHeight / 2
      const zoom = Math.min(1, Math.max(0.65, reactFlow.getZoom()))
      const centerX = node.position.x + width / 2
      const centerY = node.position.y + height / 2

      reactFlow.setViewport(
        {
          x: targetScreenX - centerX * zoom,
          y: targetScreenY - centerY * zoom,
          zoom,
        },
        { duration: 360 }
      )
    },
    [reactFlow]
  )

  const focusSelectedNodeBesideInspector = useCallback(
    (node: WorkflowNode) => {
      if (!reactFlow || node.type === "start") {
        return
      }

      const width = node.width ?? 300
      const height = node.height ?? 126
      const inspectorWidth = Math.min(430, Math.max(0, window.innerWidth - 36))
      const availableWidth = Math.max(
        280,
        window.innerWidth - inspectorWidth - 48
      )
      const targetScreenX = Math.max(
        132,
        Math.min(availableWidth * 0.5, availableWidth - 92)
      )
      const targetScreenY = window.innerHeight / 2
      const zoom = Math.min(1, Math.max(0.65, reactFlow.getZoom()))
      const centerX = node.position.x + width / 2
      const centerY = node.position.y + height / 2

      reactFlow.setViewport(
        {
          x: targetScreenX - centerX * zoom,
          y: targetScreenY - centerY * zoom,
          zoom,
        },
        { duration: 320 }
      )
    },
    [reactFlow]
  )

  useEffect(() => {
    if (drawerMode !== "run" || !selectedNode || !reactFlow) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      focusSelectedNodeBesideChat(selectedNode)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [drawerMode, focusSelectedNodeBesideChat, reactFlow, selectedNode])

  useEffect(() => {
    if (
      drawerMode === "run" ||
      !selectedNode ||
      selectedNode.type === "start" ||
      !reactFlow
    ) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      focusSelectedNodeBesideInspector(selectedNode)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [drawerMode, focusSelectedNodeBesideInspector, reactFlow, selectedNode])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((next) => applyNodeChanges(changes, next))
  }, [])

  const handleNodeDragStart = useCallback<NodeDragHandler>(() => {
    suppressSelectionRef.current = true
    clearSelectedNode()
    setNodeMenu(null)
    setCanvasMenu(null)
    setEdgeMenu(null)
    setConnectMenu(null)
  }, [clearSelectedNode])

  const handleNodeDragStop = useCallback<NodeDragHandler>(() => {
    window.setTimeout(() => {
      suppressSelectionRef.current = false
    }, 160)
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((next) => applyEdgeChanges(changes, next))
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    const { source, target } = connection

    if (!source || !target) {
      pendingConnectionRef.current = null
      setConnectMenu(null)
      return
    }

    pendingConnectionRef.current = null
    setConnectMenu(null)
    setEdgeMenu(null)
    setEdges((next) =>
      addEdge(
        createWorkflowEdge({
          source,
          target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        }),
        next
      )
    )
  }, [])

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      if (suppressSelectionRef.current) {
        return
      }

      setSelectedNodeId(selected[0]?.id ?? null)
      setInspectorMenuOpen(false)
    },
    []
  )

  const updateNodeData = useCallback((nodeId: string, data: NodeData) => {
    setNodes((next) =>
      next.map((node) => (node.id === nodeId ? { ...node, data } : node))
    )
  }, [])

  const readImageFile = useCallback(
    (nodeId: string, data: ImageNodeData, file?: File) => {
      if (!file) {
        return
      }

      if (!file.type.startsWith("image/")) {
        setStatus("Choose an image or GIF file.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        updateNodeData(nodeId, {
          ...data,
          source: "upload",
          url: String(reader.result ?? ""),
          alt: data.alt || file.name,
          fileName: file.name,
        })
        setStatus("Image uploaded.")
      }
      reader.readAsDataURL(file)
    },
    [updateNodeData]
  )

  const readCardImageFile = useCallback(
    (nodeId: string, data: CardNodeData, file?: File) => {
      if (!file) {
        return
      }

      if (!file.type.startsWith("image/")) {
        setStatus("Choose an image or GIF file.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        updateNodeData(nodeId, {
          ...data,
          source: "upload",
          url: String(reader.result ?? ""),
          alt: data.alt || file.name,
          fileName: file.name,
        })
        setStatus("Card image uploaded.")
      }
      reader.readAsDataURL(file)
    },
    [updateNodeData]
  )

  const syncMessageEditor = useCallback((nodeId: string, html: string) => {
    setNodes((next) =>
      next.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, text: html } as NodeData }
          : node
      )
    )
  }, [])

  const formatRichText = useCallback(
    (
      format: MessageFormat,
      editor: HTMLElement | null,
      onSync: (html: string) => void
    ) => {
      if (!editor) {
        return
      }

      editor.focus()

      if (format === "link") {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) {
          document.execCommand(
            "insertHTML",
            false,
            '<a href="https://" target="_blank" rel="noreferrer">link</a>'
          )
        } else {
          document.execCommand("createLink", false, "https://")
        }
      } else {
        const commands: Record<Exclude<MessageFormat, "link">, string> = {
          bold: "bold",
          italic: "italic",
          underline: "underline",
          strike: "strikeThrough",
        }
        document.execCommand(commands[format], false)
      }

      onSync(editor.innerHTML)
    },
    []
  )

  const formatMessageText = useCallback(
    (nodeId: string, format: MessageFormat, editor: HTMLElement | null) => {
      formatRichText(format, editor, (html) => syncMessageEditor(nodeId, html))
    },
    [formatRichText, syncMessageEditor]
  )

  const patchNodeData = useCallback(
    (nodeId: string, patch: Partial<NodeData>) => {
      setNodes((next) =>
        next.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...patch } }
            : node
        )
      )
    },
    []
  )

  const renameNodeInline = useCallback(
    (nodeId: string, name: string) => {
      patchNodeData(nodeId, { customName: name })
      setStatus("Block renamed.")
    },
    [patchNodeData]
  )

  const createCanvasNode = (
    type: NodeType,
    position: { x: number; y: number }
  ) => {
    if (type === "start" && nodes.some((node) => node.type === "start")) {
      setStatus("Only one Start node is allowed.")
      return null
    }

    const id = createId(type)
    const node = {
      id,
      type,
      position,
      data: createNodeData(type),
    }

    setNodes((next) => [...next, node])
    setSelectedNodeId(id)
    setStatus(`${getStepOption(type)?.label ?? "Step"} added.`)

    return node
  }

  const connectToNewNode = (type: NodeType) => {
    if (!connectMenu || !reactFlow) {
      return
    }

    const viewport = reactFlow.getViewport()
    const targetPoint = {
      x: connectMenu.x + CONNECT_MENU_PLUS_CENTER_OFFSET.x,
      y: connectMenu.y + CONNECT_MENU_PLUS_CENTER_OFFSET.y,
    }
    const targetFlowPoint = {
      x: (targetPoint.x - viewport.x) / viewport.zoom,
      y: (targetPoint.y - viewport.y) / viewport.zoom,
    }
    const sourceIsLeftOfTarget =
      connectMenu.sourceFlowPoint.x <= targetFlowPoint.x
    const position = getNodePositionForTargetPoint(
      type,
      targetFlowPoint,
      sourceIsLeftOfTarget
    )
    const created = createCanvasNode(type, position)
    if (!created) {
      setConnectMenu(null)
      return
    }

    setEdges((next) =>
      addEdge(
        createWorkflowEdge({
          id: createId("edge"),
          source: connectMenu.source,
          sourceHandle: connectMenu.sourceHandle,
          target: created.id,
        }),
        next
      )
    )
    setConnectMenu(null)
    setStatus(`${getStepOption(type)?.label ?? "Step"} added and connected.`)
  }

  const onStepDragStart = (
    event: DragEvent<HTMLButtonElement>,
    step: StepOption
  ) => {
    event.dataTransfer.setData("application/workflow-node", step.type)
    event.dataTransfer.setData("text/plain", step.label)
    event.dataTransfer.effectAllowed = "move"
  }

  const onCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  const onCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const type = event.dataTransfer.getData(
      "application/workflow-node"
    ) as NodeType
    if (!type || !reactFlow) {
      return
    }

    const position = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    createCanvasNode(type, position)
  }

  const handleCanvasPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const screenPoint = {
        x: event.clientX,
        y: event.clientY,
      }

      lastCanvasPointerRef.current = screenPoint

      if (!workflowId || !reactFlow) {
        return
      }

      const flowPoint = reactFlow.screenToFlowPosition(screenPoint)
      lastFlowCursorRef.current = flowPoint
      const now = Date.now()

      if (now - lastCursorSentAtRef.current < 90) {
        return
      }

      lastCursorSentAtRef.current = now
      void movePresenceCursor({
        workflowId,
        cursorX: flowPoint.x,
        cursorY: flowPoint.y,
        selectedNodeId: selectedNodeIdRef.current,
      }).catch(() => undefined)
    },
    [movePresenceCursor, reactFlow, workflowId]
  )

  const openConnectActionMenu = useCallback(
    (pending: PendingConnection, point: { x: number; y: number }) => {
      if (!reactFlow) {
        return
      }

      const menuWidth =
        CONNECT_MENU_WIDTH + CONNECT_MENU_GAP + CONNECT_SUBMENU_WIDTH
      const menuHeight = CONNECT_MENU_HEIGHT
      const shell = builderShellRef.current
      const shellRect = shell?.getBoundingClientRect()
      const releaseBlockers = shell
        ? Array.from(
            shell.querySelectorAll<HTMLElement>(connectReleaseBlockerSelector)
          )
        : []

      if (
        releaseBlockers.some((element) => isPointInsideElement(point, element))
      ) {
        return
      }

      const localPoint = shellRect
        ? {
            x: point.x - shellRect.left,
            y: point.y - shellRect.top,
          }
        : point
      const shellWidth = shellRect?.width ?? window.innerWidth
      const shellHeight = shellRect?.height ?? window.innerHeight
      const safeLocalPoint = {
        x: clampValue(localPoint.x, 8, shellWidth - 8),
        y: clampValue(localPoint.y, 8, shellHeight - 8),
      }
      const sourceNode = nodes.find((node) => node.id === pending.source)
      const sourceHandleScreenPoint =
        getSourceHandleScreenPoint(
          shell,
          pending.source,
          pending.sourceHandle
        ) ?? pending.sourceScreenPoint
      const nodeWidth =
        sourceNode?.width ?? (sourceNode?.type === "start" ? 148 : 300)
      const nodeHeight =
        sourceNode?.height ?? (sourceNode?.type === "start" ? 56 : 126)
      const sourceCenterScreen = sourceNode
        ? reactFlow.flowToScreenPosition({
            x: sourceNode.position.x + nodeWidth / 2,
            y: sourceNode.position.y + nodeHeight / 2,
          })
        : point
      const shouldConnectFromLeft =
        safeLocalPoint.x < sourceCenterScreen.x - (shellRect?.left ?? 0)
      const sourceEdgeScreen = sourceNode
        ? reactFlow.flowToScreenPosition({
            x: sourceNode.position.x + (shouldConnectFromLeft ? 0 : nodeWidth),
            y: sourceNode.position.y + nodeHeight / 2,
          })
        : point
      const sourceScreen = sourceNode
        ? {
            x: sourceEdgeScreen.x,
            y: sourceHandleScreenPoint?.y ?? sourceEdgeScreen.y,
          }
        : (sourceHandleScreenPoint ?? point)

      clearSelectedNode()
      setDrawerMode(null)
      setNodeMenu(null)
      setCanvasMenu(null)
      setEdgeMenu(null)
      suppressNextPaneClickRef.current = true
      const menuPoint = {
        x: clampValue(safeLocalPoint.x + 8, 8, shellWidth - menuWidth),
        y: clampValue(safeLocalPoint.y + 8, 8, shellHeight - menuHeight),
      }

      setConnectMenu({
        ...pending,
        x: menuPoint.x,
        y: menuPoint.y,
        sourceFlowPoint: reactFlow.screenToFlowPosition(sourceScreen),
        activeCategory: null,
      })
    },
    [clearSelectedNode, nodes, reactFlow]
  )

  const onConnectStart = useCallback<OnConnectStart>(
    (event, params) => {
      clearSelectedNode()
      setDrawerMode(null)
      setNodeMenu(null)
      setCanvasMenu(null)
      setEdgeMenu(null)
      setConnectMenu(null)

      const sourceHandleElement = (event.target as Element | null)?.closest(
        ".react-flow__handle"
      )
      const sourceHandleRect =
        sourceHandleElement instanceof HTMLElement
          ? sourceHandleElement.getBoundingClientRect()
          : null

      pendingConnectionRef.current = params.nodeId
        ? {
            source: params.nodeId,
            sourceHandle: params.handleId,
            sourceScreenPoint: sourceHandleRect
              ? {
                  x: sourceHandleRect.left + sourceHandleRect.width / 2,
                  y: sourceHandleRect.top + sourceHandleRect.height / 2,
                }
              : undefined,
          }
        : null
    },
    [clearSelectedNode]
  )

  const onConnectEnd = useCallback<OnConnectEnd>(
    (event) => {
      const pending = pendingConnectionRef.current
      pendingConnectionRef.current = null

      if (!pending) {
        return
      }

      const target = event.target as Element | null
      if (target?.closest(".react-flow__handle")) {
        return
      }

      if (isConnectReleaseBlocked(target)) {
        return
      }

      const point = getPointerClientPoint(event)
      lastCanvasPointerRef.current = point
      openConnectActionMenu(pending, point)
    },
    [openConnectActionMenu]
  )

  useEffect(() => {
    const handleGlobalConnectionRelease = (
      event: MouseEvent | PointerEvent | TouchEvent
    ) => {
      const pending = pendingConnectionRef.current

      if (!pending) {
        return
      }

      const target = event.target as Element | null
      if (target?.closest(".react-flow__handle")) {
        window.setTimeout(() => {
          pendingConnectionRef.current = null
        }, 0)
        return
      }

      if (isConnectReleaseBlocked(target)) {
        pendingConnectionRef.current = null
        return
      }

      pendingConnectionRef.current = null
      const point = getPointerClientPoint(event)
      lastCanvasPointerRef.current = point
      openConnectActionMenu(pending, point)
    }

    window.addEventListener("pointerup", handleGlobalConnectionRelease, true)
    window.addEventListener("mouseup", handleGlobalConnectionRelease, true)
    window.addEventListener("touchend", handleGlobalConnectionRelease, true)

    return () => {
      window.removeEventListener(
        "pointerup",
        handleGlobalConnectionRelease,
        true
      )
      window.removeEventListener("mouseup", handleGlobalConnectionRelease, true)
      window.removeEventListener(
        "touchend",
        handleGlobalConnectionRelease,
        true
      )
    }
  }, [openConnectActionMenu])

  useEffect(() => {
    if (!connectMenu) {
      return
    }

    const handleOutsideConnectMenuPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null

      if (target?.closest(".connect-action-menu")) {
        return
      }

      setConnectMenu(null)
      suppressNextPaneClickRef.current = false
    }

    window.addEventListener(
      "pointerdown",
      handleOutsideConnectMenuPointerDown,
      true
    )

    return () => {
      window.removeEventListener(
        "pointerdown",
        handleOutsideConnectMenuPointerDown,
        true
      )
    }
  }, [connectMenu])

  const openNodeActionMenu = useCallback(
    (event: ReactMouseEvent, node: WorkflowNode) => {
      event.preventDefault()
      lastCanvasPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      }
      const menuWidth = 252
      const menuHeight = 322

      setSelectedNodeId(node.id)
      setDrawerMode(null)
      setCanvasMenu(null)
      setConnectMenu(null)
      setEdgeMenu(null)
      setNodeMenu({
        nodeId: node.id,
        x: Math.min(event.clientX + 8, window.innerWidth - menuWidth),
        y: Math.min(event.clientY + 8, window.innerHeight - menuHeight),
        colorOpen: false,
        renaming: false,
        renameValue: getNodeDisplayName(node),
      })
    },
    []
  )

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      openSelectedNode(node as WorkflowNode)
      setDrawerMode(null)
      setNodeMenu(null)
      setInspectorMenuOpen(false)
      setCanvasMenu(null)
      setConnectMenu(null)
      setEdgeMenu(null)
    },
    [openSelectedNode]
  )

  const closeInspector = useCallback(() => {
    clearSelectedNode()
    setNodeMenu(null)
    setInspectorMenuOpen(false)
    setCanvasMenu(null)
    setConnectMenu(null)
    setEdgeMenu(null)
  }, [clearSelectedNode])

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: WorkflowNode) => {
      openNodeActionMenu(event, node)
    },
    [openNodeActionMenu]
  )

  const handleEdgeClick = useCallback(
    (event: ReactMouseEvent, edge: WorkflowEdge) => {
      event.preventDefault()
      event.stopPropagation()
      const menuWidth = 174
      const menuHeight = 168

      clearSelectedNode()
      setDrawerMode(null)
      setNodeMenu(null)
      setCanvasMenu(null)
      setConnectMenu(null)
      setEdgeMenu({
        edgeId: edge.id,
        x: Math.max(
          8,
          Math.min(event.clientX + 8, window.innerWidth - menuWidth)
        ),
        y: Math.max(
          8,
          Math.min(event.clientY + 8, window.innerHeight - menuHeight)
        ),
        colorOpen: false,
        labeling: false,
        labelValue: edge.data?.label ?? "",
      })
    },
    [clearSelectedNode]
  )

  const handlePaneClick = useCallback(() => {
    if (suppressNextPaneClickRef.current) {
      suppressNextPaneClickRef.current = false
      return
    }

    closeInspector()
    setNavigationPanelOpen(false)
    setCollaboratorsPanelOpen(false)
  }, [closeInspector])

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault()
      lastCanvasPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      }

      if (!reactFlow) {
        return
      }

      const menuWidth = 252
      const menuHeight = 386

      clearSelectedNode()
      setDrawerMode(null)
      setNodeMenu(null)
      setConnectMenu(null)
      setEdgeMenu(null)
      setCanvasMenu({
        x: Math.max(
          8,
          Math.min(event.clientX + 8, window.innerWidth - menuWidth)
        ),
        y: Math.max(
          8,
          Math.min(event.clientY + 8, window.innerHeight - menuHeight)
        ),
        flowPosition: reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      })
    },
    [clearSelectedNode, reactFlow]
  )

  const setBlockColor = (nodeId: string, color: BlockColor) => {
    patchNodeData(nodeId, { blockColor: color })
    setStatus("Block color updated.")
    setNodeMenu(null)
  }

  const setEdgeColor = (edgeId: string, color: string) => {
    setEdges((next) =>
      next.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: { ...edge.data, color },
              style: { ...edge.style, ...buildEdgeStyle(color) },
            }
          : edge
      )
    )
    setStatus("Line color updated.")
    setEdgeMenu(null)
  }

  const submitEdgeLabel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!edgeMenu) {
      return
    }

    const label = edgeMenu.labelValue.trim()
    setEdges((next) =>
      next.map((edge) =>
        edge.id === edgeMenu.edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                label: label || undefined,
              },
            }
          : edge
      )
    )
    setStatus(label ? "Line label updated." : "Line label cleared.")
    setEdgeMenu(null)
  }

  const deleteEdge = (edgeId: string) => {
    setEdges((next) => next.filter((edge) => edge.id !== edgeId))
    setEdgeMenu(null)
    setStatus("Connection deleted.")
  }

  const createNodeFromCanvasMenu = (
    type: NodeType,
    label?: string,
    description?: string
  ) => {
    if (!canvasMenu) {
      return
    }

    const created = createCanvasNode(type, canvasMenu.flowPosition)
    if (created && (label || description)) {
      patchNodeData(created.id, {
        customName: label,
        description,
      })
    }
    setCanvasMenu(null)
  }

  const pasteCopiedNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!copiedNode) {
        setStatus("Copy a block before pasting.")
        setCanvasMenu(null)
        return
      }

      if (
        copiedNode.type === "start" &&
        nodes.some((node) => node.type === "start")
      ) {
        setStatus("Start cannot be pasted because one already exists.")
        setCanvasMenu(null)
        return
      }

      const id = createId(copiedNode.type ?? "node")
      const pasted: WorkflowNode = {
        ...copiedNode,
        id,
        selected: false,
        position,
        data: {
          ...cloneNodeData(copiedNode.data),
          customName: `${getNodeDisplayName(copiedNode)} copy`,
        },
      }

      setNodes((next) => [...next, pasted])
      setSelectedNodeId(id)
      setNodeMenu(null)
      setCanvasMenu(null)
      setStatus("Block pasted.")
    },
    [copiedNode, nodes]
  )

  const pasteNodeAtCanvasMenu = () => {
    if (!canvasMenu) {
      setStatus("Copy a block before pasting.")
      setCanvasMenu(null)
      return
    }

    pasteCopiedNode(canvasMenu.flowPosition)
  }

  const returnToStart = () => {
    const startNode = nodes.find((node) => node.type === "start")

    if (!startNode || !reactFlow) {
      setStatus("No Start node found.")
      setCanvasMenu(null)
      return
    }

    reactFlow.setCenter(startNode.position.x + 70, startNode.position.y + 24, {
      zoom: DEFAULT_CANVAS_VIEWPORT.zoom,
      duration: 360,
    })
    setSelectedNodeId(startNode.id)
    setCanvasMenu(null)
    setStatus("Returned to Start.")
  }

  const zoomCanvas = (direction: "in" | "out") => {
    if (!reactFlow) {
      return
    }

    const current = reactFlow.getZoom()
    const nextZoom =
      direction === "in"
        ? Math.min(current + 0.18, 1.4)
        : Math.max(current - 0.18, 0.2)

    reactFlow.zoomTo(nextZoom, { duration: 180 })
    setCanvasMenu(null)
    setStatus(direction === "in" ? "Zoomed in." : "Zoomed out.")
  }

  const createComponentFromNode = (node: WorkflowNode) => {
    if (node.type === "start") {
      setStatus("Start cannot be converted into a component.")
      setNodeMenu(null)
      return
    }

    const previousName = getNodeDisplayName(node)
    setNodes((next) =>
      next.map((candidate) =>
        candidate.id === node.id
          ? {
              ...candidate,
              type: "component",
              data: {
                label: "Component",
                customName: previousName,
                description: `Component created from ${previousName}.`,
                accent: "logic",
                blockColor: candidate.data.blockColor,
              },
            }
          : candidate
      )
    )
    setStatus("Component created.")
    setNodeMenu(null)
  }

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!nodeMenu) {
      return
    }

    const nextName = nodeMenu.renameValue.trim()
    if (!nextName) {
      return
    }

    patchNodeData(nodeMenu.nodeId, { customName: nextName })
    setStatus("Block renamed.")
    setNodeMenu(null)
  }

  const copyNode = useCallback((node: WorkflowNode) => {
    setCopiedNode({
      ...node,
      data: cloneNodeData(node.data),
      position: { ...node.position },
    })
    setStatus(`${getNodeDisplayName(node)} copied.`)
    setNodeMenu(null)
    setCanvasMenu(null)
  }, [])

  const duplicateNode = (node: WorkflowNode) => {
    if (node.type === "start") {
      setStatus("Start cannot be duplicated.")
      setNodeMenu(null)
      return
    }

    const id = createId(node.type ?? "node")
    const duplicate: WorkflowNode = {
      ...node,
      id,
      selected: false,
      position: {
        x: node.position.x + 34,
        y: node.position.y + 34,
      },
      data: {
        ...cloneNodeData(node.data),
        customName: `${getNodeDisplayName(node)} copy`,
      },
    }

    setNodes((next) => [...next, duplicate])
    setSelectedNodeId(id)
    setNodeMenu(null)
    setInspectorMenuOpen(false)
    setStatus("Block duplicated.")
  }

  const deleteNode = (node: WorkflowNode) => {
    if (node.type === "start") {
      setStatus("Start cannot be deleted.")
      setNodeMenu(null)
      return
    }

    setNodes((next) => next.filter((candidate) => candidate.id !== node.id))
    setEdges((next) =>
      next.filter((edge) => edge.source !== node.id && edge.target !== node.id)
    )
    clearSelectedNode()
    setNodeMenu(null)
    setInspectorMenuOpen(false)
    setStatus("Block deleted.")
  }

  useEffect(() => {
    const getPastePosition = () => {
      if (!reactFlow) {
        return copiedNode
          ? { x: copiedNode.position.x + 34, y: copiedNode.position.y + 34 }
          : { x: 0, y: 0 }
      }

      const pointer = lastCanvasPointerRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }

      return reactFlow.screenToFlowPosition(pointer)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === "c") {
        if (!selectedNode) {
          return
        }

        event.preventDefault()
        copyNode(selectedNode)
        return
      }

      if (key === "v") {
        if (!copiedNode) {
          return
        }

        event.preventDefault()
        pasteCopiedNode(getPastePosition())
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [copiedNode, copyNode, pasteCopiedNode, reactFlow, selectedNode])

  const toDefinition = useCallback(
    (): WorkflowDefinition =>
      JSON.parse(
        JSON.stringify({
          schemaVersion: WORKFLOW_SCHEMA_VERSION,
          id: workflowId ?? undefined,
          name: workflowName.trim() || "Untitled Workflow",
          description: workflowDescription.trim() || undefined,
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type as NodeType,
            position: node.position,
            data: node.data,
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? null,
            targetHandle: edge.targetHandle ?? null,
            data: edge.data ?? null,
          })),
        })
      ) as WorkflowDefinition,
    [edges, nodes, workflowDescription, workflowId, workflowName]
  )

  const applyDefinitionToState = useCallback(
    (definition: WorkflowDefinition) => {
      const nextDefinition = cloneWorkflowDefinition(definition)

      latestDefinitionRef.current = nextDefinition
      setNodes(nodesFromDefinition(nextDefinition))
      setEdges(edgesFromDefinition(nextDefinition))
      setWorkflowName(nextDefinition.name)
      setWorkflowDescription(nextDefinition.description ?? "")
    },
    []
  )

  const flushLiveSync = useCallback(() => {
    if (!workflowId || !hasLoadedWorkflowRef.current) {
      return
    }

    if (liveSyncInFlightRef.current) {
      pendingLiveSyncRef.current = true
      return
    }

    const currentDefinition = latestDefinitionRef.current ?? toDefinition()
    const currentBaseDefinition = lastSyncedDefinitionRef.current

    if (
      !currentBaseDefinition ||
      definitionsEqual(currentBaseDefinition, currentDefinition)
    ) {
      pendingLiveSyncRef.current = false
      return
    }

    liveSyncInFlightRef.current = true

    void syncLiveWorkflow({
      workflowId,
      name: currentDefinition.name,
      description: currentDefinition.description ?? null,
      definition: currentDefinition,
      baseDefinition: currentBaseDefinition,
    })
      .then((record) => {
        const syncedDefinition = normalizeLoadedWorkflowDefinition(
          record as WorkflowRecord
        )
        const latestDefinition = latestDefinitionRef.current

        lastSyncedDefinitionRef.current = syncedDefinition
        lastRemoteUpdatedAtRef.current = Math.max(
          lastRemoteUpdatedAtRef.current,
          record.updatedAt
        )

        if (
          latestDefinition &&
          definitionsEqual(latestDefinition, currentDefinition) &&
          !definitionsEqual(latestDefinition, syncedDefinition)
        ) {
          applyDefinitionToState(syncedDefinition)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        liveSyncInFlightRef.current = false

        if (pendingLiveSyncRef.current) {
          pendingLiveSyncRef.current = false
          window.setTimeout(() => flushLiveSyncRef.current?.(), 0)
        }
      })
  }, [applyDefinitionToState, syncLiveWorkflow, toDefinition, workflowId])

  useEffect(() => {
    flushLiveSyncRef.current = flushLiveSync
  }, [flushLiveSync])

  useEffect(() => {
    const definition = toDefinition()
    latestDefinitionRef.current = definition

    if (
      !workflowId ||
      !hasLoadedWorkflowRef.current ||
      applyingRemoteRef.current
    ) {
      return
    }

    const baseDefinition = lastSyncedDefinitionRef.current

    if (!baseDefinition || definitionsEqual(baseDefinition, definition)) {
      return
    }

    if (liveSyncTimerRef.current !== null) {
      window.clearTimeout(liveSyncTimerRef.current)
    }

    liveSyncTimerRef.current = window.setTimeout(() => {
      liveSyncTimerRef.current = null
      flushLiveSync()
    }, 420)
  }, [flushLiveSync, toDefinition, workflowId])

  useEffect(() => {
    if (!loadedWorkflow) {
      return
    }

    const incomingDefinition = normalizeLoadedWorkflowDefinition(loadedWorkflow)
    const isInitialLoad = loadedWorkflowRef.current !== loadedWorkflow.id
    const isNewerUpdate =
      loadedWorkflow.updatedAt > lastRemoteUpdatedAtRef.current
    const isRemoteUpdate =
      !isInitialLoad && isNewerUpdate && loadedWorkflow.updatedBy !== userId

    if (!isInitialLoad && !isRemoteUpdate) {
      lastSyncedDefinitionRef.current = incomingDefinition
      lastRemoteUpdatedAtRef.current = Math.max(
        lastRemoteUpdatedAtRef.current,
        loadedWorkflow.updatedAt
      )
      return
    }

    const baseDefinition = lastSyncedDefinitionRef.current
    const localDefinition = latestDefinitionRef.current ?? toDefinition()
    const hasLocalChanges = Boolean(
      !isInitialLoad &&
      baseDefinition &&
      !definitionsEqual(baseDefinition, localDefinition)
    )
    const nextDefinition =
      hasLocalChanges && baseDefinition
        ? mergeWorkflowDefinitions(
            baseDefinition,
            localDefinition,
            incomingDefinition
          )
        : incomingDefinition
    const selectedNodeStillExists = selectedNodeIdRef.current
      ? nextDefinition.nodes.some(
          (node) => node.id === selectedNodeIdRef.current
        )
      : true

    lastSyncedDefinitionRef.current = incomingDefinition
    applyDefinitionToState(nextDefinition)
    setWorkflowId(loadedWorkflow.id)
    loadedWorkflowRef.current = loadedWorkflow.id
    hasLoadedWorkflowRef.current = true
    lastRemoteUpdatedAtRef.current = loadedWorkflow.updatedAt

    if (isInitialLoad) {
      clearSelectedNode()
      setDrawerMode(null)
      setNodeMenu(null)
      setCanvasMenu(null)
      setEdgeMenu(null)
      setConnectMenu(null)
    } else if (!selectedNodeStillExists) {
      clearSelectedNode()
      setNodeMenu(null)
      setEdgeMenu(null)
      setConnectMenu(null)
    }

    setStatus(
      isRemoteUpdate
        ? hasLocalChanges
          ? "Workflow updated live. Your edits were preserved."
          : "Workflow updated live."
        : "Workflow loaded."
    )

    if (isInitialLoad) {
      requestAnimationFrame(() => reactFlow?.fitView(WORKFLOW_FIT_VIEW_OPTIONS))
    }
  }, [
    applyDefinitionToState,
    clearSelectedNode,
    loadedWorkflow,
    reactFlow,
    toDefinition,
    userId,
  ])

  useEffect(
    () => () => {
      if (liveSyncTimerRef.current !== null) {
        window.clearTimeout(liveSyncTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPresenceNow(Date.now())
    }, 10_000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!workflowId) {
      return
    }

    const sendHeartbeat = () => {
      const cursor = lastFlowCursorRef.current
      void heartbeatPresence({
        workflowId,
        cursorX: cursor?.x,
        cursorY: cursor?.y,
        selectedNodeId: selectedNodeIdRef.current,
      }).catch(() => undefined)
    }

    sendHeartbeat()
    const timer = window.setInterval(sendHeartbeat, 15_000)

    return () => window.clearInterval(timer)
  }, [heartbeatPresence, workflowId])

  useEffect(() => {
    if (!workflowId || !hasLoadedWorkflowRef.current) {
      return
    }

    const cursor = lastFlowCursorRef.current
    void heartbeatPresence({
      workflowId,
      cursorX: cursor?.x,
      cursorY: cursor?.y,
      selectedNodeId,
    }).catch(() => undefined)
  }, [heartbeatPresence, selectedNodeId, workflowId])

  const refreshLibrary = useCallback(() => {
    if (workflowList) {
      setStatus("Library refreshed.")
      return
    }

    setStatus("Loading workflow library...")
  }, [workflowList])

  const handleSave = async ({
    allowDuringPublish = false,
    showToast = true,
  }: {
    allowDuringPublish?: boolean
    showToast?: boolean
  } = {}) => {
    const definition = toDefinition()
    if (
      isSavingWorkflow ||
      (isPublishingWorkflow && !allowDuringPublish) ||
      isDeactivatingWorkflow
    ) {
      return null
    }

    setIsSavingWorkflow(true)
    setStatus("Saving...")

    try {
      const payload = {
        name: definition.name,
        description: definition.description ?? null,
        definition,
      }

      const baseDefinition = lastSyncedDefinitionRef.current
      const saved =
        workflowId && baseDefinition
          ? ((await syncLiveWorkflow({
              workflowId,
              ...payload,
              baseDefinition,
            })) as WorkflowRecord)
          : ((await saveWorkflow({
              workflowId: workflowId ?? undefined,
              ...payload,
            })) as WorkflowRecord)
      const savedDefinition = normalizeLoadedWorkflowDefinition(saved)

      setWorkflowId(saved.id)
      setLoadWorkflowId(saved.id)
      applyDefinitionToState(savedDefinition)
      lastSyncedDefinitionRef.current = savedDefinition
      hasLoadedWorkflowRef.current = true
      lastRemoteUpdatedAtRef.current = saved.updatedAt
      setStatus("Saved.")
      if (showToast) {
        toast.success("Workflow saved")
      }
      refreshLibrary()
      return saved
    } catch (error) {
      console.error("Failed to save workflow", error)
      setStatus("Save failed. Please try again.")
      toast.error("Save failed")
      return null
    } finally {
      setIsSavingWorkflow(false)
    }
  }

  const handlePublish = async () => {
    if (isSavingWorkflow || isPublishingWorkflow || isDeactivatingWorkflow) {
      return null
    }

    setIsPublishingWorkflow(true)
    setStatus("Publishing...")

    try {
      const saved = await handleSave({
        allowDuringPublish: true,
        showToast: false,
      })

      if (!saved) {
        return null
      }

      const published = (await publishWorkflow({
        workflowId: saved.id,
      })) as WorkflowRecord
      const publishedDefinition = normalizeLoadedWorkflowDefinition(published)

      setWorkflowId(published.id)
      setLoadWorkflowId(published.id)
      applyDefinitionToState(publishedDefinition)
      lastSyncedDefinitionRef.current = publishedDefinition
      hasLoadedWorkflowRef.current = true
      lastRemoteUpdatedAtRef.current = published.updatedAt
      setStatus("Published.")
      toast.success("Workflow published")
      refreshLibrary()
      return published
    } catch (error) {
      console.error("Failed to publish workflow", error)
      setStatus("Publish failed. Please try again.")
      toast.error("Publish failed")
      return null
    } finally {
      setIsPublishingWorkflow(false)
    }
  }

  const handleDeactivate = async () => {
    if (
      !workflowId ||
      isSavingWorkflow ||
      isPublishingWorkflow ||
      isDeactivatingWorkflow
    ) {
      return null
    }

    setIsDeactivatingWorkflow(true)
    setStatus("Deactivating...")

    try {
      const deactivated = (await deactivateWorkflow({
        workflowId,
      })) as WorkflowRecord
      const deactivatedDefinition =
        normalizeLoadedWorkflowDefinition(deactivated)

      setWorkflowId(deactivated.id)
      setLoadWorkflowId(deactivated.id)
      applyDefinitionToState(deactivatedDefinition)
      lastSyncedDefinitionRef.current = deactivatedDefinition
      hasLoadedWorkflowRef.current = true
      lastRemoteUpdatedAtRef.current = deactivated.updatedAt
      setStatus("Deactivated.")
      toast.success("Workflow deactivated")
      refreshLibrary()
      return deactivated
    } catch (error) {
      console.error("Failed to deactivate workflow", error)
      setStatus("Deactivate failed. Please try again.")
      toast.error("Deactivate failed")
      return null
    } finally {
      setIsDeactivatingWorkflow(false)
    }
  }

  const handleNew = () => {
    const graph = createStarterGraph()
    setNodes(graph.nodes)
    setEdges(graph.edges)
    clearSelectedNode()
    setWorkflowId(null)
    setLoadWorkflowId(null)
    loadedWorkflowRef.current = null
    hasLoadedWorkflowRef.current = false
    latestDefinitionRef.current = null
    lastSyncedDefinitionRef.current = null
    liveSyncInFlightRef.current = false
    pendingLiveSyncRef.current = false
    lastRemoteUpdatedAtRef.current = 0
    lastFlowCursorRef.current = null
    if (liveSyncTimerRef.current !== null) {
      window.clearTimeout(liveSyncTimerRef.current)
      liveSyncTimerRef.current = null
    }
    setWorkflowName("Untitled workflow")
    setWorkflowDescription("")
    setStatus("New draft created.")
    setDrawerMode(null)
    setNodeMenu(null)
    setCanvasMenu(null)
    setEdgeMenu(null)
    setConnectMenu(null)
    setCollaboratorsPanelOpen(false)
  }

  const handleLoad = (id: Id<"workflows">) => {
    loadedWorkflowRef.current = null
    hasLoadedWorkflowRef.current = false
    latestDefinitionRef.current = null
    lastSyncedDefinitionRef.current = null
    liveSyncInFlightRef.current = false
    pendingLiveSyncRef.current = false
    setLoadWorkflowId(id)
    setStatus("Loading workflow...")
    setCollaboratorsPanelOpen(false)
  }

  const handleCollaboratorsClick = () => {
    if (!workflowId) {
      void (async () => {
        const saved = await handleSave()

        if (saved) {
          setCollaboratorsPanelOpen(true)
        }
      })()
      return
    }

    setCollaboratorsPanelOpen((current) => !current)
  }

  const selectedGenericData = selectedNode?.data as GenericNodeData | undefined
  const isStartMenu = menuNode?.type === "start"
  const inspectorOpen = Boolean(
    selectedNode && selectedNode.type !== "start" && !nodeMenu
  )
  const shellClasses = [
    "builder-shell",
    inspectorOpen ? "inspector-open" : "",
    drawerMode ? "drawer-open" : "",
    drawerMode === "run" ? "run-drawer-open" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const renderInspectorActions = (node: WorkflowNode) => (
    <div
      className="inspector-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={`inspector-more-button ${inspectorMenuOpen ? "active" : ""}`}
        title="Block options"
        aria-label="Block options"
        aria-expanded={inspectorMenuOpen}
        onClick={() => setInspectorMenuOpen((current) => !current)}
      >
        <Icon name="more" size={22} />
      </button>
      {inspectorMenuOpen && (
        <div className="inspector-actions-menu" aria-label="Block options menu">
          <button type="button" onClick={() => duplicateNode(node)}>
            Duplicate
          </button>
          <button type="button" onClick={() => deleteNode(node)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className={shellClasses} ref={builderShellRef}>
      <aside className="category-rail" aria-label="Step categories">
        {stepsByCategory.map((category) => (
          <button
            key={category.id}
            className={`category-tab ${activeCategory === category.id ? "active" : ""}`}
            onClick={() => showCategory(category.id)}
            onFocus={() => showCategory(category.id)}
            onMouseEnter={() => showCategory(category.id)}
            onMouseLeave={scheduleCategoryClose}
            title={category.label}
          >
            <Icon name={category.icon} size={28} />
            <span>{category.label}</span>
          </button>
        ))}
      </aside>

      {activeCategoryConfig && (
        <section
          className="step-popover"
          aria-label={`${activeCategoryConfig.label} steps`}
          style={
            {
              "--popover-top": `${8 + Math.max(activeCategoryIndex, 0) * 70}px`,
            } as CSSProperties
          }
          onMouseEnter={clearCategoryCloseTimer}
          onMouseLeave={scheduleCategoryClose}
        >
          {activeCategoryConfig.steps.map((step) => (
            <button
              key={step.type}
              className="step-option"
              draggable
              onDragStart={(event) => onStepDragStart(event, step)}
              title={step.description}
            >
              <Icon name={step.icon} size={22} />
              <span>{step.label}</span>
            </button>
          ))}
        </section>
      )}

      <div className="top-actions" aria-label="Workflow actions">
        <button
          className="round-button"
          onClick={handleNew}
          title="New workflow"
          aria-label="New workflow"
        >
          <Icon name="plus" size={20} />
        </button>
        <button
          className={`toolbar-button run ${isRunLaunching ? "loading" : ""}`}
          onClick={handleRun}
          aria-label="Run"
          aria-busy={isRunLaunching}
        >
          {isRunLaunching ? (
            <i className="button-spinner" aria-hidden />
          ) : (
            <Icon name="play" size={18} />
          )}
          <span>{isRunLaunching ? "Running" : "Run"}</span>
        </button>
        <button
          className="toolbar-button publish"
          disabled={
            isSavingWorkflow || isPublishingWorkflow || isDeactivatingWorkflow
          }
          onClick={() => void handleSave()}
          aria-label="Save"
          aria-busy={isSavingWorkflow}
        >
          {isSavingWorkflow ? (
            <i className="button-spinner" aria-hidden />
          ) : (
            <Icon name="publish" size={18} />
          )}
          <span>{isSavingWorkflow ? "Saving" : "Save"}</span>
        </button>
        <button
          className="toolbar-button publish"
          disabled={
            isSavingWorkflow || isPublishingWorkflow || isDeactivatingWorkflow
          }
          onClick={handlePublish}
          aria-label="Publish"
          aria-busy={isPublishingWorkflow}
        >
          {isPublishingWorkflow ? (
            <i className="button-spinner" aria-hidden />
          ) : (
            <Icon name="check" size={18} />
          )}
          <span>{isPublishingWorkflow ? "Publishing" : "Publish"}</span>
        </button>
        {currentWorkflowIsActive && (
          <button
            className="toolbar-button deactivate"
            disabled={
              isSavingWorkflow || isPublishingWorkflow || isDeactivatingWorkflow
            }
            onClick={handleDeactivate}
            aria-label="Deactivate workflow"
            aria-busy={isDeactivatingWorkflow}
          >
            {isDeactivatingWorkflow ? (
              <i className="button-spinner" aria-hidden />
            ) : (
              <Icon name="close" size={18} />
            )}
            <span>
              {isDeactivatingWorkflow ? "Deactivating" : "Deactivate"}
            </span>
          </button>
        )}
        <span className="workflow-status-pill" aria-live="polite">
          {status}
        </span>
      </div>

      <div className="collaboration-strip" aria-label="Workflow collaborators">
        <button
          type="button"
          className="collaborator-invite"
          title={
            workflowId
              ? "Show organization collaborators"
              : "Save this workflow to enable collaboration."
          }
          aria-label="Show organization collaborators"
          aria-expanded={collaboratorsPanelOpen}
          onClick={handleCollaboratorsClick}
        >
          <Icon name="plus" size={20} />
        </button>
        {visiblePresenceMembers.map((member) => (
          <span
            key={member.userId}
            className={`collaborator-avatar ${member.isSelf ? "self" : ""}`}
            title={`${member.name}${member.isSelf ? " (you)" : ""}`}
            style={{ "--avatar-color": member.color } as CSSProperties}
          >
            <span>{member.initials}</span>
          </span>
        ))}
        {hiddenPresenceCount > 0 ? (
          <span
            className="collaborator-avatar overflow"
            title={`${hiddenPresenceCount} more`}
          >
            +{hiddenPresenceCount}
          </span>
        ) : null}
        {collaboratorsPanelOpen && (
          <div
            className="collaborators-panel"
            role="dialog"
            aria-label="Organization collaborators"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="collaborators-panel-header">
              <div>
                <strong>{organization?.name ?? "Organization"} members</strong>
                <span>
                  {workflowId
                    ? `${organizationMemberCount} member${
                        organizationMemberCount === 1 ? "" : "s"
                      } can open this workflow.`
                    : "Save this workflow so the organization can join it."}
                </span>
              </div>
              <button
                type="button"
                className="collaborators-close"
                aria-label="Close collaborators"
                onClick={() => setCollaboratorsPanelOpen(false)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {!workflowId ? (
              <p className="collaborators-empty">
                Saving creates the shared org workspace.
              </p>
            ) : !organizationIsLoaded || organizationMemberships?.isLoading ? (
              <p className="collaborators-empty">
                Loading organization members...
              </p>
            ) : !organization ? (
              <p className="collaborators-empty">
                Pick a Clerk organization to share this canvas.
              </p>
            ) : organizationCollaborators.length === 0 ? (
              <p className="collaborators-empty">
                No organization members found.
              </p>
            ) : (
              <>
                <div className="collaborators-list">
                  {organizationCollaborators.map((member) => (
                    <div key={member.id} className="collaborator-row">
                      <span className="collaborator-row-avatar">
                        {member.initials}
                      </span>
                      <span className="collaborator-row-copy">
                        <strong>{member.name}</strong>
                        <small>{member.identifier || member.role}</small>
                      </span>
                      <span
                        className={`collaborator-status ${
                          member.isActive ? "active" : ""
                        }`}
                      >
                        {member.isActive ? "Live" : "Can join"}
                      </span>
                    </div>
                  ))}
                </div>
                {organizationMemberships?.hasNextPage ? (
                  <button
                    type="button"
                    className="collaborators-load-more"
                    onClick={() => organizationMemberships.fetchNext()}
                  >
                    Load more
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      <div className="remote-cursor-layer" aria-hidden>
        {remoteCursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="remote-cursor"
            style={
              {
                "--cursor-color": cursor.color,
                transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
              } as CSSProperties
            }
          >
            <span className="remote-cursor-pointer" />
            <span className="remote-cursor-label">{cursor.initials}</span>
          </div>
        ))}
      </div>

      <main
        className="canvas-stage"
        aria-label="Workflow canvas"
        onPointerMove={handleCanvasPointerMove}
      >
        <NodeRenameContext.Provider value={renameNodeInline}>
          <ReactFlow
            nodes={renderedNodes}
            edges={edges}
            nodeTypes={renderedNodeTypes}
            edgeTypes={renderedEdgeTypes}
            onDrop={onCanvasDrop}
            onDragOver={onCanvasDragOver}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onSelectionChange={onSelectionChange}
            onNodeClick={handleNodeClick}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onPaneContextMenu={handlePaneContextMenu}
            onInit={setReactFlow}
            onMove={(_, viewport) => {
              setCanvasViewport(viewport)
              setViewportVersion((version) => version + 1)
            }}
            connectionLineComponent={DynamicConnectionLine}
            defaultViewport={DEFAULT_CANVAS_VIEWPORT}
            panOnDrag={!isTrackpadNavigation}
            panOnScroll={isTrackpadNavigation}
            zoomOnScroll={!isTrackpadNavigation}
            zoomOnPinch
            minZoom={0.2}
            maxZoom={1.4}
            fitView
            fitViewOptions={WORKFLOW_FIT_VIEW_OPTIONS}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={CANVAS_DOT_GAP}
              size={CANVAS_DOT_SIZE}
              color={CANVAS_DOT_COLOR}
            />
          </ReactFlow>
        </NodeRenameContext.Provider>
      </main>

      <nav className="bottom-tools" aria-label="Canvas tools">
        <button
          className={navigationPanelOpen ? "active" : ""}
          title="Canvas navigation"
          aria-label="Canvas navigation"
          aria-expanded={navigationPanelOpen}
          onClick={() => setNavigationPanelOpen((current) => !current)}
        >
          <Icon name="navigation" size={19} />
        </button>
        <button
          title="Workflow settings"
          onClick={() => setDrawerMode("settings")}
        >
          <Icon name="settings" size={19} />
        </button>
        <button
          title="Library"
          onClick={() => {
            setDrawerMode("library")
            void refreshLibrary()
          }}
        >
          <Icon name="library" size={19} />
        </button>
      </nav>

      {navigationPanelOpen && (
        <section
          className="canvas-navigation-panel"
          aria-label="Canvas navigation mode"
        >
          <button
            type="button"
            className={`canvas-navigation-option ${
              canvasNavigationMode === "trackpad" ? "active" : ""
            }`}
            onClick={() => setCanvasNavigationMode("trackpad")}
          >
            <span className="canvas-navigation-radio" aria-hidden />
            <span>
              <strong>Trackpad</strong>
              <em>
                Pan the canvas by sliding two fingers on the trackpad. Zoom by
                pinching.
              </em>
            </span>
          </button>
          <button
            type="button"
            className={`canvas-navigation-option ${
              canvasNavigationMode === "mouse" ? "active" : ""
            }`}
            onClick={() => setCanvasNavigationMode("mouse")}
          >
            <span className="canvas-navigation-radio" aria-hidden />
            <span>
              <strong>Mouse</strong>
              <em>
                Click and drag to pan the canvas. Zoom by scrolling the mouse
                wheel.
              </em>
            </span>
          </button>
        </section>
      )}

      <button
        className="fit-button"
        onClick={() => reactFlow?.fitView(WORKFLOW_FIT_VIEW_OPTIONS)}
        title="Fit canvas"
      >
        <Icon name="fit" size={18} />
      </button>

      {connectPreviewPath && (
        <svg className="connect-preview-line" aria-hidden>
          <path d={connectPreviewPath} />
        </svg>
      )}

      {connectMenu && (
        <section
          className="node-action-menu connect-action-menu"
          style={{ left: connectMenu.x, top: connectMenu.y }}
          aria-label="Add connected block"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="connect-menu-plus" aria-hidden>
            <Icon name="plus" size={18} />
          </div>
          {connectCategories.map((category) => (
            <button
              key={category.id}
              className={`connect-category-row ${
                connectMenu.activeCategory === category.id ? "active" : ""
              } ${category.id === "actions" ? "actions" : ""}`}
              onMouseEnter={() =>
                setConnectMenu((current) =>
                  current
                    ? { ...current, activeCategory: category.id }
                    : current
                )
              }
              onFocus={() =>
                setConnectMenu((current) =>
                  current
                    ? { ...current, activeCategory: category.id }
                    : current
                )
              }
              onClick={() =>
                setConnectMenu((current) =>
                  current
                    ? { ...current, activeCategory: category.id }
                    : current
                )
              }
            >
              {category.icon ? (
                <Icon name={category.icon} size={23} />
              ) : (
                <span />
              )}
              <span>{category.label}</span>
              <span className="connect-menu-chevron">
                <Icon name="chevronRight" size={17} />
              </span>
            </button>
          ))}

          {activeConnectCategory && (
            <section
              className="connect-submenu"
              aria-label={`${activeConnectCategory.label} blocks`}
            >
              {activeConnectCategory.steps.map((step) => (
                <button
                  key={step.type}
                  className="connect-step-row"
                  onClick={() => connectToNewNode(step.type)}
                >
                  <Icon name={step.icon} size={20} />
                  <span>{step.label}</span>
                </button>
              ))}
            </section>
          )}
        </section>
      )}

      {edgeMenu && menuEdge && (
        <section
          className="node-action-menu edge-action-menu"
          style={{ left: edgeMenu.x, top: edgeMenu.y }}
          aria-label="Connection actions"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="edge-menu-actions">
            <button
              type="button"
              className={`edge-icon-button ${edgeMenu.labeling ? "active" : ""}`}
              title="Label line"
              aria-label="Label line"
              onClick={() =>
                setEdgeMenu((current) =>
                  current
                    ? {
                        ...current,
                        labeling: !current.labeling,
                        colorOpen: false,
                        labelValue: menuEdge.data?.label ?? current.labelValue,
                      }
                    : current
                )
              }
            >
              <Icon name="lineText" size={18} />
            </button>
            <button
              type="button"
              className={`edge-icon-button ${edgeMenu.colorOpen ? "active" : ""}`}
              title="Line color"
              aria-label="Line color"
              onClick={() =>
                setEdgeMenu((current) =>
                  current
                    ? {
                        ...current,
                        colorOpen: !current.colorOpen,
                        labeling: false,
                      }
                    : current
                )
              }
            >
              <Icon name="palette" size={18} />
            </button>
            <button
              type="button"
              className="edge-icon-button danger"
              title="Delete connection"
              aria-label="Delete connection"
              onClick={() => deleteEdge(menuEdge.id)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>

          {edgeMenu.labeling && (
            <form className="edge-label-form" onSubmit={submitEdgeLabel}>
              <input
                autoFocus
                value={edgeMenu.labelValue}
                onChange={(event) =>
                  setEdgeMenu((current) =>
                    current
                      ? { ...current, labelValue: event.target.value }
                      : current
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setEdgeMenu(null)
                  }
                }}
                placeholder="Line label"
                aria-label="Line label"
              />
              <button
                type="submit"
                title="Apply label"
                aria-label="Apply label"
              >
                <Icon name="check" size={16} />
              </button>
            </form>
          )}

          {edgeMenu.colorOpen && (
            <div className="edge-menu-colors" aria-label="Line color options">
              {edgeColorOptions.map((color) => (
                <button
                  key={color.value}
                  className={`color-swatch ${
                    (menuEdge.data?.color ?? DEFAULT_EDGE_COLOR) === color.value
                      ? "selected"
                      : ""
                  }`}
                  style={{ "--swatch": color.hex } as CSSProperties}
                  onClick={() => setEdgeColor(menuEdge.id, color.value)}
                  title={color.label}
                  aria-label={color.label}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {canvasMenu && (
        <section
          className="node-action-menu canvas-action-menu"
          style={{ left: canvasMenu.x, top: canvasMenu.y }}
          aria-label="Canvas actions"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="node-menu-row"
            onClick={() =>
              createNodeFromCanvasMenu(
                "playbook",
                "Trigger",
                "Start this path from an external event."
              )
            }
          >
            <span>Add Trigger</span>
          </button>

          <button
            className="node-menu-row"
            disabled={!copiedNode}
            onClick={pasteNodeAtCanvasMenu}
            title={copiedNode ? "Paste copied block" : "Copy a block first"}
          >
            <span>Paste</span>
            <span className="node-menu-shortcut">⌘+V</span>
          </button>

          <div className="node-menu-separator" />

          <button
            className="node-menu-row"
            onClick={() => createNodeFromCanvasMenu("message", "Message")}
          >
            <span>Add Message</span>
            <span className="node-menu-shortcut">M</span>
          </button>

          <button
            className="node-menu-row"
            onClick={() =>
              createNodeFromCanvasMenu(
                "image",
                "Image",
                "Send an image in chat."
              )
            }
          >
            <span>Add Image</span>
            <span className="node-menu-shortcut">I</span>
          </button>

          <button
            className="node-menu-row"
            onClick={() =>
              createNodeFromCanvasMenu(
                "customAction",
                "Comment",
                "Canvas note for this workflow."
              )
            }
          >
            <span>Add Comment</span>
            <span className="node-menu-shortcut">C</span>
          </button>

          <div className="node-menu-separator" />

          <button className="node-menu-row" onClick={returnToStart}>
            <span>Return to Start</span>
            <span className="node-menu-shortcut">S</span>
          </button>

          <button className="node-menu-row" onClick={() => zoomCanvas("in")}>
            <span>Zoom In</span>
            <span className="node-menu-shortcut">+</span>
          </button>

          <button className="node-menu-row" onClick={() => zoomCanvas("out")}>
            <span>Zoom Out</span>
            <span className="node-menu-shortcut">-</span>
          </button>
        </section>
      )}

      {nodeMenu && menuNode && (
        <section
          className="node-action-menu"
          style={{ left: nodeMenu.x, top: nodeMenu.y }}
          aria-label={`${getNodeDisplayName(menuNode)} actions`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className={`node-menu-row ${nodeMenu.colorOpen ? "active" : ""}`}
            onClick={() =>
              setNodeMenu((current) =>
                current
                  ? { ...current, colorOpen: !current.colorOpen }
                  : current
              )
            }
          >
            <span>Block color</span>
            <span className="node-menu-chevron">
              <Icon name="chevronRight" size={17} />
            </span>
          </button>

          {nodeMenu.colorOpen && (
            <div className="node-menu-colors" aria-label="Block color options">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  className={`color-swatch ${
                    menuNode.data.blockColor === color.value ||
                    (!menuNode.data.blockColor && color.value === "default")
                      ? "selected"
                      : ""
                  }`}
                  style={{ "--swatch": color.hex } as CSSProperties}
                  onClick={() => setBlockColor(menuNode.id, color.value)}
                  title={color.label}
                  aria-label={color.label}
                />
              ))}
            </div>
          )}

          {!isStartMenu && (
            <>
              <button
                className="node-menu-row"
                onClick={() => createComponentFromNode(menuNode)}
              >
                <span>Create component</span>
                <span className="node-menu-shortcut">⇧⌘C</span>
              </button>

              <div className="node-menu-separator" />
            </>
          )}

          {nodeMenu.renaming ? (
            <form className="node-rename-form" onSubmit={submitRename}>
              <input
                autoFocus
                value={nodeMenu.renameValue}
                onChange={(event) =>
                  setNodeMenu((current) =>
                    current
                      ? { ...current, renameValue: event.target.value }
                      : current
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setNodeMenu(null)
                  }
                }}
                aria-label="New block name"
              />
              <button type="submit">Rename</button>
            </form>
          ) : (
            <button
              className="node-menu-row"
              onClick={() =>
                setNodeMenu((current) =>
                  current
                    ? {
                        ...current,
                        renaming: true,
                        renameValue: getNodeDisplayName(menuNode),
                      }
                    : current
                )
              }
            >
              <span>Rename</span>
            </button>
          )}

          {!isStartMenu && (
            <>
              <button
                className="node-menu-row"
                onClick={() => copyNode(menuNode)}
              >
                <span>Copy</span>
                <span className="node-menu-shortcut">⌘C</span>
              </button>

              <button
                className="node-menu-row"
                onClick={() => duplicateNode(menuNode)}
              >
                <span>Duplicate</span>
                <span className="node-menu-shortcut">⌘D</span>
              </button>

              <div className="node-menu-separator" />

              <button
                className="node-menu-row danger"
                onClick={() => deleteNode(menuNode)}
              >
                <span>Delete</span>
                <span className="node-menu-shortcut">Del</span>
              </button>
            </>
          )}
        </section>
      )}

      {selectedNode && selectedNode.type !== "start" && !nodeMenu && (
        <aside
          className={`inspector-sheet visible ${
            selectedNode.type === "message" ||
            selectedNode.type === "image" ||
            selectedNode.type === "card"
              ? "message-editor-sheet"
              : ""
          } ${selectedNode.type === "image" ? "image-editor-sheet" : ""} ${
            selectedNode.type === "card" ? "card-editor-sheet" : ""
          }`}
        >
          {selectedNode.type === "message" ? (
            (() => {
              const data = selectedNode.data as MessageNodeData

              return (
                <section className="message-editor-panel">
                  <div className="message-editor-header">
                    <h2>Message</h2>
                    {renderInspectorActions(selectedNode)}
                  </div>
                  <div className="message-compose-area">
                    <div
                      className="message-editor-toolbar"
                      aria-label="Message tools"
                    >
                      <button
                        type="button"
                        title="Open chat preview"
                        onClick={() => setDrawerMode("run")}
                      >
                        <Icon name="play" size={18} />
                      </button>
                      <span aria-hidden />
                      <button
                        type="button"
                        title="Bold"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) =>
                          formatMessageText(
                            selectedNode.id,
                            "bold",
                            event.currentTarget
                              .closest(".message-editor-panel")
                              ?.querySelector<HTMLElement>(
                                ".message-editor-input"
                              ) ?? null
                          )
                        }
                      >
                        B
                      </button>
                      <button
                        type="button"
                        title="Italic"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) =>
                          formatMessageText(
                            selectedNode.id,
                            "italic",
                            event.currentTarget
                              .closest(".message-editor-panel")
                              ?.querySelector<HTMLElement>(
                                ".message-editor-input"
                              ) ?? null
                          )
                        }
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        title="Underline"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) =>
                          formatMessageText(
                            selectedNode.id,
                            "underline",
                            event.currentTarget
                              .closest(".message-editor-panel")
                              ?.querySelector<HTMLElement>(
                                ".message-editor-input"
                              ) ?? null
                          )
                        }
                      >
                        <u>U</u>
                      </button>
                      <button
                        type="button"
                        title="Strikethrough"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) =>
                          formatMessageText(
                            selectedNode.id,
                            "strike",
                            event.currentTarget
                              .closest(".message-editor-panel")
                              ?.querySelector<HTMLElement>(
                                ".message-editor-input"
                              ) ?? null
                          )
                        }
                      >
                        <s>S</s>
                      </button>
                      <span aria-hidden />
                      <button
                        type="button"
                        title="Insert link"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) =>
                          formatMessageText(
                            selectedNode.id,
                            "link",
                            event.currentTarget
                              .closest(".message-editor-panel")
                              ?.querySelector<HTMLElement>(
                                ".message-editor-input"
                              ) ?? null
                          )
                        }
                      >
                        <Icon name="link" size={16} />
                      </button>
                    </div>
                    <MessageEditorInput
                      nodeId={selectedNode.id}
                      value={data.text}
                      placeholder="Enter message"
                      ariaLabel="Message"
                      onSync={syncMessageEditor}
                    />
                  </div>
                </section>
              )
            })()
          ) : selectedNode.type === "image" ? (
            (() => {
              const data = selectedNode.data as ImageNodeData
              const imageUrl = data.url ?? ""
              const imageSource = data.source ?? "upload"
              const uploadInputId = `image-upload-${selectedNode.id}`

              return (
                <section className="message-editor-panel image-editor-panel">
                  <div className="message-editor-header">
                    <h2>Image</h2>
                    {renderInspectorActions(selectedNode)}
                  </div>
                  <div className="message-compose-area image-compose-area">
                    <div
                      className="image-source-tabs"
                      aria-label="Image source"
                    >
                      <button
                        type="button"
                        className={imageSource === "upload" ? "active" : ""}
                        onClick={() =>
                          updateNodeData(selectedNode.id, {
                            ...data,
                            source: "upload",
                          })
                        }
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        className={imageSource === "link" ? "active" : ""}
                        onClick={() =>
                          updateNodeData(selectedNode.id, {
                            ...data,
                            source: "link",
                          })
                        }
                      >
                        Link
                      </button>
                    </div>

                    {imageSource === "link" ? (
                      <div className="image-link-editor">
                        <input
                          type="url"
                          value={imageUrl}
                          placeholder="Enter file URL or {variable}"
                          onChange={(event) =>
                            updateNodeData(selectedNode.id, {
                              ...data,
                              source: "link",
                              url: event.target.value,
                            })
                          }
                          aria-label="Image link"
                        />
                      </div>
                    ) : (
                      <div
                        className={`image-upload-dropzone ${imageUrl ? "has-image" : ""}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault()
                          readImageFile(
                            selectedNode.id,
                            data,
                            event.dataTransfer.files[0]
                          )
                        }}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={data.alt || "Uploaded image"}
                          />
                        ) : (
                          <>
                            <p>Drag & drop image/GIF here. Or,</p>
                            <label
                              className="image-browse-button"
                              htmlFor={uploadInputId}
                            >
                              Browse
                            </label>
                          </>
                        )}
                        <input
                          id={uploadInputId}
                          className="sr-only"
                          type="file"
                          accept="image/*,.gif"
                          onChange={(event) =>
                            readImageFile(
                              selectedNode.id,
                              data,
                              event.target.files?.[0]
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="image-help-section">
                    <button type="button" className="image-help-link">
                      How it works?
                    </button>
                  </div>
                </section>
              )
            })()
          ) : selectedNode.type === "card" ? (
            (() => {
              const data = selectedNode.data as CardNodeData
              const imageUrl = data.url ?? ""
              const imageSource = data.source ?? "upload"
              const uploadInputId = `card-upload-${selectedNode.id}`
              const editingButton =
                cardButtonEditor?.nodeId === selectedNode.id
                  ? (data.buttons.find(
                      (button) => button.id === cardButtonEditor.buttonId
                    ) ?? null)
                  : null

              const addCardButton = () => {
                const button = createButton("New button")

                updateNodeData(selectedNode.id, {
                  ...data,
                  buttons: [...data.buttons, button],
                })
                setCardButtonEditor({
                  nodeId: selectedNode.id,
                  buttonId: button.id,
                })
              }

              if (editingButton) {
                return (
                  <section className="message-editor-panel card-editor-panel">
                    <div className="message-editor-header card-button-editor-header">
                      <div className="card-header-title">
                        <button
                          type="button"
                          title="Back to card"
                          aria-label="Back to card"
                          onClick={() => setCardButtonEditor(null)}
                        >
                          <Icon name="chevronRight" size={20} />
                        </button>
                        <h2>Card</h2>
                      </div>
                      {renderInspectorActions(selectedNode)}
                    </div>

                    <div className="card-button-editor-body">
                      <input
                        autoFocus
                        value={editingButton.label}
                        placeholder="Enter button label, { to add variable"
                        aria-label="Button label"
                        onChange={(event) => {
                          const nextButtons = data.buttons.map((button) =>
                            button.id === editingButton.id
                              ? { ...button, label: event.target.value }
                              : button
                          )

                          updateNodeData(selectedNode.id, {
                            ...data,
                            buttons: nextButtons,
                          })
                        }}
                      />
                    </div>

                    <div className="card-actions-row">
                      <span>Actions</span>
                      <button
                        type="button"
                        title="Add action"
                        aria-label="Add action"
                        onClick={() =>
                          setStatus(
                            "Connect this card button from its canvas handle."
                          )
                        }
                      >
                        <Icon name="plus" size={22} />
                      </button>
                    </div>
                  </section>
                )
              }

              return (
                <section className="message-editor-panel card-editor-panel">
                  <div className="message-editor-header">
                    <h2>Card</h2>
                    {renderInspectorActions(selectedNode)}
                  </div>

                  <div className="message-compose-area image-compose-area card-compose-area">
                    <div
                      className="image-source-tabs"
                      aria-label="Card image source"
                    >
                      <button
                        type="button"
                        className={imageSource === "upload" ? "active" : ""}
                        onClick={() =>
                          updateNodeData(selectedNode.id, {
                            ...data,
                            source: "upload",
                          })
                        }
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        className={imageSource === "link" ? "active" : ""}
                        onClick={() =>
                          updateNodeData(selectedNode.id, {
                            ...data,
                            source: "link",
                          })
                        }
                      >
                        Link
                      </button>
                    </div>

                    {imageSource === "link" ? (
                      <div className="image-link-editor">
                        <input
                          type="url"
                          value={imageUrl}
                          placeholder="Enter image URL or {variable}"
                          onChange={(event) =>
                            updateNodeData(selectedNode.id, {
                              ...data,
                              source: "link",
                              url: event.target.value,
                            })
                          }
                          aria-label="Card image link"
                        />
                      </div>
                    ) : (
                      <div
                        className={`image-upload-dropzone card-upload-dropzone ${
                          imageUrl ? "has-image" : ""
                        }`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault()
                          readCardImageFile(
                            selectedNode.id,
                            data,
                            event.dataTransfer.files[0]
                          )
                        }}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={data.alt || "Uploaded card image"}
                          />
                        ) : (
                          <>
                            <p>Drag & drop image/GIF here. Or,</p>
                            <label
                              className="image-browse-button"
                              htmlFor={uploadInputId}
                            >
                              Browse
                            </label>
                          </>
                        )}
                        <input
                          id={uploadInputId}
                          className="sr-only"
                          type="file"
                          accept="image/*,.gif"
                          onChange={(event) =>
                            readCardImageFile(
                              selectedNode.id,
                              data,
                              event.target.files?.[0]
                            )
                          }
                        />
                      </div>
                    )}

                    <input
                      className="card-title-input"
                      value={data.title}
                      placeholder="Enter card title, { to add variable"
                      aria-label="Card title"
                      onChange={(event) =>
                        updateNodeData(selectedNode.id, {
                          ...data,
                          title: event.target.value,
                        })
                      }
                    />

                    <div className="card-description-editor">
                      <MessageEditorInput
                        nodeId={selectedNode.id}
                        value={data.description}
                        placeholder="Enter card description, { to add variable"
                        ariaLabel="Card description"
                        onSync={(_nodeId, html) =>
                          updateNodeData(selectedNode.id, {
                            ...data,
                            description: html,
                          })
                        }
                      />
                      <div
                        className="message-editor-toolbar card-editor-toolbar"
                        aria-label="Card description tools"
                      >
                        <button
                          type="button"
                          title="Bold"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) =>
                            formatRichText(
                              "bold",
                              event.currentTarget
                                .closest(".card-description-editor")
                                ?.querySelector<HTMLElement>(
                                  ".message-editor-input"
                                ) ?? null,
                              (html) =>
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  description: html,
                                })
                            )
                          }
                        >
                          B
                        </button>
                        <button
                          type="button"
                          title="Italic"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) =>
                            formatRichText(
                              "italic",
                              event.currentTarget
                                .closest(".card-description-editor")
                                ?.querySelector<HTMLElement>(
                                  ".message-editor-input"
                                ) ?? null,
                              (html) =>
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  description: html,
                                })
                            )
                          }
                        >
                          <em>I</em>
                        </button>
                        <button
                          type="button"
                          title="Underline"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) =>
                            formatRichText(
                              "underline",
                              event.currentTarget
                                .closest(".card-description-editor")
                                ?.querySelector<HTMLElement>(
                                  ".message-editor-input"
                                ) ?? null,
                              (html) =>
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  description: html,
                                })
                            )
                          }
                        >
                          <u>U</u>
                        </button>
                        <button
                          type="button"
                          title="Strikethrough"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) =>
                            formatRichText(
                              "strike",
                              event.currentTarget
                                .closest(".card-description-editor")
                                ?.querySelector<HTMLElement>(
                                  ".message-editor-input"
                                ) ?? null,
                              (html) =>
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  description: html,
                                })
                            )
                          }
                        >
                          <s>S</s>
                        </button>
                        <span aria-hidden />
                        <button
                          type="button"
                          title="Insert link"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) =>
                            formatRichText(
                              "link",
                              event.currentTarget
                                .closest(".card-description-editor")
                                ?.querySelector<HTMLElement>(
                                  ".message-editor-input"
                                ) ?? null,
                              (html) =>
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  description: html,
                                })
                            )
                          }
                        >
                          <Icon name="link" size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-buttons-section">
                    <div className="card-buttons-heading">
                      <span>Buttons</span>
                      <button
                        type="button"
                        title="Add button"
                        aria-label="Add button"
                        onClick={addCardButton}
                      >
                        <Icon name="plus" size={22} />
                      </button>
                    </div>

                    {data.buttons.map((button) => (
                      <div className="card-button-row" key={button.id}>
                        <button
                          type="button"
                          className="card-button-edit"
                          onClick={() =>
                            setCardButtonEditor({
                              nodeId: selectedNode.id,
                              buttonId: button.id,
                            })
                          }
                        >
                          <Icon name="play" size={18} />
                          <span>{button.label || "Button"}</span>
                        </button>
                        <button
                          type="button"
                          className="card-button-remove"
                          title="Remove button"
                          aria-label={`Remove ${button.label || "button"}`}
                          onClick={() => {
                            updateNodeData(selectedNode.id, {
                              ...data,
                              buttons: data.buttons.filter(
                                (candidate) => candidate.id !== button.id
                              ),
                            })
                          }}
                        >
                          -
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="image-help-section card-help-section">
                    <button type="button" className="image-help-link">
                      How it works?
                    </button>
                    <button
                      type="button"
                      className="card-help-settings"
                      title="Card settings"
                    >
                      <Icon name="settings" size={18} />
                    </button>
                  </div>
                </section>
              )
            })()
          ) : (
            <>
              <div className="sheet-header">
                <div>
                  <h2>{selectedGenericData?.label}</h2>
                  <p>Configure the selected step.</p>
                </div>
                {renderInspectorActions(selectedNode)}
              </div>

              <div className="form">
                <div className="helper">Node id: {selectedNode.id}</div>
                {selectedNode.type === "buttons" &&
                  (() => {
                    const data = selectedNode.data as ButtonsNodeData

                    return (
                      <div className="stack">
                        <label>Buttons</label>
                        {data.buttons.map((button, index) => (
                          <div className="field-row" key={button.id}>
                            <input
                              value={button.label}
                              onChange={(event) => {
                                const nextButtons = [...data.buttons]
                                const currentButton = nextButtons[index]

                                if (!currentButton) {
                                  return
                                }

                                nextButtons[index] = {
                                  ...currentButton,
                                  label: event.target.value,
                                }
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  buttons: nextButtons,
                                })
                              }}
                            />
                            <button
                              className="mini-button"
                              onClick={() => {
                                const nextButtons = data.buttons.filter(
                                  (_, btnIndex) => btnIndex !== index
                                )
                                updateNodeData(selectedNode.id, {
                                  ...data,
                                  buttons: nextButtons,
                                })
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          onClick={() => {
                            updateNodeData(selectedNode.id, {
                              ...data,
                              buttons: [
                                ...data.buttons,
                                createButton("New option"),
                              ],
                            })
                          }}
                        >
                          Add button
                        </button>
                      </div>
                    )
                  })()}
                {selectedNode.type === "setVariable" &&
                  (() => {
                    const data = selectedNode.data as SetVariableNodeData

                    return (
                      <>
                        <label>
                          Variable
                          <input
                            value={data.key}
                            onChange={(event) =>
                              updateNodeData(selectedNode.id, {
                                ...data,
                                key: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Value
                          <input
                            value={data.value}
                            onChange={(event) =>
                              updateNodeData(selectedNode.id, {
                                ...data,
                                value: event.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    )
                  })()}
                {selectedNode.type === "condition" &&
                  (() => {
                    const data = selectedNode.data as ConditionNodeData

                    return (
                      <>
                        <label>
                          Variable
                          <input
                            value={data.key}
                            onChange={(event) =>
                              updateNodeData(selectedNode.id, {
                                ...data,
                                key: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Operator
                          <select
                            value={data.operator}
                            onChange={(event) =>
                              updateNodeData(selectedNode.id, {
                                ...data,
                                operator: event.target.value as
                                  | "equals"
                                  | "not_equals",
                              })
                            }
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not equals</option>
                          </select>
                        </label>
                        <label>
                          Value
                          <input
                            value={data.value}
                            onChange={(event) =>
                              updateNodeData(selectedNode.id, {
                                ...data,
                                value: event.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    )
                  })()}
                {![
                  "message",
                  "image",
                  "card",
                  "buttons",
                  "setVariable",
                  "condition",
                  "start",
                ].includes(selectedNode.type ?? "") && (
                  <>
                    <label>
                      Label
                      <input
                        value={selectedGenericData?.label ?? ""}
                        onChange={(event) =>
                          updateNodeData(selectedNode.id, {
                            ...(selectedGenericData ?? {}),
                            label: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={selectedGenericData?.description ?? ""}
                        onChange={(event) =>
                          updateNodeData(selectedNode.id, {
                            ...(selectedGenericData ?? {}),
                            label: selectedGenericData?.label ?? "Step",
                            description: event.target.value,
                            accent:
                              selectedGenericData?.accent ??
                              getAccent(selectedNode.type as NodeType),
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            </>
          )}
        </aside>
      )}

      {drawerMode && (
        <aside
          className={`side-drawer ${drawerMode === "run" ? "chat-inspector-sheet" : ""}`}
        >
          {drawerMode !== "run" && (
            <div className="sheet-header">
              <div>
                <h2>
                  {drawerMode === "library" ? "Workflow library" : "Workflow"}
                </h2>
                <p>
                  {drawerMode === "library"
                    ? "Load saved workflows."
                    : `Schema v${WORKFLOW_SCHEMA_VERSION}`}
                </p>
              </div>
              <button onClick={() => setDrawerMode(null)} title="Close drawer">
                <Icon name="close" size={20} />
              </button>
            </div>
          )}

          {drawerMode === "run" ? (
            <RunPanel
              nodes={nodes}
              edges={edges}
              autoStartKey={runLaunchKey}
              onAutoStartComplete={completeRunLaunch}
              onClose={() => setDrawerMode(null)}
            />
          ) : drawerMode === "library" ? (
            <div className="library-list">
              <button className="secondary-button" onClick={refreshLibrary}>
                Refresh library
              </button>
              {library.length === 0 ? (
                <div className="empty">No saved workflows yet.</div>
              ) : (
                library.map((workflow) => (
                  <button
                    key={workflow.id}
                    className="library-item"
                    onClick={() => handleLoad(workflow.id)}
                  >
                    <span>
                      {workflow.name}
                      {workflow.isActive ? " - Active" : ""}
                    </span>
                    <em>{workflow.description || "No description."}</em>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="form">
              <label>
                Description
                <textarea
                  value={workflowDescription}
                  onChange={(event) =>
                    setWorkflowDescription(event.target.value)
                  }
                  placeholder="Tell the agent when this workflow should run."
                />
              </label>
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
