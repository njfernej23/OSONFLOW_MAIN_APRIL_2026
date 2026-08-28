import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ConditionNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

const OPERATOR_LABELS: Record<string, string> = {
  equals: '=',
  not_equals: '!=',
  contains: 'contains',
  not_contains: '!contains',
  exists: 'exists',
  not_exists: '!exists',
};

const ConditionNode = ({ id, data }: NodeProps<ConditionNodeData>) => {
  const operatorLabel = OPERATOR_LABELS[data.operator ?? 'equals'] ?? '=';
  const showValue = data.operator !== 'exists' && data.operator !== 'not_exists';

  return (
    <div className={`node node-condition node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Condition" />
      <div className="node-body">
        <div className="node-condition-body">
          <span className="node-chip">{data.key || 'variable'}</span>
          <span className="node-operator">{operatorLabel}</span>
          {showValue ? <span className="node-chip">{data.value || 'value'}</span> : null}
        </div>
        <NodePorts
          ports={[
            { id: 'true', label: 'true' },
            { id: 'false', label: 'false' },
          ]}
        />
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
    </div>
  );
};

export default ConditionNode;
