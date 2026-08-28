import { Handle, Position } from 'reactflow';
import type {
  ApiNodeData,
  BlockStep,
  ButtonsNodeData,
  CaptureNodeData,
  CardNodeData,
  CarouselNodeData,
  ChoiceNodeData,
  ComponentNodeData,
  ConditionNodeData,
  CustomActionNodeData,
  GenericNodeData,
  ImageNodeData,
  JavascriptNodeData,
  MessageNodeData,
  NodeType,
  SetVariableNodeData,
  ToolNodeData,
} from '../lib/types';
import { stepPorts } from '../lib/types';
import Icon from './StepIcon';
import { STEP_ICONS } from './nodeIcon';


const STEP_LABELS: Partial<Record<NodeType, string>> = {
  setVariable: 'Set',
  kbSearch: 'KB search',
  callForward: 'Call forward',
  customAction: 'Custom action',
  javascript: 'JavaScript',
};

const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** One-line gist of a step, so a stacked block stays readable. */
const stepSummary = (step: BlockStep): string => {
  const data = step.data;

  switch (step.type) {
    case 'message':
      return plainText((data as MessageNodeData).text || '') || 'Empty message';
    case 'prompt':
    case 'playbook':
    case 'agent':
    case 'crew':
    case 'operator':
      return (data as GenericNodeData).instructions?.trim() || 'No instructions';
    case 'image': {
      const image = data as ImageNodeData;
      return image.fileName || image.url || 'No image';
    }
    case 'card':
      return (data as CardNodeData).title?.trim() || 'Untitled card';
    case 'carousel': {
      const cards = (data as CarouselNodeData).cards ?? [];
      return `${cards.length} card${cards.length === 1 ? '' : 's'}`;
    }
    case 'buttons':
      return ((data as ButtonsNodeData).buttons ?? []).map((b) => b.label).join(' · ') || 'No buttons';
    case 'choice':
      return ((data as ChoiceNodeData).choices ?? []).map((c) => c.label).join(' · ') || 'No choices';
    case 'capture':
      return `→ ${(data as CaptureNodeData).variableKey || 'lastInput'}`;
    case 'condition': {
      const condition = data as ConditionNodeData;
      return `${condition.key || 'variable'} ${condition.operator ?? 'equals'} ${condition.value ?? ''}`.trim();
    }
    case 'setVariable': {
      const set = data as SetVariableNodeData;
      return `${set.key || 'variable'} = ${set.value || 'value'}`;
    }
    case 'api': {
      const api = data as ApiNodeData;
      return `${api.method ?? 'GET'} ${api.url || 'no URL'}`;
    }
    case 'javascript':
      return (data as JavascriptNodeData).code?.trim().split('\n')[0] || 'Empty snippet';
    case 'tool':
      return (data as ToolNodeData).toolName || 'No tool selected';
    case 'component':
      return (data as ComponentNodeData).workflowName || 'No workflow selected';
    case 'customAction':
      return (data as CustomActionNodeData).actionName || 'custom_action';
    default:
      return (data as GenericNodeData).description?.trim() || '';
  }
};

const StepRow = ({
  step,
  isLast,
  isSelected,
  onSelect,
}: {
  step: BlockStep;
  isLast: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  // Only the last step can branch, so only it contributes ports.
  const ports = isLast ? stepPorts(step) : [];
  const title = step.data.customName?.trim() || STEP_LABELS[step.type] || step.data.label || step.type;

  return (
    <div className={`block-step ${isSelected ? 'selected' : ''}`}>
      <button type="button" className="block-step-main" onClick={onSelect}>
        <span className="block-step-icon" aria-hidden>
          <Icon name={STEP_ICONS[step.type] ?? 'component'} size={16} />
        </span>
        <span className="block-step-copy">
          <span className="block-step-title">{title}</span>
          <span className="block-step-summary">{stepSummary(step)}</span>
        </span>
      </button>
      {ports.length > 0 && (
        <div className="block-step-ports">
          {ports.map((port) => (
            <div key={port.id} className="block-step-port">
              <span>{port.label}</span>
              <Handle
                id={port.id}
                type="source"
                position={Position.Right}
                className="node-handle node-button-handle"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StepRow;
