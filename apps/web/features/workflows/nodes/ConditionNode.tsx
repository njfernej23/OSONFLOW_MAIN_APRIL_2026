import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ConditionNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const ConditionNode = ({ id, data }: NodeProps<ConditionNodeData>) => {
  const operatorLabel = data.operator === 'equals' ? '=' : '!=';

  return (
    <div className={`node node-condition node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Condition" />
      <div className="node-body node-condition-body">
        <span className="node-chip">{data.key || 'variable'}</span>
        <span className="node-operator">{operatorLabel}</span>
        <span className="node-chip">{data.value || 'value'}</span>
      </div>
      <div className="node-branch node-branch-true">true</div>
      <div className="node-branch node-branch-false">false</div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        className="node-handle"
        style={{ top: 52 }}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        className="node-handle"
        style={{ top: 86 }}
      />
    </div>
  );
};

export default ConditionNode;
