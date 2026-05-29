import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { StartNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const StartNode = ({ id, data }: NodeProps<StartNodeData>) => {
  return (
    <div className={`node node-start node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback={data.label} />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default StartNode;
