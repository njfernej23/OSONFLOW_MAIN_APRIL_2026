import type { Node } from 'reactflow';

import type {
  ApiNodeData,
  BlockNodeData,
  BlockStep,
  CaptureNodeData,
  ChoiceNodeData,
  GenericNodeData,
  NodeData,
  NodeType,
  SetVariableNodeData,
  ToolNodeData,
} from './types';

export type WorkflowVariable = {
  name: string;
  /** Where the value comes from, shown when hovering a token. */
  source: string;
};

const BUILT_INS: WorkflowVariable[] = [
  { name: 'lastInput', source: 'Built-in · the user’s most recent reply' },
  { name: 'lastUserMessage', source: 'Built-in · the user’s most recent message' },
  { name: 'lastAiResponse', source: 'Built-in · the last AI reply' },
  { name: 'lastButtonId', source: 'Built-in · id of the button just chosen' },
  { name: 'lastButtonLabel', source: 'Built-in · label of the button just chosen' },
];

const stepsOf = (node: Node<NodeData>): BlockStep[] =>
  node.type === 'block'
    ? ((node.data as BlockNodeData).steps ?? [])
    : [{ id: node.id, type: node.type as NodeType, data: node.data }];

/** Every variable this graph can produce, for the picker and token tooltips. */
export const collectWorkflowVariables = (
  nodes: Node<NodeData>[]
): WorkflowVariable[] => {
  const found = new Map<string, string>();

  const add = (name: string | undefined, source: string) => {
    const key = name?.trim();
    if (key && !found.has(key)) found.set(key, source);
  };

  for (const node of nodes) {
    for (const step of stepsOf(node)) {
      const named =
        (step.data.customName as string | undefined)?.trim() ||
        (step.data.label as string | undefined)?.trim() ||
        step.type;

      switch (step.type) {
        case 'setVariable':
          add((step.data as SetVariableNodeData).key, `Set by "${named}"`);
          break;
        case 'capture':
          add(
            (step.data as CaptureNodeData).variableKey,
            `Captured by "${named}"`
          );
          break;
        case 'choice':
          add(
            (step.data as ChoiceNodeData).variableKey,
            `Chosen in "${named}"`
          );
          break;
        case 'api': {
          const data = step.data as ApiNodeData;
          add(data.responseVariable, `Response body from "${named}"`);
          add(data.statusVariable, `Status code from "${named}"`);
          break;
        }
        case 'tool':
          add((step.data as ToolNodeData).outputVariable, `Result of "${named}"`);
          break;
        default:
          add(
            (step.data as GenericNodeData).outputVariable,
            `Output of "${named}"`
          );
          break;
      }
    }
  }

  return [
    ...[...found].map(([name, source]) => ({ name, source })),
    ...BUILT_INS.filter((builtIn) => !found.has(builtIn.name)),
  ];
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const TOKEN_PATTERN =
  /<span[^>]*class="variable-token"[^>]*data-variable="([^"]*)"[^>]*>[\s\S]*?<\/span>/g;

/** Turn tokens back into plain {{name}} so re-tokenising is idempotent. */
export const untokenizeVariables = (html: string) =>
  html.replace(TOKEN_PATTERN, (_match, name: string) => `{{${name}}}`);

/**
 * Wrap {{name}} in a pill.
 *
 * The braces stay in the DOM text (only visually hidden), so the stored value
 * still reads {{name}} to renderTemplate at runtime, and the server's
 * stripHtml removes the wrapper entirely.
 */
export const tokenizeVariables = (
  html: string,
  variables: WorkflowVariable[] = []
) => {
  const sources = new Map(variables.map((entry) => [entry.name, entry.source]));

  return untokenizeVariables(html).replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    (_match, name: string) => {
      const known = sources.get(name);
      const title = known ?? `Not set by any step yet · ${name}`;

      return (
        `<span class="variable-token${known ? '' : ' unknown'}"` +
        ` contenteditable="false" data-variable="${escapeHtml(name)}"` +
        ` title="${escapeHtml(title)}"><b>{{</b>${escapeHtml(name)}<b>}}</b></span>`
      );
    }
  );
};

export const buildVariableToken = (
  name: string,
  variables: WorkflowVariable[] = []
) => tokenizeVariables(`{{${name}}}`, variables);

/**
 * Plain template text -> tokenised HTML, for fields whose stored value must
 * stay plain (an API URL, a Set Variable value) but should still show pills.
 */
export const plainToTokenizedHtml = (
  text: string,
  variables: WorkflowVariable[] = []
) => tokenizeVariables(escapeHtml(text ?? ""), variables);

/** Tokenised HTML -> the plain {{name}} text the runtime expects. */
export const htmlToTemplateText = (html: string) =>
  untokenizeVariables(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
