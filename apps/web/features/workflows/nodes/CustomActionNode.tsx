import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { CustomActionNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const CustomActionNode = ({ id, data }: NodeProps<CustomActionNodeData>) => {
  return (
    <div className={`node node-generic node-dev node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Custom action" />
      <div className="node-body">
        <div className="node-chip">{data.actionName?.trim() || 'custom_action'}</div>
        <div className="node-empty" style={{ marginTop: 8 }}>
          Sends a workflow.action webhook event.
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default CustomActionNode;
