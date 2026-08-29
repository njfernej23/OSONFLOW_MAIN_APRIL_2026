"use client"

import {
  useCallback,
  useEffect,
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
  type AgentNodeData,
  type ButtonOption,
  type ButtonsNodeData,
  type CaptureNodeData,
  type CardNodeData,
  type ChoiceNodeData,
  type ConditionNodeData,
  type GenericNodeData,
  type ImageNodeData,
  type KbSearchNodeData,
  type MessageNodeData,
  type NodeData,
  type NodeType,
  type PromptNodeData,
  type SetVariableNodeData,
  type ApiNodeData,
  type CarouselCard,
  type CarouselNodeData,
  type CustomActionNodeData,
  type JavascriptNodeData,
  type ToolNodeData,
  type ComponentNodeData,
  type BlockNodeData,
  type BlockStep,
  type FunctionNodeData,
  type WorkflowDefinition,
  type WorkflowEdgeData,
} from "../lib/types"
import {
  API_METHODS,
  isAgentStepType,
  isTerminalStepType,
  stepPorts,
} from "../lib/types"
import {
  validateWorkflow,
  type ValidationIssue,
} from "../lib/validate-workflow"
import StartNode from "../nodes/StartNode"
import MessageNode from "../nodes/MessageNode"
import ImageNode from "../nodes/ImageNode"
import CardNode from "../nodes/CardNode"
import ButtonsNode from "../nodes/ButtonsNode"
import CaptureNode from "../nodes/CaptureNode"
import ChoiceNode from "../nodes/ChoiceNode"
import SetVariableNode from "../nodes/SetVariableNode"
import ConditionNode from "../nodes/ConditionNode"
import ApiNode from "../nodes/ApiNode"
import CarouselNode from "../nodes/CarouselNode"
import JavascriptNode from "../nodes/JavascriptNode"
import CustomActionNode from "../nodes/CustomActionNode"
import ToolNode from "../nodes/ToolNode"
import ComponentNode from "../nodes/ComponentNode"
import BlockNode, { BlockStepSelectionContext } from "../nodes/BlockNode"
import FunctionNode from "../nodes/FunctionNode"
import GenericStepNode from "../nodes/GenericStepNode"
import AgentNode from "../nodes/AgentNode"
import { NodeRenameContext } from "../nodes/NodeRenameContext"
import Icon, { type IconName } from "../nodes/StepIcon"
import RunPanel from "./run-panel"
import AgentEditor, { type AgentEditorToolSummary } from "./agent-editor"
import { MessageEditorInput } from "./message-editor-input"
import { VariableInput } from "./variable-input"
import { collectWorkflowVariables } from "../lib/variable-tokens"

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

type ComponentCandidate = {
  id: Id<"workflows">
  name: string
  isPublished: boolean
  publishedAt: number | null
}

type AssistantToolSummary = {
  _id: string
  name: string
  description: string
  type: AgentEditorToolSummary["type"]
  isEnabled: boolean
  parameters?: Array<{
    name: string
    description: string
    type: "string" | "number" | "boolean"
    required: boolean
  }>
}

type OrganizationCollaborator = {
  id: string
  name: string
  initials: string
  identifier: string
  role: string
  isActive: boolean
}

type GraphSnapshot = {
  nodes: DefinitionNode[]
  edges: DefinitionEdge[]
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
const CANVAS_DOT_GAP = 24
const CANVAS_DOT_SIZE = 1.4
const CANVAS_DOT_COLOR = "rgba(26, 29, 35, 0.14)"
const CONNECT_MENU_WIDTH = 246
const CONNECT_SUBMENU_WIDTH = 228
const CONNECT_MENU_GAP = 10
const CONNECT_MENU_HEIGHT = 292
const CONNECT_MENU_PLUS_CENTER_OFFSET = { x: -3, y: 1 }

/* Presence pacing. Every cursor broadcast is a Convex write that fans out to
   each subscriber, so it is deliberately coarser than a render frame. */
const CURSOR_BROADCAST_MS = 120
const CURSOR_MOVE_EPSILON = 1.5
const PRESENCE_HEARTBEAT_MS = 15_000

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


const genericNodeTypes = {
  playbook: AgentNode,
  agent: AgentNode,
  crew: AgentNode,
  operator: AgentNode,
  prompt: GenericStepNode,
  choice: ChoiceNode,
  capture: CaptureNode,
  end: GenericStepNode,
  kbSearch: GenericStepNode,
  callForward: GenericStepNode,
}

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  image: ImageNode,
  card: CardNode,
  buttons: ButtonsNode,
  setVariable: SetVariableNode,
  condition: ConditionNode,
  api: ApiNode,
  carousel: CarouselNode,
  javascript: JavascriptNode,
  customAction: CustomActionNode,
  tool: ToolNode,
  component: ComponentNode,
  block: BlockNode,
  function: FunctionNode,
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
    case "block":
      return { width: 300, height: 132 }
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
  // Graphs saved before the palette change carry the old slate default; treat
  // it as "unset" so they pick up the current neutral instead of staying dark.
  const savedColor = data?.color === LEGACY_EDGE_COLOR ? undefined : data?.color
  const color = savedColor ?? DEFAULT_EDGE_COLOR

  return {
    ...edge,
    id: edge.id ?? createId("edge"),
    type: "workflow",
    // Dashes are the run overlay's signal; a resting graph draws solid.
    animated: false,
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

const colorOptions: Array<{ value: BlockColor; label: string; hex: string }> = [
  { value: "default", label: "Default", hex: "#d5dfe1" },
  { value: "blue", label: "Blue", hex: "#4385f5" },
  { value: "green", label: "Green", hex: "#4d8d35" },
  { value: "orange", label: "Orange", hex: "#e4a62f" },
  { value: "purple", label: "Purple", hex: "#9b5bd5" },
  { value: "rose", label: "Rose", hex: "#bd4d68" },
]

const DEFAULT_EDGE_COLOR = "#b0b6c0"
const LEGACY_EDGE_COLOR = "#395064"

const edgeColorOptions: Array<{ value: string; label: string; hex: string }> = [
  { value: DEFAULT_EDGE_COLOR, label: "Default", hex: DEFAULT_EDGE_COLOR },
  { value: "#397dff", label: "Blue", hex: "#397dff" },
  { value: "#039855", label: "Green", hex: "#039855" },
  { value: "#dc6803", label: "Orange", hex: "#dc6803" },
  { value: "#7a5af8", label: "Purple", hex: "#7a5af8" },
  { value: "#d92d20", label: "Rose", hex: "#d92d20" },
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
      deletable: false,
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
    case "choice":
      return {
        label: "Choice",
        choices: [createButton("Option A"), createButton("Option B")],
        variableKey: "choice",
        prompt: "",
      }
    case "capture":
      return {
        label: "Capture",
        variableKey: "lastInput",
        prompt: "Please reply with your answer.",
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
    case "prompt":
      return {
        label: "Prompt",
        instructions:
          "Write a short helpful reply using the latest user message and workflow variables.",
        useKnowledgeBase: false,
        outputVariable: "lastAiResponse",
      }
    case "kbSearch":
      return {
        label: "KB search",
        query: "{{lastInput}}",
        outputVariable: "kbAnswer",
        sendAsMessage: true,
      }
    case "playbook":
    case "agent":
    case "crew":
    case "operator":
      return {
        label: getStepOption(type)?.label ?? "Agent",
        instructions:
          "Help the user with their request. Use knowledge base context when available.",
        talksFirst: true,
        useKnowledgeBase: true,
        outputVariable: "lastAiResponse",
        accent: "agent",
      }
    case "api":
      return {
        label: "API",
        method: "GET",
        url: "",
        headers: [],
        body: "",
        responseVariable: "apiResponse",
        statusVariable: "apiStatus",
      }
    case "carousel":
      return {
        label: "Carousel",
        cards: [
          {
            id: createId("card"),
            title: "First option",
            description: "",
            url: "",
            buttons: [createButton("Choose this")],
          },
        ],
      }
    case "component":
      return {
        label: "Component",
        workflowId: "",
        inputs: [],
      }
    case "tool":
      return {
        label: "Tool",
        toolName: "",
        arguments: [],
        outputVariable: "toolResult",
      }
    case "customAction":
      return {
        label: "Custom action",
        actionName: "custom_action",
        payload: '{\n  "source": "workflow"\n}',
      }
    case "function":
      return {
        label: "Function",
        code: [
          "// Return { next, outputs } to choose a path and set variables.",
          "const tier = variables.tier ?? \"free\";",
          "return {",
          "  next: tier === \"pro\" ? \"pro\" : \"standard\",",
          "  outputs: { greeting: `Hello ${tier} customer` },",
          "};",
        ].join("\n"),
        paths: [
          { id: createId("path"), name: "pro" },
          { id: createId("path"), name: "standard" },
          { id: createId("path"), name: "error" },
        ],
      }
    case "javascript":
      return {
        label: "JavaScript",
        code: "// variables holds the workflow state as strings.\n// Assign to it, or return an object, to set variables.\nreturn { greeting: `Hello ${variables.name ?? \"there\"}` };",
        outputVariables: [],
      }
    case "callForward":
      return {
        label: "Call forward",
        description: "Connecting you with a human operator now.",
        accent: "dev",
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

  if ("buttons" in copy && Array.isArray(copy.buttons)) {
    return {
      ...copy,
      buttons: copy.buttons.map((button) => ({
        ...button,
        id: createId("btn"),
      })),
    }
  }

  if ("choices" in copy && Array.isArray(copy.choices)) {
    return {
      ...copy,
      choices: copy.choices.map((choice) => ({
        ...choice,
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
    // The block menu already refuses to delete Start; keep the keyboard in
    // step with it instead of letting Backspace orphan the whole graph.
    deletable: node.type !== "start",
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
  const assistantTools = useQuery(api.private.assistantTools.list) as
    | AssistantToolSummary[]
    | undefined
  const componentCandidates = useQuery(
    api.private.workflows.listComponentCandidates
  ) as ComponentCandidate[] | undefined
  const saveWorkflow = useMutation(api.private.workflows.save)
  const publishWorkflow = useMutation(api.private.workflows.publish)
  const deactivateWorkflow = useMutation(api.private.workflows.deactivate)
  const syncLiveWorkflow = useMutation(api.private.workflows.syncLive)
  const heartbeatPresence = useMutation(api.private.workflows.heartbeatPresence)
  const leavePresence = useMutation(api.private.workflows.leavePresence)
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
  const nodesRef = useRef<WorkflowNode[]>([])
  const categoryCloseTimerRef = useRef<number | null>(null)
  const runLaunchTimerRef = useRef<number | null>(null)
  const loadedWorkflowRef = useRef<string | null>(null)
  /**
   * Undo history. Snapshots are taken at rest rather than per change, so a
   * drag or a burst of typing collapses into one undoable step.
   */
  const historyRef = useRef<{
    past: GraphSnapshot[]
    future: GraphSnapshot[]
  }>({ past: [], future: [] })
  const lastSettledGraphRef = useRef<GraphSnapshot | null>(null)
  const isRestoringHistoryRef = useRef(false)

  /**
   * Reflect the open workflow in the address bar so a refresh reopens it.
   * history.replaceState is used on purpose: router.replace would swap the
   * /workflows route segment for /workflows/[workflowId] and remount the
   * canvas mid-edit.
   */
  const syncWorkflowUrl = useCallback((id: Id<"workflows"> | null) => {
    // /workflows is the list; an unsaved draft lives at /workflows/new.
    const nextPath = id ? `/workflows/${id}` : "/workflows/new"

    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, "", nextPath)
    }
  }, [])
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => initialGraph.nodes)
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => initialGraph.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [workflowId, setWorkflowId] = useState<Id<"workflows"> | null>(null)
  const [loadWorkflowId, setLoadWorkflowId] = useState<Id<"workflows"> | null>(
    (initialWorkflowId as Id<"workflows"> | undefined) ?? null
  )
  const [workflowName, setWorkflowName] = useState("Untitled workflow")
  const [workflowDescription, setWorkflowDescription] = useState(
    "Route users through deterministic steps with agent handoffs where needed."
  )
  const [presenceNow, setPresenceNow] = useState(() => Date.now())
  const [status, setStatus] = useState<string>("Ready.")
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false)
  const [isPublishingWorkflow, setIsPublishingWorkflow] = useState(false)
  const [isDeactivatingWorkflow, setIsDeactivatingWorkflow] = useState(false)
  const [isPublishingComponent, setIsPublishingComponent] = useState(false)
  const [isCreatingComponent, setIsCreatingComponent] = useState(false)
  const [validationIssues, setValidationIssues] = useState<
    ValidationIssue[] | null
  >(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [blockStepSelection, setBlockStepSelection] = useState<{
    nodeId: string
    stepId: string
  } | null>(null)
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
  const [runActiveNodeId, setRunActiveNodeId] = useState<string | null>(null)
  const [runWaitingNodeId, setRunWaitingNodeId] = useState<string | null>(null)
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
  // Presence rides on Convex: listPresence is a live query, so cursors and
  // avatars arrive on the same subscription the graph itself uses.
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

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

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
    if (
      remoteSelectionByNodeId.size === 0 &&
      !runActiveNodeId &&
      !runWaitingNodeId
    ) {
      return nodes
    }

    return nodes.map((node) => {
      const selection = remoteSelectionByNodeId.get(node.id)
      const runClass =
        node.id === runWaitingNodeId
          ? "node-run-waiting"
          : node.id === runActiveNodeId
            ? "node-run-active"
            : ""

      if (!selection && !runClass) {
        return node
      }

      return {
        ...node,
        className: [node.className, selection ? "remote-selected-node" : "", runClass]
          .filter(Boolean)
          .join(" "),
        style: {
          ...node.style,
          ...(selection
            ? ({ "--remote-selection-color": selection.color } as CSSProperties)
            : null),
        } as CSSProperties,
      }
    })
  }, [nodes, remoteSelectionByNodeId, runActiveNodeId, runWaitingNodeId])

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
    setSelectedNodeIds([])
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
    setSelectedNodeIds([node.id])
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
    setRunActiveNodeId(null)
    setRunWaitingNodeId(null)
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

  /**
   * Bring a block into the strip of canvas that is not covered by the open
   * side panel. Blocks that are already fully visible are left alone: yanking
   * the viewport on every selection (and on every keystroke in the inspector)
   * made the canvas feel like it was fighting the user.
   */
  /**
   * Reads a pixel length off the builder shell. The run dock publishes its live
   * height there, so the canvas can keep clear of whatever is actually docked.
   */
  const readShellLength = (name: string, fallback: number) => {
    const shell = document.querySelector(".builder-shell")

    if (!(shell instanceof HTMLElement)) {
      return fallback
    }

    const value = Number.parseFloat(
      window.getComputedStyle(shell).getPropertyValue(name)
    )

    return Number.isFinite(value) ? value : fallback
  }

  /**
   * Puts a node in the middle of the canvas the run leaves visible — between
   * the step rail and the chat panel, above the log dock. The run follows the
   * conversation, so the step that just fired is always under the eye instead
   * of somewhere off screen.
   */
  const centerNodeForRun = useCallback(
    (node: WorkflowNode, duration: number) => {
      if (!reactFlow) {
        return
      }

      const zoom = reactFlow.getZoom()
      const inset = readShellLength("--panel-inset", 14)
      const chatWidth = readShellLength("--panel-w", 384)
      const dockHeight = readShellLength("--dock-h", 264)

      const left = 92
      const right = Math.max(
        left + 200,
        window.innerWidth - chatWidth - inset * 2
      )
      const top = 76
      const bottom = Math.max(
        top + 160,
        window.innerHeight - dockHeight - inset * 2
      )

      const width = node.width ?? (node.type === "start" ? 148 : 300)
      const height = node.height ?? (node.type === "start" ? 56 : 126)

      reactFlow.setViewport(
        {
          x: (left + right) / 2 - (node.position.x + width / 2) * zoom,
          y: (top + bottom) / 2 - (node.position.y + height / 2) * zoom,
          zoom,
        },
        { duration }
      )
    },
    [reactFlow]
  )

  const revealNodeBesidePanel = useCallback(
    (node: WorkflowNode, duration: number) => {
      if (!reactFlow) {
        return
      }

      const zoom = reactFlow.getZoom()
      const width = (node.width ?? (node.type === "start" ? 148 : 300)) * zoom
      const height = (node.height ?? (node.type === "start" ? 56 : 126)) * zoom
      const topLeft = reactFlow.flowToScreenPosition(node.position)
      const panelWidth = Math.min(430, Math.max(0, window.innerWidth - 36))
      const safeLeft = 132
      const safeRight = Math.max(
        safeLeft + 160,
        window.innerWidth - panelWidth - 24
      )
      const safeTop = 88
      const safeBottom = Math.max(
        safeTop + 120,
        window.innerHeight - readShellLength("--dock-h", 0) - 24
      )

      const isVisible =
        topLeft.x >= safeLeft &&
        topLeft.x + width <= safeRight &&
        topLeft.y >= safeTop &&
        topLeft.y + height <= safeBottom

      if (isVisible) {
        return
      }

      const nextZoom = Math.min(1, Math.max(0.65, zoom))
      const centerX = node.position.x + width / (2 * zoom)
      const centerY = node.position.y + height / (2 * zoom)

      reactFlow.setViewport(
        {
          x: (safeLeft + safeRight) / 2 - centerX * nextZoom,
          y: (safeTop + safeBottom) / 2 - centerY * nextZoom,
          zoom: nextZoom,
        },
        { duration }
      )
    },
    [reactFlow]
  )

  // Follow the run: whichever node is waiting on the user, or just fired.
  useEffect(() => {
    const focusId = runWaitingNodeId ?? runActiveNodeId

    if (!focusId || !reactFlow || drawerMode !== "run") {
      return
    }

    const node = nodesRef.current.find((candidate) => candidate.id === focusId)

    if (!node) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      centerNodeForRun(node, 420)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    centerNodeForRun,
    drawerMode,
    reactFlow,
    runActiveNodeId,
    runWaitingNodeId,
  ])

  useEffect(() => {
    if (!selectedNodeId || !reactFlow) {
      return
    }

    const node = nodesRef.current.find(
      (candidate) => candidate.id === selectedNodeId
    )

    if (!node || (drawerMode !== "run" && node.type === "start")) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      revealNodeBesidePanel(node, drawerMode === "run" ? 360 : 320)
    })

    return () => window.cancelAnimationFrame(frame)
    // Deliberately keyed on the selected id, not the node object: the node
    // identity changes on every inspector keystroke.
  }, [drawerMode, reactFlow, revealNodeBesidePanel, selectedNodeId])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((next) => applyNodeChanges(changes, next))
  }, [])

  const handleNodeDragStart = useCallback<NodeDragHandler>(() => {
    // Keep the block selected through the drag; only transient popovers close.
    suppressSelectionRef.current = true
    setNodeMenu(null)
    setCanvasMenu(null)
    setEdgeMenu(null)
    setConnectMenu(null)
  }, [])

  /** Vertical gap under a node that counts as "drop it onto this block". */
  const DOCK_GAP = 46

  /**
   * Wrap a step in a Block. Blocks are the canvas's default presentation, so
   * a single dropped step reads the same as a stack of them and can be added
   * to later without the node changing shape under the cursor.
   */
  const wrapStepInBlock = (
    step: BlockStep,
    node: {
      id: string
      position: { x: number; y: number }
      customName?: string
      blockColor?: BlockColor
    }
  ): WorkflowNode =>
    ({
      id: node.id,
      type: "block",
      position: node.position,
      data: {
        label: "Block",
        customName: node.customName,
        blockColor: node.blockColor,
        steps: [step],
      } as NodeData,
      deletable: true,
    }) as WorkflowNode

  const toBlockSteps = (node: WorkflowNode): BlockStep[] =>
    node.type === "block"
      ? ((node.data as BlockNodeData).steps ?? [])
      : [
          {
            id: createId("step"),
            type: node.type as NodeType,
            data: node.data,
          },
        ]

  /**
   * Merge the dragged node into the node it was dropped under, producing a
   * Block whose steps run top-to-bottom with no wires between them.
   */
  const mergeIntoBlock = (targetId: string, draggedId: string) => {
    const target = nodes.find((entry) => entry.id === targetId)
    const dragged = nodes.find((entry) => entry.id === draggedId)

    if (!target || !dragged) {
      return false
    }

    const targetSteps = toBlockSteps(target)
    const draggedSteps = toBlockSteps(dragged)
    const targetLast = targetSteps[targetSteps.length - 1]

    // Branching steps end a block: nothing can follow them inside it.
    if (targetLast && isTerminalStepType(targetLast.type)) {
      setStatus(
        `${targetLast.data.customName || targetLast.type} branches, so nothing can stack under it.`
      )
      return false
    }

    if (draggedSteps.slice(0, -1).some((step) => isTerminalStepType(step.type))) {
      setStatus("That block branches partway through, so it can't be merged.")
      return false
    }

    const steps = [...targetSteps, ...draggedSteps]
    const newLast = steps[steps.length - 1]!
    const lastHasPorts = stepPorts(newLast).length > 0

    setNodes((next) =>
      next
        .filter((entry) => entry.id !== draggedId)
        .map((entry) =>
          entry.id === targetId
            ? {
                ...entry,
                type: "block",
                data: {
                  label: "Block",
                  customName: target.data.customName,
                  blockColor: target.data.blockColor,
                  steps,
                } as NodeData,
              }
            : entry
        )
    )

    setEdges((next) =>
      next
        // The wire between the two merged nodes becomes implicit.
        .filter(
          (edge) =>
            !(edge.source === targetId && edge.target === draggedId) &&
            !(edge.source === draggedId && edge.target === targetId)
        )
        .map((edge) => {
          if (edge.source === draggedId) {
            // The dragged node is now the block's last step, so its ports are
            // the block's ports.
            return { ...edge, source: targetId }
          }

          if (edge.target === draggedId) {
            return { ...edge, target: targetId, targetHandle: null }
          }

          return edge
        })
        .filter((edge) => edge.source !== edge.target)
        // If the new last step branches, the block exits by its ports only.
        .filter(
          (edge) =>
            !(lastHasPorts && edge.source === targetId && !edge.sourceHandle)
        )
    )

    setSelectedNodeId(targetId)
    setStatus("Steps merged into one block.")
    return true
  }

  const writeBlockSteps = (nodeId: string, steps: BlockStep[]) => {
    if (steps.length === 0) {
      setNodes((next) => next.filter((entry) => entry.id !== nodeId))
      setEdges((next) =>
        next.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        )
      )
      setBlockStepSelection(null)
      return
    }

    setNodes((next) =>
      next.map((entry) =>
        entry.id === nodeId
          ? ({
              ...entry,
              type: "block",
              data: { ...(entry.data as BlockNodeData), steps } as NodeData,
            } as WorkflowNode)
          : entry
      )
    )
  }

  /** Append a step to a node, turning it into a block if it is not one yet. */
  const appendStepToNode = (nodeId: string, type: NodeType) => {
    const target = nodes.find((entry) => entry.id === nodeId)

    if (!target || target.type === "start") {
      return false
    }

    const steps = toBlockSteps(target)
    const last = steps[steps.length - 1]

    if (last && isTerminalStepType(last.type)) {
      setStatus(
        `${last.data.customName || last.type} branches, so nothing can stack under it.`
      )
      return false
    }

    const step: BlockStep = {
      id: createId("step"),
      type,
      data: createNodeData(type),
    }
    const nextSteps = [...steps, step]

    setNodes((next) =>
      next.map((entry) =>
        entry.id === nodeId
          ? {
              ...entry,
              type: "block",
              data: {
                label: "Block",
                customName: target.data.customName,
                blockColor: target.data.blockColor,
                steps: nextSteps,
              } as NodeData,
            }
          : entry
      )
    )

    // A branching step takes over the block's exit.
    if (stepPorts(step).length > 0) {
      setEdges((next) =>
        next.filter((edge) => !(edge.source === nodeId && !edge.sourceHandle))
      )
    }

    setSelectedNodeId(nodeId)
    setBlockStepSelection({ nodeId, stepId: step.id })
    setStatus(`${getStepOption(type)?.label ?? "Step"} added to the block.`)
    return true
  }

  /** Pull a step back out of its block into a standalone node. */
  const extractStepFromBlock = (nodeId: string, stepId: string) => {
    const block = nodes.find((entry) => entry.id === nodeId)

    if (!block || block.type !== "block") {
      return
    }

    const steps = (block.data as BlockNodeData).steps ?? []
    const index = steps.findIndex((step) => step.id === stepId)
    const step = steps[index]

    if (!step) {
      return
    }

    const wasLast = index === steps.length - 1
    const newId = createId(step.type)

    setNodes((next) => [
      ...next,
      wrapStepInBlock(step, {
        id: newId,
        position: {
          x: block.position.x + 360,
          y: block.position.y + index * 40,
        },
      }),
    ])

    if (wasLast) {
      // The block's exits belonged to this step, so they travel with it.
      setEdges((next) => [
        ...next.map((edge) =>
          edge.source === nodeId ? { ...edge, source: newId } : edge
        ),
        createWorkflowEdge({ source: nodeId, target: newId }),
      ])
    }

    writeBlockSteps(
      nodeId,
      steps.filter((entry) => entry.id !== stepId)
    )
    setBlockStepSelection(null)
    setSelectedNodeId(newId)
    setStatus(
      wasLast
        ? "Step moved out and reconnected."
        : "Step moved out of the block. Connect it where you need it."
    )
  }

  /** Reorder within a block; the branching last step stays pinned. */
  const moveStepInBlock = (
    nodeId: string,
    stepId: string,
    direction: -1 | 1
  ) => {
    const block = nodes.find((entry) => entry.id === nodeId)

    if (!block || block.type !== "block") {
      return
    }

    const steps = [...((block.data as BlockNodeData).steps ?? [])]
    const index = steps.findIndex((step) => step.id === stepId)
    const target = index + direction
    const moving = steps[index]
    const displaced = steps[target]

    if (!moving || !displaced) {
      return
    }

    if (isTerminalStepType(moving.type) || isTerminalStepType(displaced.type)) {
      setStatus("A branching step has to stay last in its block.")
      return
    }

    steps[index] = displaced
    steps[target] = moving
    writeBlockSteps(nodeId, steps)
    setStatus("Step reordered.")
  }

  /** Break a block back into separate wired nodes. */
  const splitBlock = (node: WorkflowNode) => {
    if (node.type !== "block") {
      setStatus("Only blocks can be split.")
      setNodeMenu(null)
      return
    }

    const steps = (node.data as BlockNodeData).steps ?? []

    if (steps.length < 2) {
      setStatus("This block only has one step.")
      setNodeMenu(null)
      return
    }

    const ids = steps.map((step, index) =>
      index === 0 ? node.id : createId(step.type)
    )

    setNodes((next) => [
      ...next.map((entry) =>
        entry.id === node.id
          ? ({
              ...entry,
              type: "block",
              data: {
                label: "Block",
                blockColor: (entry.data as BlockNodeData).blockColor,
                steps: [steps[0]!],
              } as NodeData,
            } as WorkflowNode)
          : entry
      ),
      ...steps.slice(1).map((step, offset) =>
        wrapStepInBlock(step, {
          id: ids[offset + 1]!,
          position: {
            x: node.position.x + (offset + 1) * 340,
            y: node.position.y,
          },
        })
      ),
    ])

    setEdges((next) => [
      // The block's exits belonged to its last step.
      ...next.map((edge) =>
        edge.source === node.id
          ? { ...edge, source: ids[ids.length - 1]! }
          : edge
      ),
      ...ids.slice(0, -1).map((id, index) =>
        createWorkflowEdge({ source: id, target: ids[index + 1]! })
      ),
    ])

    setBlockStepSelection(null)
    setNodeMenu(null)
    setStatus("Block split into separate steps.")
  }

  const findDockTarget = (dragged: WorkflowNode) => {
    const draggedBounds = getNodeBounds(dragged)

    if (!draggedBounds) {
      return null
    }

    return (
      nodes.find((candidate) => {
        if (candidate.id === dragged.id || candidate.type === "start") {
          return false
        }

        const bounds = getNodeBounds(candidate)

        if (!bounds) {
          return false
        }

        const aligned =
          Math.abs(bounds.x - draggedBounds.x) < bounds.width * 0.6
        const gap = draggedBounds.y - (bounds.y + bounds.height)

        return aligned && gap > -bounds.height * 0.55 && gap < DOCK_GAP
      }) ?? null
    )
  }

  // Not memoised on purpose: docking reads the live node list.
  const handleNodeDragStop: NodeDragHandler = (_event, node) => {
    const releaseSelection = () => {
      window.setTimeout(() => {
        suppressSelectionRef.current = false
      }, 160)
    }

    // Dropped just under another node? Stack them into one block.
    const dockTarget = findDockTarget(node as WorkflowNode)

    if (dockTarget && mergeIntoBlock(dockTarget.id, node.id)) {
      releaseSelection()
      return
    }

    // Selection is frozen during the drag so the inspector cannot re-frame the
    // canvas underneath the pointer; adopt the dragged block once it lands.
    setSelectedNodeId(node.id)
    releaseSelection()
  }

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

      setSelectedNodeIds(selected.map((node) => node.id))
      // The inspector edits one block at a time; a multi-selection shows the
      // bulk bar instead.
      setSelectedNodeId(selected.length === 1 ? selected[0]!.id : null)
      setInspectorMenuOpen(false)
    },
    []
  )

  const updateNodeData = useCallback((nodeId: string, data: NodeData) => {
    setNodes((next) =>
      next.map((node) => (node.id === nodeId ? { ...node, data } : node))
    )
  }, [])

  /**
   * Deleting a button or choice used to leave its wire behind, still drawn on
   * the canvas and still reachable by the runtime's handle lookup. Drop any
   * connection whose handle no longer exists on the block.
   */
  const pruneNodeHandleEdges = useCallback(
    (nodeId: string, keptHandleIds: string[]) => {
      const kept = new Set(keptHandleIds)

      setEdges((next) =>
        next.filter(
          (edge) =>
            edge.source !== nodeId ||
            !edge.sourceHandle ||
            kept.has(edge.sourceHandle)
        )
      )
    },
    []
  )

  /**
   * Agent exits are ports, so editing them has to move the wires with them:
   * the first exit takes over the node's plain outgoing edge, and a deleted
   * exit leaves a wire pointing at a handle that no longer exists.
   */
  const applyAgentDataChange = (next: AgentNodeData) => {
    updateInspectorData(next)

    if (!selectedNode) {
      return
    }

    // Only the last step of a Block contributes the block's ports, so an agent
    // sitting earlier in the stack must not touch the block's own wiring.
    const steps =
      selectedNode.type === "block"
        ? ((selectedNode.data as BlockNodeData).steps ?? [])
        : []
    const ownsNodePorts =
      steps.length === 0 || steps[steps.length - 1]?.id === selectedStep?.id

    if (!ownsNodePorts) {
      return
    }

    const exitIds = new Set((next.exitConditions ?? []).map((exit) => exit.id))
    const nodeId = selectedNode.id

    setEdges((edges) =>
      edges.filter((edge) => {
        if (edge.source !== nodeId) {
          return true
        }

        return edge.sourceHandle
          ? exitIds.has(edge.sourceHandle)
          : exitIds.size === 0
      })
    )
  }

  /**
   * Reads an image into whichever inspector target is open — a standalone
   * node, or one step inside a Block.
   */
  const readImageIntoInspector = (
    data: ImageNodeData | CardNodeData,
    file: File | undefined,
    doneMessage: string
  ) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Choose an image or GIF file.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateInspectorData({
        ...data,
        source: "upload",
        url: String(reader.result ?? ""),
        alt: data.alt || file.name,
        fileName: file.name,
      } as NodeData)
      setStatus(doneMessage)
    }
    reader.readAsDataURL(file)
  }

  const readImageFile = (data: ImageNodeData, file?: File) =>
    readImageIntoInspector(data, file, "Image uploaded.")

  const readCardImageFile = (data: CardNodeData, file?: File) =>
    readImageIntoInspector(data, file, "Card image uploaded.")

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

    // Start is the one node that is never a block: it has no configuration of
    // its own and nothing can stack under it.
    if (type === "start" || type === "block") {
      const node = {
        id,
        type,
        position,
        data: createNodeData(type),
        deletable: type !== "start",
      }

      setNodes((next) => [...next, node])
      setSelectedNodeId(id)
      setStatus(`${getStepOption(type)?.label ?? "Step"} added.`)

      return node
    }

    const step: BlockStep = {
      id: createId("step"),
      type,
      data: createNodeData(type),
    }
    const node = wrapStepInBlock(step, { id, position })

    setNodes((next) => [...next, node])
    setSelectedNodeId(id)
    setBlockStepSelection({ nodeId: id, stepId: step.id })
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

    // Dropped on top of a node? Stack into it instead of making a new node.
    const dropTarget = nodes.find((candidate) => {
      if (candidate.type === "start") {
        return false
      }

      const bounds = getNodeBounds(candidate)

      if (!bounds) {
        return false
      }

      return (
        position.x >= bounds.x &&
        position.x <= bounds.x + bounds.width &&
        position.y >= bounds.y &&
        position.y <= bounds.y + bounds.height
      )
    })

    if (dropTarget && type !== "start") {
      appendStepToNode(dropTarget.id, type)
      return
    }

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
      const previous = lastFlowCursorRef.current
      lastFlowCursorRef.current = flowPoint
      const now = Date.now()

      // Each broadcast is a Convex write that every subscriber re-reads, so
      // rate-limit it and drop sub-pixel jitter rather than streaming frames.
      if (now - lastCursorSentAtRef.current < CURSOR_BROADCAST_MS) {
        return
      }

      if (
        previous &&
        Math.abs(previous.x - flowPoint.x) < CURSOR_MOVE_EPSILON &&
        Math.abs(previous.y - flowPoint.y) < CURSOR_MOVE_EPSILON
      ) {
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
      // The name belongs to the step, which is what the block's row shows.
      const first = ((created.data as BlockNodeData).steps ?? [])[0]

      if (created.type === "block" && first) {
        updateBlockStepData(created.id, first.id, {
          ...first.data,
          ...(label ? { customName: label } : {}),
          ...(description ? { description } : {}),
        } as NodeData)
      } else {
        patchNodeData(created.id, {
          customName: label,
          description,
        })
      }
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

  /**
   * Extracts a block into its own reusable workflow and leaves a Component
   * block referencing it. This used to overwrite the block's data with a stub,
   * destroying whatever was configured on it.
   */
  const createComponentFromNode = async (node: WorkflowNode) => {
    if (node.type === "start") {
      setStatus("Start cannot be converted into a component.")
      setNodeMenu(null)
      return
    }

    // A component returns to a single point, so a block whose exits fan out
    // cannot survive extraction. Refuse rather than silently drop branches.
    const outgoing = edges.filter((edge) => edge.source === node.id)

    if (outgoing.length > 1) {
      setStatus(
        "Blocks with more than one outgoing connection can't become a component."
      )
      toast.error("That block has multiple exits")
      setNodeMenu(null)
      return
    }

    if (isCreatingComponent) {
      return
    }

    setIsCreatingComponent(true)
    setNodeMenu(null)
    setStatus("Creating component...")

    const previousName = getNodeDisplayName(node)
    const componentName = `${previousName} component`

    try {
      const startNodeId = createId("start")
      const innerNodeId = createId(node.type ?? "node")
      const definition: WorkflowDefinition = {
        schemaVersion: WORKFLOW_SCHEMA_VERSION,
        name: componentName,
        description: `Extracted from ${workflowName.trim() || "a workflow"}.`,
        nodes: [
          {
            id: startNodeId,
            type: "start",
            position: { x: 160, y: 220 },
            data: { label: "Start" },
          },
          {
            id: innerNodeId,
            type: node.type as NodeType,
            position: { x: 460, y: 190 },
            data: cloneNodeData(node.data),
          },
        ],
        edges: [
          {
            id: createId("edge"),
            source: startNodeId,
            target: innerNodeId,
            sourceHandle: null,
            targetHandle: null,
            data: null,
          },
        ],
      }

      const saved = (await saveWorkflow({
        name: componentName,
        description: definition.description ?? null,
        definition,
      })) as WorkflowRecord

      // activate:false so extracting a block never steals activation from the
      // workflow that is actually live.
      await publishWorkflow({ workflowId: saved.id, activate: false })

      // Keep the node id so existing connections stay attached.
      setNodes((next) =>
        next.map((candidate) =>
          candidate.id === node.id
            ? {
                ...candidate,
                type: "component",
                data: {
                  label: "Component",
                  customName: previousName,
                  blockColor: candidate.data.blockColor,
                  workflowId: saved.id,
                  workflowName: componentName,
                  inputs: [],
                } as NodeData,
              }
            : candidate
        )
      )
      // The single remaining exit leaves the component's unnamed handle.
      setEdges((next) =>
        next.map((edge) =>
          edge.source === node.id ? { ...edge, sourceHandle: null } : edge
        )
      )

      setStatus("Component created.")
      toast.success(`${componentName} created`)
    } catch (error) {
      console.error("Failed to create component", error)
      setStatus("Could not create the component.")
      toast.error("Could not create component")
    } finally {
      setIsCreatingComponent(false)
    }
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

  const deleteSelectedNodes = () => {
    const removable = nodes.filter(
      (node) => selectedNodeIds.includes(node.id) && node.type !== "start"
    )

    if (removable.length === 0) {
      setStatus("Nothing selected to delete.")
      return
    }

    const ids = new Set(removable.map((node) => node.id))

    setNodes((next) => next.filter((node) => !ids.has(node.id)))
    setEdges((next) =>
      next.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))
    )
    clearSelectedNode()
    setBlockStepSelection(null)
    setStatus(
      `${removable.length} block${removable.length === 1 ? "" : "s"} deleted.`
    )
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

  const captureGraph = useCallback(
    (): GraphSnapshot => ({
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type as NodeType,
        position: { ...node.position },
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
    }),
    [edges, nodes]
  )

  const restoreGraph = useCallback((snapshot: GraphSnapshot) => {
    isRestoringHistoryRef.current = true
    setNodes(
      nodesFromDefinition({
        schemaVersion: WORKFLOW_SCHEMA_VERSION,
        name: "",
        nodes: snapshot.nodes,
        edges: snapshot.edges,
      })
    )
    setEdges(
      edgesFromDefinition({
        schemaVersion: WORKFLOW_SCHEMA_VERSION,
        name: "",
        nodes: snapshot.nodes,
        edges: snapshot.edges,
      })
    )
    clearSelectedNode()
    setBlockStepSelection(null)
  }, [clearSelectedNode])

  // Snapshot once the graph stops changing, so a drag or a burst of typing is
  // a single undo step rather than dozens.
  useEffect(() => {
    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false
      lastSettledGraphRef.current = captureGraph()
      return
    }

    const timer = window.setTimeout(() => {
      const current = captureGraph()
      const previous = lastSettledGraphRef.current

      if (!previous) {
        lastSettledGraphRef.current = current
        return
      }

      if (stableSerialize(previous) === stableSerialize(current)) {
        return
      }

      historyRef.current.past.push(previous)

      if (historyRef.current.past.length > 60) {
        historyRef.current.past.shift()
      }

      historyRef.current.future = []
      lastSettledGraphRef.current = current
      setHistoryVersion((version) => version + 1)
    }, 420)

    return () => window.clearTimeout(timer)
  }, [captureGraph])

  const undoGraph = useCallback(() => {
    const previous = historyRef.current.past.pop()

    if (!previous) {
      setStatus("Nothing to undo.")
      return
    }

    historyRef.current.future.push(captureGraph())
    restoreGraph(previous)
    setHistoryVersion((version) => version + 1)
    setStatus("Undone.")
  }, [captureGraph, restoreGraph])

  const redoGraph = useCallback(() => {
    const next = historyRef.current.future.pop()

    if (!next) {
      setStatus("Nothing to redo.")
      return
    }

    historyRef.current.past.push(captureGraph())
    restoreGraph(next)
    setHistoryVersion((version) => version + 1)
    setStatus("Redone.")
  }, [captureGraph, restoreGraph])

  const canUndo = historyRef.current.past.length > 0
  const canRedo = historyRef.current.future.length > 0
  void historyVersion

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
        return
      }

      if (key === "z") {
        event.preventDefault()

        if (event.shiftKey) {
          redoGraph()
        } else {
          undoGraph()
        }

        return
      }

      if (key === "y") {
        event.preventDefault()
        redoGraph()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    copiedNode,
    copyNode,
    pasteCopiedNode,
    reactFlow,
    redoGraph,
    selectedNode,
    undoGraph,
  ])

  const toDefinition = useCallback(
    (): WorkflowDefinition =>
      JSON.parse(
        JSON.stringify({
          schemaVersion: WORKFLOW_SCHEMA_VERSION,
          id: workflowId ?? undefined,
          name: workflowName.trim() || "Untitled workflow",
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
    const timer = window.setInterval(sendHeartbeat, PRESENCE_HEARTBEAT_MS)

    return () => window.clearInterval(timer)
  }, [heartbeatPresence, workflowId])

  // Drop out of the room promptly instead of leaving a ghost avatar behind
  // until the stale cutoff catches it.
  useEffect(() => {
    if (!workflowId) {
      return
    }

    const leave = () => {
      void leavePresence({ workflowId }).catch(() => undefined)
    }

    window.addEventListener("pagehide", leave)

    return () => {
      window.removeEventListener("pagehide", leave)
      leave()
    }
  }, [leavePresence, workflowId])

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
      syncWorkflowUrl(saved.id)
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

  const runValidation = () => {
    const componentStatus = new Map(
      (componentCandidates ?? []).map((candidate) => [
        candidate.id as string,
        { name: candidate.name, isPublished: candidate.isPublished },
      ])
    )

    return validateWorkflow(nodes, edges, componentStatus)
  }

  const handlePublish = async ({
    skipValidation = false,
  }: { skipValidation?: boolean } = {}) => {
    if (isSavingWorkflow || isPublishingWorkflow || isDeactivatingWorkflow) {
      return null
    }

    if (!skipValidation) {
      const issues = runValidation()
      const blocking = issues.some((issue) => issue.level === "error")

      // Errors stop the publish; warnings are shown but can be waved through.
      if (issues.length > 0) {
        setValidationIssues(issues)
        setStatus(
          blocking
            ? "Fix the blocking issues before publishing."
            : "Review these warnings before publishing."
        )
        return null
      }
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
      syncWorkflowUrl(published.id)
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
      syncWorkflowUrl(deactivated.id)
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
    syncWorkflowUrl(null)
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
    syncWorkflowUrl(id)
    setStatus("Loading workflow...")
    setCollaboratorsPanelOpen(false)
  }

  const publishComponent = async (
    componentId: Id<"workflows">,
    name: string
  ) => {
    if (isPublishingComponent) {
      return
    }

    setIsPublishingComponent(true)

    try {
      // activate:false keeps the live workflow live.
      await publishWorkflow({ workflowId: componentId, activate: false })
      toast.success(`${name} published as a component`)
      setStatus("Component published.")
    } catch (error) {
      console.error("Failed to publish component", error)
      toast.error("Could not publish that component")
    } finally {
      setIsPublishingComponent(false)
    }
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

  // --- inspector target: a whole node, or one step inside a Block ---
  const selectedBlockSteps =
    selectedNode?.type === "block"
      ? ((selectedNode.data as BlockNodeData).steps ?? [])
      : []
  const selectedStep =
    selectedBlockSteps.length > 0
      ? (blockStepSelection?.nodeId === selectedNode?.id
          ? selectedBlockSteps.find(
              (step) => step.id === blockStepSelection?.stepId
            )
          : undefined) ?? selectedBlockSteps[0]
      : undefined
  const inspectorType = (selectedStep?.type ?? selectedNode?.type) as
    | NodeType
    | undefined
  const inspectorData = (selectedStep?.data ?? selectedNode?.data) as NodeData
  const inspectorGenericData = inspectorData as GenericNodeData | undefined
  // Agent-family steps open the full editor rather than the docked inspector:
  // instructions, tools, capabilities and exit conditions need the room.
  const agentEditorOpen = Boolean(
    selectedNode && inspectorType && isAgentStepType(inspectorType) && !nodeMenu
  )
  // Everything this graph can produce, for the {{variable}} pills and picker.
  const workflowVariables = useMemo(
    () => collectWorkflowVariables(nodes),
    [nodes]
  )

  const updateBlockStepData = (
    nodeId: string,
    stepId: string,
    data: NodeData
  ) => {
    setNodes((next) =>
      next.map((node) => {
        if (node.id !== nodeId) {
          return node
        }

        const blockData = node.data as BlockNodeData

        return {
          ...node,
          data: {
            ...blockData,
            steps: (blockData.steps ?? []).map((step) =>
              step.id === stepId ? { ...step, data } : step
            ),
          } as NodeData,
        }
      })
    )
  }

  /** Writes to the selected step when a Block is open, else to the node. */
  const blockStepSelectionValue = useMemo(
    () => ({
      selected: blockStepSelection,
      select: (nodeId: string, stepId: string) => {
        setBlockStepSelection({ nodeId, stepId })
        setSelectedNodeId(nodeId)
      },
    }),
    [blockStepSelection]
  )

  const formatInspectorMessage = (
    format: MessageFormat,
    editor: HTMLElement | null
  ) => {
    formatRichText(format, editor, (html) =>
      updateInspectorData({
        ...(inspectorData as MessageNodeData),
        text: html,
      })
    )
  }

  const updateInspectorData = (data: NodeData) => {
    if (!selectedNode) {
      return
    }

    if (selectedStep) {
      updateBlockStepData(selectedNode.id, selectedStep.id, data)
      return
    }

    updateNodeData(selectedNode.id, data)
  }
  const isStartMenu = menuNode?.type === "start"
  const inspectorOpen = Boolean(
    selectedNode &&
      selectedNode.type !== "start" &&
      !nodeMenu &&
      !agentEditorOpen
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

  const shell = (
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

      <div className="top-bar">
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


      <div className="top-actions" aria-label="Workflow actions">
        <input
          className="workflow-name-input"
          value={workflowName}
          title={workflowName}
          placeholder="Untitled workflow"
          aria-label="Workflow name"
          onChange={(event) => setWorkflowName(event.target.value)}
          onBlur={() =>
            setWorkflowName((current) => current.trim() || "Untitled workflow")
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur()
            }
          }}
        />
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
          className="toolbar-button"
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
          className="toolbar-button primary"
          disabled={
            isSavingWorkflow || isPublishingWorkflow || isDeactivatingWorkflow
          }
          onClick={() => void handlePublish()}
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
            className="toolbar-button danger"
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
      </div>

      {validationIssues !== null && (
        <section className="validation-panel" aria-label="Publish checks">
          <div className="validation-header">
            <div>
              <strong>
                {validationIssues.some((issue) => issue.level === "error")
                  ? "This workflow can't be published yet"
                  : "Publish checks"}
              </strong>
              <span>
                {validationIssues.filter((i) => i.level === "error").length}{" "}
                blocking ·{" "}
                {validationIssues.filter((i) => i.level === "warning").length}{" "}
                warnings
              </span>
            </div>
            <button
              type="button"
              className="validation-close"
              aria-label="Close publish checks"
              onClick={() => setValidationIssues(null)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="validation-list">
            {validationIssues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                className={`validation-row ${issue.level}`}
                onClick={() => {
                  if (!issue.nodeId) return
                  const node = nodes.find((entry) => entry.id === issue.nodeId)
                  if (!node) return
                  openSelectedNode(node)
                  reactFlow?.setCenter(
                    node.position.x + 150,
                    node.position.y + 60,
                    { zoom: 0.9, duration: 320 }
                  )
                }}
              >
                <span className="validation-dot" aria-hidden />
                <span>
                  <strong>{issue.title}</strong>
                  <em>{issue.detail}</em>
                </span>
              </button>
            ))}
          </div>

          {!validationIssues.some((issue) => issue.level === "error") && (
            <button
              type="button"
              className="validation-publish"
              onClick={() => {
                setValidationIssues(null)
                void handlePublish({ skipValidation: true })
              }}
            >
              Publish anyway
            </button>
          )}
        </section>
      )}

      {selectedNodeIds.length > 1 && (
        <div className="multi-select-bar" role="status">
          <span>
            {selectedNodeIds.length} blocks selected
          </span>
          <button type="button" onClick={deleteSelectedNodes}>
            Delete
          </button>
          <button type="button" onClick={clearSelectedNode}>
            Clear
          </button>
        </div>
      )}

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
        <BlockStepSelectionContext.Provider value={blockStepSelectionValue}>
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
            deleteKeyCode={["Backspace", "Delete"]}
            selectionKeyCode="Shift"
            multiSelectionKeyCode={["Meta", "Shift"]}
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
        </BlockStepSelectionContext.Provider>
      </main>

      <nav className="bottom-tools" aria-label="Canvas tools">
        <button
          title="Undo (⌘Z)"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={undoGraph}
        >
          <Icon name="undo" size={19} />
        </button>
        <button
          title="Redo (⇧⌘Z)"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={redoGraph}
        >
          <Icon name="redo" size={19} />
        </button>
        <span className="bottom-tools-divider" aria-hidden />
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => reactFlow?.zoomOut({ duration: 160 })}
        >
          <Icon name="zoomOut" size={19} />
        </button>
        <button
          className="zoom-readout"
          title="Reset zoom to 100%"
          aria-label="Reset zoom"
          onClick={() => reactFlow?.zoomTo(1, { duration: 160 })}
        >
          {Math.round(canvasViewport.zoom * 100)}%
        </button>
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => reactFlow?.zoomIn({ duration: 160 })}
        >
          <Icon name="zoomIn" size={19} />
        </button>
        <button
          title="Fit canvas"
          aria-label="Fit canvas"
          onClick={() => reactFlow?.fitView(WORKFLOW_FIT_VIEW_OPTIONS)}
        >
          <Icon name="fit" size={19} />
        </button>
        <span className="bottom-tools-divider" aria-hidden />
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
                disabled={isCreatingComponent}
                onClick={() => void createComponentFromNode(menuNode)}
              >
                <span>Create component</span>
                <span className="node-menu-shortcut">⇧⌘C</span>
              </button>
              {menuNode.type === "block" && (
                <button
                  className="node-menu-row"
                  onClick={() => splitBlock(menuNode)}
                >
                  <span>Split block</span>
                </button>
              )}

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

      {selectedNode &&
        selectedNode.type !== "start" &&
        !nodeMenu &&
        !agentEditorOpen && (
        <aside
          className={`inspector-sheet visible ${
            inspectorType === "message" ||
            inspectorType === "image" ||
            inspectorType === "card"
              ? "message-editor-sheet"
              : ""
          } ${inspectorType === "image" ? "image-editor-sheet" : ""} ${
            inspectorType === "card" ? "card-editor-sheet" : ""
          }`}
        >
          {selectedBlockSteps.length > 1 && (
            <section className="block-step-list" aria-label="Block steps">
              <div className="block-step-list-header">
                <strong>Steps</strong>
                <span>{selectedBlockSteps.length} in this block</span>
              </div>
              {selectedBlockSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`block-step-list-row ${
                    step.id === selectedStep?.id ? "active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="block-step-list-name"
                    onClick={() =>
                      setBlockStepSelection({
                        nodeId: selectedNode.id,
                        stepId: step.id,
                      })
                    }
                  >
                    {step.data.customName?.trim() ||
                      getStepOption(step.type)?.label ||
                      step.type}
                  </button>
                  <button
                    type="button"
                    className="block-step-list-action"
                    title="Move up"
                    aria-label="Move step up"
                    disabled={index === 0}
                    onClick={() =>
                      moveStepInBlock(selectedNode.id, step.id, -1)
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="block-step-list-action"
                    title="Move down"
                    aria-label="Move step down"
                    disabled={index === selectedBlockSteps.length - 1}
                    onClick={() =>
                      moveStepInBlock(selectedNode.id, step.id, 1)
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="block-step-list-action"
                    title="Move out of block"
                    aria-label="Move step out of block"
                    onClick={() =>
                      extractStepFromBlock(selectedNode.id, step.id)
                    }
                  >
                    ⇥
                  </button>
                </div>
              ))}
            </section>
          )}
          {inspectorType === "message" ? (
            (() => {
              const data = inspectorData as MessageNodeData

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
                          formatInspectorMessage(
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
                          formatInspectorMessage(
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
                          formatInspectorMessage(
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
                          formatInspectorMessage(
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
                          formatInspectorMessage(
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
                      value={data.text ?? ""}
                      placeholder="Enter message"
                      ariaLabel="Message"
                      variables={workflowVariables}
                      onSync={(_nodeId, html) =>
                        updateInspectorData({
                          ...(inspectorData as MessageNodeData),
                          text: html,
                        })
                      }
                    />
                  </div>
                </section>
              )
            })()
          ) : inspectorType === "image" ? (
            (() => {
              const data = inspectorData as ImageNodeData
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
                          updateInspectorData( {
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
                          updateInspectorData( {
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
                            updateInspectorData( {
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
                            readImageFile(data, event.target.files?.[0])
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
          ) : inspectorType === "card" ? (
            (() => {
              const data = inspectorData as CardNodeData
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

                updateInspectorData( {
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
                        value={editingButton.label ?? ""}
                        placeholder="Enter button label, { to add variable"
                        aria-label="Button label"
                        onChange={(event) => {
                          const nextButtons = data.buttons.map((button) =>
                            button.id === editingButton.id
                              ? { ...button, label: event.target.value }
                              : button
                          )

                          updateInspectorData( {
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
                          updateInspectorData( {
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
                          updateInspectorData( {
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
                            updateInspectorData( {
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
                            readCardImageFile(data, event.target.files?.[0])
                          }
                        />
                      </div>
                    )}

                    <input
                      className="card-title-input"
                      value={data.title ?? ""}
                      placeholder="Enter card title, { to add variable"
                      aria-label="Card title"
                      onChange={(event) =>
                        updateInspectorData( {
                          ...data,
                          title: event.target.value,
                        })
                      }
                    />

                    <div className="card-description-editor">
                      <MessageEditorInput
                        nodeId={selectedNode.id}
                        value={data.description ?? ""}
                        placeholder="Enter card description, { to add variable"
                        ariaLabel="Card description"
                        variables={workflowVariables}
                        onSync={(_nodeId, html) =>
                          updateInspectorData( {
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
                                updateInspectorData( {
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
                                updateInspectorData( {
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
                                updateInspectorData( {
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
                                updateInspectorData( {
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
                                updateInspectorData( {
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
                            const nextButtons = data.buttons.filter(
                              (candidate) => candidate.id !== button.id
                            )
                            updateInspectorData( {
                              ...data,
                              buttons: nextButtons,
                            })
                            pruneNodeHandleEdges(
                              selectedNode.id,
                              nextButtons.map((entry) => entry.id)
                            )
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
            <section className="message-editor-panel">
              <div className="sheet-header">
                <div>
                  <h2>{inspectorGenericData?.label}</h2>
                  <p>Configure the selected step.</p>
                </div>
                {renderInspectorActions(selectedNode)}
              </div>

              <div className="inspector-body form">
                {inspectorType === "buttons" &&
                  (() => {
                    const data = inspectorData as ButtonsNodeData

                    return (
                      <div className="stack">
                        <label>Buttons</label>
                        {data.buttons.map((button, index) => (
                          <div className="field-row" key={button.id}>
                            <input
                              value={button.label ?? ""}
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
                                updateInspectorData( {
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
                                updateInspectorData( {
                                  ...data,
                                  buttons: nextButtons,
                                })
                                pruneNodeHandleEdges(
                                  selectedNode.id,
                                  nextButtons.map((entry) => entry.id)
                                )
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          onClick={() => {
                            updateInspectorData( {
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
                {inspectorType === "choice" &&
                  (() => {
                    const data = inspectorData as ChoiceNodeData

                    return (
                      <div className="stack">
                        <label>
                          Prompt (optional)
                          <textarea
                            value={data.prompt ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                prompt: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Store as variable
                          <input
                            value={data.variableKey ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                variableKey: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>Choices</label>
                        {(data.choices ?? []).map((choice, index) => (
                          <div className="field-row" key={choice.id}>
                            <input
                              value={choice.label ?? ""}
                              onChange={(event) => {
                                const nextChoices = [...(data.choices ?? [])]
                                const current = nextChoices[index]
                                if (!current) return
                                nextChoices[index] = {
                                  ...current,
                                  label: event.target.value,
                                }
                                updateInspectorData( {
                                  ...data,
                                  choices: nextChoices,
                                })
                              }}
                            />
                            <button
                              className="mini-button"
                              onClick={() => {
                                const nextChoices = (
                                  data.choices ?? []
                                ).filter((_, i) => i !== index)
                                updateInspectorData( {
                                  ...data,
                                  choices: nextChoices,
                                })
                                pruneNodeHandleEdges(
                                  selectedNode.id,
                                  nextChoices.map((entry) => entry.id)
                                )
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          onClick={() => {
                            updateInspectorData( {
                              ...data,
                              choices: [
                                ...(data.choices ?? []),
                                createButton("New choice"),
                              ],
                            })
                          }}
                        >
                          Add choice
                        </button>
                      </div>
                    )
                  })()}
                {inspectorType === "capture" &&
                  (() => {
                    const data = inspectorData as CaptureNodeData

                    return (
                      <>
                        <label>
                          Variable
                          <input
                            value={data.variableKey ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                variableKey: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Prompt (optional)
                          <textarea
                            value={data.prompt ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                prompt: event.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    )
                  })()}
                {inspectorType === "prompt" &&
                  (() => {
                    const data = inspectorData as PromptNodeData

                    return (
                      <>
                        <label>
                          Instructions
                          <textarea
                            value={data.instructions ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                instructions: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Output variable
                          <input
                            value={data.outputVariable ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                outputVariable: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="field-row">
                          <input
                            type="checkbox"
                            checked={Boolean(data.useKnowledgeBase)}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                useKnowledgeBase: event.target.checked,
                              })
                            }
                          />
                          Use knowledge base
                        </label>
                      </>
                    )
                  })()}
                {inspectorType === "kbSearch" &&
                  (() => {
                    const data = inspectorData as KbSearchNodeData

                    return (
                      <>
                        <label>
                          Query
                          <input
                            value={data.query ?? ""}
                            placeholder="{{lastInput}}"
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                query: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Output variable
                          <input
                            value={data.outputVariable ?? "kbAnswer"}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                outputVariable: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="field-row">
                          <input
                            type="checkbox"
                            checked={data.sendAsMessage !== false}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                sendAsMessage: event.target.checked,
                              })
                            }
                          />
                          Send answer as chat message
                        </label>
                      </>
                    )
                  })()}
                {inspectorType === "setVariable" &&
                  (() => {
                    const data = inspectorData as SetVariableNodeData

                    return (
                      <>
                        <label>
                          Variable
                          <input
                            value={data.key ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                key: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Value
                          <VariableInput
                            value={data.value ?? ""}
                            ariaLabel="Variable value"
                            placeholder="value or {{otherVariable}}"
                            variables={workflowVariables}
                            onChange={(next) =>
                              updateInspectorData( { ...data, value: next })
                            }
                          />
                        </label>
                      </>
                    )
                  })()}
                {inspectorType === "condition" &&
                  (() => {
                    const data = inspectorData as ConditionNodeData

                    return (
                      <>
                        <label>
                          Variable
                          <input
                            value={data.key ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                key: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Operator
                          <select
                            value={data.operator ?? "equals"}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                operator: event.target
                                  .value as ConditionNodeData["operator"],
                              })
                            }
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not equals</option>
                            <option value="contains">Contains</option>
                            <option value="not_contains">Not contains</option>
                            <option value="exists">Exists</option>
                            <option value="not_exists">Not exists</option>
                          </select>
                        </label>
                        {data.operator !== "exists" &&
                          data.operator !== "not_exists" && (
                            <label>
                              Value
                              <VariableInput
                                value={data.value ?? ""}
                                ariaLabel="Comparison value"
                                placeholder="value or {{otherVariable}}"
                                variables={workflowVariables}
                                onChange={(next) =>
                                  updateInspectorData( { ...data, value: next })
                                }
                              />
                            </label>
                          )}
                      </>
                    )
                  })()}
                {inspectorType === "component" &&
                  (() => {
                    const data = inspectorData as ComponentNodeData
                    const inputs = data.inputs ?? []
                    // A component cannot run itself, and the flow being edited
                    // has no published snapshot to descend into anyway.
                    const candidates = (componentCandidates ?? []).filter(
                      (candidate) => candidate.id !== workflowId
                    )
                    const selected = candidates.find(
                      (candidate) => candidate.id === data.workflowId
                    )

                    return (
                      <>
                        <label>
                          Workflow
                          <select
                            value={data.workflowId ?? ""}
                            onChange={(event) => {
                              const nextId = event.target.value
                              const next = candidates.find(
                                (candidate) => candidate.id === nextId
                              )
                              updateInspectorData( {
                                ...data,
                                workflowId: nextId,
                                workflowName: next?.name,
                              })
                            }}
                          >
                            <option value="">Select a workflow…</option>
                            {candidates.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                                {candidate.isPublished ? "" : " (not published)"}
                              </option>
                            ))}
                          </select>
                        </label>

                        {componentCandidates === undefined ? (
                          <p className="helper">Loading workflows…</p>
                        ) : candidates.length === 0 ? (
                          <p className="helper">
                            Save another workflow first, then reuse it here.
                          </p>
                        ) : null}

                        {selected && !selected.isPublished ? (
                          <>
                            <p className="helper">
                              {selected.name} has never been published, so there
                              is no runnable version to step into.
                            </p>
                            <button
                              className="secondary-button"
                              disabled={isPublishingComponent}
                              onClick={() =>
                                void publishComponent(selected.id, selected.name)
                              }
                            >
                              {isPublishingComponent
                                ? "Publishing…"
                                : "Publish as component"}
                            </button>
                            <p className="helper">
                              This snapshots it for reuse without making it the
                              live workflow.
                            </p>
                          </>
                        ) : null}

                        <div className="stack">
                          <span className="helper">
                            Inputs (set before the component runs)
                          </span>
                          {inputs.map((input, index) => (
                            <div className="field-row" key={input.id}>
                              <input
                                value={input.name}
                                placeholder="variable"
                                onChange={(event) => {
                                  const next = [...inputs]
                                  const current = next[index]
                                  if (!current) return
                                  next[index] = {
                                    ...current,
                                    name: event.target.value,
                                  }
                                  updateInspectorData( {
                                    ...data,
                                    inputs: next,
                                  })
                                }}
                              />
                              <button
                                className="mini-button"
                                onClick={() =>
                                  updateInspectorData( {
                                    ...data,
                                    inputs: inputs.filter(
                                      (_, i) => i !== index
                                    ),
                                  })
                                }
                              >
                                Remove
                              </button>
                              <VariableInput
                                value={input.value}
                                ariaLabel={`${input.name || "input"} value`}
                                placeholder="{{sourceVariable}}"
                                variables={workflowVariables}
                                onChange={(nextValue) => {
                                  const next = [...inputs]
                                  const current = next[index]
                                  if (!current) return
                                  next[index] = {
                                    ...current,
                                    value: nextValue,
                                  }
                                  updateInspectorData( {
                                    ...data,
                                    inputs: next,
                                  })
                                }}
                              />
                            </div>
                          ))}
                          <button
                            className="secondary-button"
                            onClick={() =>
                              updateInspectorData( {
                                ...data,
                                inputs: [
                                  ...inputs,
                                  { id: createId("in"), name: "", value: "" },
                                ],
                              })
                            }
                          >
                            Add input
                          </button>
                        </div>

                        <p className="helper">
                          The component shares this run&apos;s variables, so
                          anything it sets is readable after it returns. Nesting
                          is capped at 5 levels and a component cannot call
                          itself.
                        </p>
                      </>
                    )
                  })()}
                {inspectorType === "tool" &&
                  (() => {
                    const data = inspectorData as ToolNodeData
                    const args = data.arguments ?? []
                    const tools = assistantTools ?? []
                    const selectedTool = tools.find(
                      (tool) => tool.name === data.toolName
                    )

                    return (
                      <>
                        <label>
                          Tool
                          <select
                            value={data.toolName ?? ""}
                            onChange={(event) => {
                              const nextName = event.target.value
                              const nextTool = tools.find(
                                (tool) => tool.name === nextName
                              )
                              // Seed a row per declared parameter so the
                              // mapping starts from the tool's own contract.
                              updateInspectorData( {
                                ...data,
                                toolName: nextName,
                                arguments: (nextTool?.parameters ?? []).map(
                                  (parameter) => ({
                                    id: createId("arg"),
                                    name: parameter.name,
                                    value: "",
                                  })
                                ),
                              })
                            }}
                          >
                            <option value="">Select a tool…</option>
                            {tools.map((tool) => (
                              <option key={tool._id} value={tool.name}>
                                {tool.name}
                                {tool.isEnabled ? "" : " (disabled)"}
                              </option>
                            ))}
                          </select>
                        </label>

                        {assistantTools === undefined ? (
                          <p className="helper">Loading tools…</p>
                        ) : tools.length === 0 ? (
                          <p className="helper">
                            No assistant tools yet. Create one under Assistant
                            tools, then pick it here.
                          </p>
                        ) : null}

                        {selectedTool?.description ? (
                          <p className="helper">{selectedTool.description}</p>
                        ) : null}

                        {args.length > 0 && (
                          <div className="stack">
                            <span className="helper">Arguments</span>
                            {args.map((argument, index) => {
                              const parameter = selectedTool?.parameters?.find(
                                (entry) => entry.name === argument.name
                              )

                              return (
                                <label key={argument.id}>
                                  {argument.name}
                                  {parameter?.required ? " *" : ""}
                                  <VariableInput
                                    value={argument.value}
                                    ariaLabel={`${argument.name} value`}
                                    placeholder={
                                      parameter?.description || "{{variable}}"
                                    }
                                    variables={workflowVariables}
                                    onChange={(nextValue) => {
                                      const next = [...args]
                                      const current = next[index]
                                      if (!current) return
                                      next[index] = {
                                        ...current,
                                        value: nextValue,
                                      }
                                      updateInspectorData( {
                                        ...data,
                                        arguments: next,
                                      })
                                    }}
                                  />
                                </label>
                              )
                            })}
                          </div>
                        )}

                        <label>
                          Result variable
                          <input
                            value={data.outputVariable ?? ""}
                            placeholder="toolResult"
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                outputVariable: event.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    )
                  })()}
                {inspectorType === "function" &&
                  (() => {
                    const data = inspectorData as FunctionNodeData
                    const paths = data.paths ?? []

                    return (
                      <>
                        <label>
                          Code
                          <textarea
                            className="code-input"
                            spellCheck={false}
                            value={data.code ?? ""}
                            onChange={(event) =>
                              updateInspectorData({
                                ...data,
                                code: event.target.value,
                              })
                            }
                          />
                        </label>

                        <div className="stack">
                          <span className="helper">Paths</span>
                          {paths.map((path, index) => (
                            <div className="field-row" key={path.id}>
                              <input
                                value={path.name}
                                placeholder="path name"
                                onChange={(event) => {
                                  const next = [...paths]
                                  const current = next[index]
                                  if (!current) return
                                  next[index] = {
                                    ...current,
                                    name: event.target.value,
                                  }
                                  updateInspectorData({
                                    ...data,
                                    paths: next,
                                  })
                                }}
                              />
                              <button
                                className="mini-button"
                                onClick={() => {
                                  const next = paths.filter(
                                    (_, i) => i !== index
                                  )
                                  updateInspectorData({ ...data, paths: next })
                                  pruneNodeHandleEdges(
                                    selectedNode.id,
                                    next.map((entry) => entry.id)
                                  )
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            className="secondary-button"
                            onClick={() =>
                              updateInspectorData({
                                ...data,
                                paths: [
                                  ...paths,
                                  {
                                    id: createId("path"),
                                    name: `path ${paths.length + 1}`,
                                  },
                                ],
                              })
                            }
                          >
                            Add path
                          </button>
                        </div>

                        <p className="helper">
                          Runs server-side with a 2s limit. Return{" "}
                          <code>{"{ next, outputs }"}</code> to pick a path and
                          set variables. An unknown name falls back to the first
                          path; a thrown error takes a path named
                          &quot;error&quot; if you declare one.
                        </p>
                      </>
                    )
                  })()}
                {inspectorType === "carousel" &&
                  (() => {
                    const data = inspectorData as CarouselNodeData
                    const cards = data.cards ?? []

                    const patchCard = (
                      index: number,
                      patch: Partial<CarouselCard>
                    ) => {
                      const next = [...cards]
                      const current = next[index]
                      if (!current) return
                      next[index] = { ...current, ...patch }
                      updateInspectorData( { ...data, cards: next })
                    }

                    return (
                      <>
                        {cards.map((card, index) => (
                          <div className="stack" key={card.id}>
                            <div className="field-row">
                              <span className="helper">Card {index + 1}</span>
                              <button
                                className="mini-button"
                                onClick={() => {
                                  const next = cards.filter(
                                    (_, i) => i !== index
                                  )
                                  updateInspectorData( {
                                    ...data,
                                    cards: next,
                                  })
                                  pruneNodeHandleEdges(
                                    selectedNode.id,
                                    next.flatMap((entry) =>
                                      entry.buttons.map((b) => b.id)
                                    )
                                  )
                                }}
                              >
                                Remove card
                              </button>
                            </div>
                            <label>
                              Title
                              <input
                                value={card.title}
                                onChange={(event) =>
                                  patchCard(index, { title: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              Description
                              <textarea
                                value={card.description}
                                onChange={(event) =>
                                  patchCard(index, {
                                    description: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Image URL
                              <input
                                value={card.url}
                                onChange={(event) =>
                                  patchCard(index, { url: event.target.value })
                                }
                              />
                            </label>
                            {card.buttons.map((button, buttonIndex) => (
                              <div className="field-row" key={button.id}>
                                <input
                                  value={button.label}
                                  onChange={(event) => {
                                    const nextButtons = [...card.buttons]
                                    const currentButton =
                                      nextButtons[buttonIndex]
                                    if (!currentButton) return
                                    nextButtons[buttonIndex] = {
                                      ...currentButton,
                                      label: event.target.value,
                                    }
                                    patchCard(index, { buttons: nextButtons })
                                  }}
                                />
                                <button
                                  className="mini-button"
                                  onClick={() => {
                                    const nextButtons = card.buttons.filter(
                                      (_, i) => i !== buttonIndex
                                    )
                                    patchCard(index, { buttons: nextButtons })
                                    pruneNodeHandleEdges(
                                      selectedNode.id,
                                      cards.flatMap((entry, i) =>
                                        (i === index
                                          ? nextButtons
                                          : entry.buttons
                                        ).map((b) => b.id)
                                      )
                                    )
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button
                              className="secondary-button"
                              onClick={() =>
                                patchCard(index, {
                                  buttons: [
                                    ...card.buttons,
                                    createButton("New button"),
                                  ],
                                })
                              }
                            >
                              Add button
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          onClick={() =>
                            updateInspectorData( {
                              ...data,
                              cards: [
                                ...cards,
                                {
                                  id: createId("card"),
                                  title: `Option ${cards.length + 1}`,
                                  description: "",
                                  url: "",
                                  buttons: [createButton("Choose this")],
                                },
                              ],
                            })
                          }
                        >
                          Add card
                        </button>
                      </>
                    )
                  })()}
                {inspectorType === "customAction" &&
                  (() => {
                    const data = inspectorData as CustomActionNodeData

                    return (
                      <>
                        <label>
                          Action name
                          <input
                            value={data.actionName ?? ""}
                            placeholder="custom_action"
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                actionName: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Payload (JSON)
                          <textarea
                            value={data.payload ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                payload: event.target.value,
                              })
                            }
                          />
                        </label>
                        <p className="helper">
                          Published runs dispatch this as a
                          &quot;workflow.action&quot; webhook event. Test runs
                          only record it, so integrations are never fired from
                          the builder.
                        </p>
                      </>
                    )
                  })()}
                {inspectorType === "javascript" &&
                  (() => {
                    const data = inspectorData as JavascriptNodeData

                    return (
                      <>
                        <label>
                          Code
                          <textarea
                            className="code-input"
                            spellCheck={false}
                            value={data.code ?? ""}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                code: event.target.value,
                              })
                            }
                          />
                        </label>
                        <p className="helper">
                          Runs server-side with a 2s limit. Read and write
                          workflow state through <code>variables</code>, or
                          return an object of values to set. No network or file
                          access. Throwing takes the error branch.
                        </p>
                      </>
                    )
                  })()}
                {inspectorType === "api" &&
                  (() => {
                    const data = inspectorData as ApiNodeData
                    const headers = data.headers ?? []
                    const sendsBody =
                      data.method !== "GET" && data.method !== "DELETE"

                    return (
                      <>
                        <label>
                          Method
                          <select
                            value={data.method ?? "GET"}
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                method: event.target
                                  .value as ApiNodeData["method"],
                              })
                            }
                          >
                            {API_METHODS.map((method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          URL
                          <VariableInput
                            value={data.url ?? ""}
                            ariaLabel="Request URL"
                            placeholder="https://api.example.com/{{userId}}"
                            variables={workflowVariables}
                            onChange={(next) =>
                              updateInspectorData( { ...data, url: next })
                            }
                          />
                        </label>

                        <div className="stack">
                          <span className="helper">Headers</span>
                          {headers.map((header, index) => (
                            <div className="field-row" key={header.id}>
                              <input
                                value={header.key}
                                placeholder="Authorization"
                                onChange={(event) => {
                                  const next = [...headers]
                                  const current = next[index]
                                  if (!current) return
                                  next[index] = {
                                    ...current,
                                    key: event.target.value,
                                  }
                                  updateInspectorData( {
                                    ...data,
                                    headers: next,
                                  })
                                }}
                              />
                              <button
                                className="mini-button"
                                onClick={() =>
                                  updateInspectorData( {
                                    ...data,
                                    headers: headers.filter(
                                      (_, i) => i !== index
                                    ),
                                  })
                                }
                              >
                                Remove
                              </button>
                              <input
                                value={header.value}
                                placeholder="Bearer {{apiKey}}"
                                onChange={(event) => {
                                  const next = [...headers]
                                  const current = next[index]
                                  if (!current) return
                                  next[index] = {
                                    ...current,
                                    value: event.target.value,
                                  }
                                  updateInspectorData( {
                                    ...data,
                                    headers: next,
                                  })
                                }}
                              />
                            </div>
                          ))}
                          <button
                            className="secondary-button"
                            onClick={() =>
                              updateInspectorData( {
                                ...data,
                                headers: [
                                  ...headers,
                                  { id: createId("hdr"), key: "", value: "" },
                                ],
                              })
                            }
                          >
                            Add header
                          </button>
                        </div>

                        {sendsBody && (
                          <label>
                            Body
                            <textarea
                              value={data.body ?? ""}
                              placeholder={'{ "email": "{{email}}" }'}
                              onChange={(event) =>
                                updateInspectorData( {
                                  ...data,
                                  body: event.target.value,
                                })
                              }
                            />
                          </label>
                        )}

                        <label>
                          Response variable
                          <input
                            value={data.responseVariable ?? ""}
                            placeholder="apiResponse"
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                responseVariable: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Status variable
                          <input
                            value={data.statusVariable ?? ""}
                            placeholder="apiStatus"
                            onChange={(event) =>
                              updateInspectorData( {
                                ...data,
                                statusVariable: event.target.value,
                              })
                            }
                          />
                        </label>
                        <p className="helper">
                          JSON responses are flattened, so a downstream step can
                          read {"{{"}
                          {data.responseVariable || "apiResponse"}.field{"}}"}.
                        </p>
                      </>
                    )
                  })()}
                {![
                  "message",
                  "image",
                  "card",
                  "buttons",
                  "choice",
                  "capture",
                  "setVariable",
                  "condition",
                  "prompt",
                  "kbSearch",
                  "playbook",
                  "agent",
                  "crew",
                  "operator",
                  "api",
                  "carousel",
                  "customAction",
                  "javascript",
                  "function",
                  "tool",
                  "component",
                  "start",
                ].includes(selectedNode.type ?? "") && (
                  <>
                    <label>
                      Label
                      <input
                        value={inspectorGenericData?.label ?? ""}
                        onChange={(event) =>
                          updateInspectorData( {
                            ...(inspectorGenericData ?? {}),
                            label: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={inspectorGenericData?.description ?? ""}
                        onChange={(event) =>
                          updateInspectorData( {
                            ...(inspectorGenericData ?? {}),
                            label: inspectorGenericData?.label ?? "Step",
                            description: event.target.value,
                            accent:
                              inspectorGenericData?.accent ??
                              getAccent(selectedNode.type as NodeType),
                          })
                        }
                      />
                    </label>
                  </>
                )}
                <div className="inspector-footnote">
                  Node id <code>{selectedNode.id}</code>
                </div>
              </div>
            </section>
          )}
        </aside>
      )}

      {agentEditorOpen && selectedNode && (
        <AgentEditor
          nodeId={selectedStep?.id ?? selectedNode.id}
          title={
            inspectorGenericData?.customName?.trim() ||
            inspectorGenericData?.label ||
            "Agent"
          }
          data={inspectorData as AgentNodeData}
          assistantTools={assistantTools}
          onChange={applyAgentDataChange}
          onRename={(name) =>
            updateInspectorData({
              ...(inspectorData as AgentNodeData),
              customName: name,
            })
          }
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {drawerMode === "run" && (
        <RunPanel
          nodes={nodes}
          edges={edges}
          autoStartKey={runLaunchKey}
          onAutoStartComplete={completeRunLaunch}
          onClose={() => {
            setDrawerMode(null)
            setRunActiveNodeId(null)
            setRunWaitingNodeId(null)
          }}
          onActiveNodeChange={({ activeNodeId, waitingNodeId }) => {
            setRunActiveNodeId(activeNodeId)
            setRunWaitingNodeId(waitingNodeId)
          }}
        />
      )}

      {drawerMode && drawerMode !== "run" && (
        <aside className="side-drawer">
          {(
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

          {drawerMode === "library" ? (
            <div className="inspector-body library-list">
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
            <div className="inspector-body form">
              <label>
                Name
                <input
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  onBlur={() =>
                    setWorkflowName(
                      (current) => current.trim() || "Untitled workflow"
                    )
                  }
                  placeholder="Untitled workflow"
                />
              </label>
              <label>
                Description
                <textarea
                  value={workflowDescription ?? ""}
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

  return shell
}
