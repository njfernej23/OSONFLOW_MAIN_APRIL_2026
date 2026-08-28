import type { Edge, Node } from 'reactflow';

import {
  isTerminalStepType,
  stepPorts,
  type ApiNodeData,
  type BlockNodeData,
  type BlockStep,
  type ButtonsNodeData,
  type CarouselNodeData,
  type ChoiceNodeData,
  type ComponentNodeData,
  type ConditionNodeData,
  type FunctionNodeData,
  type MessageNodeData,
  type NodeData,
  type NodeType,
  type SetVariableNodeData,
  type ToolNodeData,
} from './types';

export type ValidationLevel = 'error' | 'warning';

export type ValidationIssue = {
  id: string;
  level: ValidationLevel;
  nodeId?: string;
  title: string;
  detail: string;
};

/** Steps that legitimately end a path, so a missing exit is fine. */
const ENDS_A_PATH = new Set<NodeType>(['end', 'callForward']);

const asSteps = (node: Node<NodeData>): BlockStep[] =>
  node.type === 'block'
    ? ((node.data as BlockNodeData).steps ?? [])
    : [
        {
          id: node.id,
          type: node.type as NodeType,
          data: node.data,
        },
      ];

/**
 * Checks a workflow against the rules the runtime actually enforces, so
 * problems surface in the builder instead of mid-conversation.
 */
export const validateWorkflow = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  componentStatus: Map<string, { name: string; isPublished: boolean }> = new Map()
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const push = (issue: Omit<ValidationIssue, 'id'>) =>
    issues.push({ ...issue, id: `${issue.nodeId ?? 'flow'}:${issue.title}` });

  const startNodes = nodes.filter((node) => node.type === 'start');

  if (startNodes.length === 0) {
    push({
      level: 'error',
      title: 'No Start block',
      detail: 'A published workflow needs a Start block to begin from.',
    });
  }

  const outgoing = new Map<string, Edge[]>();
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  // --- reachability from Start ---
  const reachable = new Set<string>();
  const queue = startNodes.map((node) => node.id);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (edge.target) queue.push(edge.target);
    }
  }

  for (const node of nodes) {
    const label = (node.data.customName as string | undefined)?.trim() || node.type;

    if (startNodes.length > 0 && !reachable.has(node.id)) {
      push({
        level: 'warning',
        nodeId: node.id,
        title: `"${label}" is unreachable`,
        detail: 'Nothing connects to this block, so it will never run.',
      });
    }

    const steps = asSteps(node);
    const lastStep = steps[steps.length - 1];

    steps.forEach((step, index) => {
      const stepLabel =
        (step.data.customName as string | undefined)?.trim() || step.type;
      const isLast = index === steps.length - 1;

      // A branching step in the middle of a block makes later steps dead code.
      if (!isLast && isTerminalStepType(step.type)) {
        push({
          level: 'error',
          nodeId: node.id,
          title: `"${stepLabel}" branches mid-block`,
          detail: 'A branching step has to be the last step in its block.',
        });
      }

      // --- per-step configuration ---
      switch (step.type) {
        case 'message': {
          if (!(step.data as MessageNodeData).text?.trim()) {
            push({
              level: 'warning',
              nodeId: node.id,
              title: `"${stepLabel}" has no text`,
              detail: 'This step will send an empty message.',
            });
          }
          break;
        }
        case 'api': {
          if (!(step.data as ApiNodeData).url?.trim()) {
            push({
              level: 'error',
              nodeId: node.id,
              title: `"${stepLabel}" has no URL`,
              detail: 'An API step without a URL fails at runtime.',
            });
          }
          break;
        }
        case 'tool': {
          if (!(step.data as ToolNodeData).toolName?.trim()) {
            push({
              level: 'error',
              nodeId: node.id,
              title: `"${stepLabel}" has no tool selected`,
              detail: 'Pick an assistant tool for this step.',
            });
          }
          break;
        }
        case 'function': {
          if (((step.data as FunctionNodeData).paths ?? []).length === 0) {
            push({
              level: 'error',
              nodeId: node.id,
              title: `"${stepLabel}" has no paths`,
              detail: 'A Function needs at least one named exit path.',
            });
          }
          break;
        }
        case 'component': {
          const data = step.data as ComponentNodeData;

          if (!data.workflowId) {
            push({
              level: 'error',
              nodeId: node.id,
              title: `"${stepLabel}" has no workflow selected`,
              detail: 'Pick the workflow this component should run.',
            });
            break;
          }

          const target = componentStatus.get(data.workflowId);

          if (target && !target.isPublished) {
            push({
              level: 'error',
              nodeId: node.id,
              title: `"${target.name}" is not published`,
              detail:
                'A component runs its published snapshot. Publish it as a component first.',
            });
          }
          break;
        }
        case 'condition': {
          const data = step.data as ConditionNodeData;
          if (!data.key?.trim()) {
            push({
              level: 'warning',
              nodeId: node.id,
              title: `"${stepLabel}" checks no variable`,
              detail: 'This condition will always compare an empty value.',
            });
          }
          break;
        }
        case 'setVariable': {
          if (!(step.data as SetVariableNodeData).key?.trim()) {
            push({
              level: 'warning',
              nodeId: node.id,
              title: `"${stepLabel}" sets no variable name`,
              detail: 'Give this step a variable to write into.',
            });
          }
          break;
        }
        case 'buttons':
        case 'choice':
        case 'carousel': {
          const count =
            step.type === 'buttons'
              ? ((step.data as ButtonsNodeData).buttons ?? []).length
              : step.type === 'choice'
                ? ((step.data as ChoiceNodeData).choices ?? []).length
                : ((step.data as CarouselNodeData).cards ?? []).length;

          if (count === 0) {
            push({
              level: 'warning',
              nodeId: node.id,
              title: `"${stepLabel}" has no options`,
              detail: 'With nothing to choose, this step just passes through.',
            });
          }
          break;
        }
        default:
          break;
      }
    });

    // --- exits ---
    const nodeEdges = outgoing.get(node.id) ?? [];
    const ports = lastStep ? stepPorts(lastStep) : [];

    if (ports.length > 0) {
      for (const port of ports) {
        if (!nodeEdges.some((edge) => edge.sourceHandle === port.id)) {
          push({
            level: 'warning',
            nodeId: node.id,
            title: `"${label}" → ${port.label} goes nowhere`,
            detail: 'That path ends the conversation without an End block.',
          });
        }
      }
    } else if (
      lastStep &&
      !ENDS_A_PATH.has(lastStep.type) &&
      node.type !== 'start' &&
      nodeEdges.length === 0
    ) {
      push({
        level: 'warning',
        nodeId: node.id,
        title: `"${label}" has no next step`,
        detail: 'The conversation stops here without an End block.',
      });
    }
  }

  for (const start of startNodes) {
    if ((outgoing.get(start.id) ?? []).length === 0) {
      push({
        level: 'error',
        nodeId: start.id,
        title: 'Start connects to nothing',
        detail: 'Wire Start to the first step of your flow.',
      });
    }
  }

  // Errors first, then warnings, in canvas order.
  return issues.sort((a, b) =>
    a.level === b.level ? 0 : a.level === 'error' ? -1 : 1
  );
};
