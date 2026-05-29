import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { SetVariableNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const SetVariableNode = ({ id, data }: NodeProps<SetVariableNodeData>) => {
  return (
    <div className={`node node-variable node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Set Variable" />
      <div className="node-body">
        <div className="node-kv">
          <span>{data.key || 'variable'}</span>
          <strong>{data.value || 'value'}</strong>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default SetVariableNode;
