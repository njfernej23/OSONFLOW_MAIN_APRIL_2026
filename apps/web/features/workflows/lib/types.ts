export const WORKFLOW_SCHEMA_VERSION = 1 as const;

export type NodeType =
  | 'start'
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
