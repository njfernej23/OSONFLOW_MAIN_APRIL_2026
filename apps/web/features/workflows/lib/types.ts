export const WORKFLOW_SCHEMA_VERSION = 1 as const;

export type NodeType =
  | 'start'
  | 'block'
  | 'playbook'
  | 'agent'
  | 'crew'
  | 'operator'
  | 'message'
  | 'prompt'
  | 'image'
  | 'card'
  | 'carousel'
  | 'buttons'
  | 'choice'
  | 'capture'
  | 'setVariable'
  | 'condition'
  | 'component'
  | 'end'
  | 'tool'
  | 'function'
  | 'api'
  | 'javascript'
  | 'kbSearch'
  | 'callForward'
  | 'customAction';

export type ButtonOption = {
  id: string;
  label: string;
};

export type BlockColor = 'default' | 'blue' | 'green' | 'orange' | 'purple' | 'rose';

export type NodeVisual = {
  customName?: string;
  blockColor?: BlockColor;
};

export type StartNodeData = NodeVisual & {
  label: 'Start';
};

export type MessageNodeData = NodeVisual & {
  label: 'Message';
  text: string;
};

export type ImageNodeData = NodeVisual & {
  label: 'Image';
  source?: 'upload' | 'link';
  url: string;
  alt: string;
  fileName?: string;
};

export type CardNodeData = NodeVisual & {
  label: 'Card';
  source?: 'upload' | 'link';
  url: string;
  alt: string;
  fileName?: string;
  title: string;
  description: string;
  buttons: ButtonOption[];
};

export type ButtonsNodeData = NodeVisual & {
  label: 'Buttons';
  buttons: ButtonOption[];
};

export type ChoiceNodeData = NodeVisual & {
  label: 'Choice';
  choices: ButtonOption[];
  variableKey: string;
  prompt?: string;
};

export type CaptureNodeData = NodeVisual & {
  label: 'Capture';
  variableKey: string;
  prompt?: string;
};

export type SetVariableNodeData = NodeVisual & {
  label: 'Set Variable';
  key: string;
  value: string;
};

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists';

export type ConditionNodeData = NodeVisual & {
  label: 'Condition';
  key: string;
  operator: ConditionOperator;
  value: string;
};

export type PromptNodeData = NodeVisual & {
  label: 'Prompt';
  instructions: string;
  useKnowledgeBase?: boolean;
  outputVariable?: string;
};

export type KbSearchNodeData = NodeVisual & {
  label: 'KB search';
  query: string;
  outputVariable?: string;
  sendAsMessage?: boolean;
};

export type PlaybookNodeData = NodeVisual & {
  label: string;
  instructions: string;
  talksFirst?: boolean;
  useKnowledgeBase?: boolean;
  outputVariable?: string;
};

export const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export type ApiMethod = (typeof API_METHODS)[number];

export type ApiHeader = {
  id: string;
  key: string;
  value: string;
};

export type ApiNodeData = NodeVisual & {
  label: 'API';
  method: ApiMethod;
  url: string;
  headers: ApiHeader[];
  body: string;
  /** Raw response body is stored here; JSON fields are flattened under it. */
  responseVariable: string;
  statusVariable: string;
};

export type CarouselCard = {
  id: string;
  title: string;
  description: string;
  url: string;
  buttons: ButtonOption[];
};

export type CarouselNodeData = NodeVisual & {
  label: 'Carousel';
  cards: CarouselCard[];
};

export type CustomActionNodeData = NodeVisual & {
  label: 'Custom action';
  /** Name carried in the workflow.action webhook payload. */
  actionName: string;
  /** JSON object template; {{variables}} are interpolated before dispatch. */
  payload: string;
};

export type JavascriptNodeData = NodeVisual & {
  label: 'JavaScript';
  code: string;
  /** Comma-free list of variable names the snippet is expected to produce. */
  outputVariables: string[];
};

export type ToolArgument = {
  id: string;
  name: string;
  value: string;
};

export type ToolNodeData = NodeVisual & {
  label: 'Tool';
  /** Matches an assistantTools row by name, the same key the AI agent uses. */
  toolName: string;
  arguments: ToolArgument[];
  outputVariable: string;
};

/**
 * One step inside a Block. Steps run top-to-bottom with no wires between
 * them; only the block itself is wired on the canvas.
 */
export type BlockStep = {
  id: string;
  type: NodeType;
  data: NodeData;
};

export type BlockNodeData = NodeVisual & {
  label: 'Block';
  steps: BlockStep[];
};

export type FunctionPath = {
  id: string;
  name: string;
};

export type FunctionNodeData = NodeVisual & {
  label: 'Function';
  code: string;
  /** Named exits the snippet can pick between by returning { next }. */
  paths: FunctionPath[];
};

export type ComponentInput = {
  id: string;
  name: string;
  value: string;
};

export type ComponentNodeData = NodeVisual & {
  label: 'Component';
  /** Id of the workflow this component runs. */
  workflowId: string;
  /** Cached name so the canvas can label the block without a lookup. */
  workflowName?: string;
  inputs: ComponentInput[];
};

export type CallForwardNodeData = NodeVisual & {
  label: 'Call forward';
  description?: string;
};

export type GenericNodeData = NodeVisual & {
  label: string;
  description?: string;
  accent?: 'agent' | 'talk' | 'listen' | 'logic' | 'dev' | 'system';
  instructions?: string;
  query?: string;
  variableKey?: string;
  outputVariable?: string;
  useKnowledgeBase?: boolean;
  talksFirst?: boolean;
  sendAsMessage?: boolean;
  choices?: ButtonOption[];
  prompt?: string;
};

export type NodeData =
  | StartNodeData
  | MessageNodeData
  | ImageNodeData
  | CardNodeData
  | ButtonsNodeData
  | ChoiceNodeData
  | CaptureNodeData
  | SetVariableNodeData
  | ConditionNodeData
  | ApiNodeData
  | CarouselNodeData
  | CustomActionNodeData
  | JavascriptNodeData
  | ToolNodeData
  | ComponentNodeData
  | BlockNodeData
  | FunctionNodeData
  | PromptNodeData
  | KbSearchNodeData
  | PlaybookNodeData
  | CallForwardNodeData
  | GenericNodeData;

export type WorkflowNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: WorkflowEdgeData | null;
};

export type WorkflowEdgeData = {
  label?: string;
  color?: string;
};

export type WorkflowDefinition = {
  schemaVersion: typeof WORKFLOW_SCHEMA_VERSION;
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type RuntimeVariables = Record<string, string>;

export type WaitingMode = 'buttons' | 'capture' | 'choice' | 'ai_turn';

/**
 * Step types that expose more than one outgoing port, or that end the run.
 * These can only ever be the last step of a block: anything placed after them
 * would be unreachable, or would need ports the block cannot show.
 */
export const isTerminalStepType = (type: NodeType) =>
  type === 'buttons' ||
  type === 'choice' ||
  type === 'condition' ||
  type === 'api' ||
  type === 'javascript' ||
  type === 'function' ||
  type === 'tool' ||
  type === 'carousel' ||
  type === 'card' ||
  type === 'end' ||
  type === 'callForward';

/** Named source ports a step contributes to its block, with their labels. */
export const stepPorts = (step: BlockStep): Array<{ id: string; label: string }> => {
  switch (step.type) {
    case 'condition':
      return [
        { id: 'true', label: 'true' },
        { id: 'false', label: 'false' },
      ];
    case 'function':
      return ((step.data as FunctionNodeData).paths ?? []).map((path) => ({
        id: path.id,
        label: path.name,
      }));
    case 'api':
    case 'javascript':
    case 'tool':
      return [
        { id: 'success', label: 'ok' },
        { id: 'fail', label: 'error' },
      ];
    case 'buttons':
      return ((step.data as ButtonsNodeData).buttons ?? []).map((b) => ({
        id: b.id,
        label: b.label,
      }));
    case 'choice':
      return ((step.data as ChoiceNodeData).choices ?? []).map((c) => ({
        id: c.id,
        label: c.label,
      }));
    case 'card':
      return ((step.data as CardNodeData).buttons ?? []).map((b) => ({
        id: b.id,
        label: b.label,
      }));
    case 'carousel':
      return ((step.data as CarouselNodeData).cards ?? []).flatMap((card) =>
        card.buttons.map((b) => ({ id: b.id, label: b.label }))
      );
    default:
      return [];
  }
};
