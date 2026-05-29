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

export type SetVariableNodeData = NodeVisual & {
  label: 'Set Variable';
  key: string;
  value: string;
};

export type ConditionOperator = 'equals' | 'not_equals';

export type ConditionNodeData = NodeVisual & {
  label: 'Condition';
  key: string;
  operator: ConditionOperator;
  value: string;
};

export type GenericNodeData = NodeVisual & {
  label: string;
  description?: string;
  accent?: 'agent' | 'talk' | 'listen' | 'logic' | 'dev' | 'system';
};

export type NodeData =
  | StartNodeData
  | MessageNodeData
  | ImageNodeData
  | CardNodeData
  | ButtonsNodeData
  | SetVariableNodeData
  | ConditionNodeData
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
