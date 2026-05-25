import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { MessageNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const MessageNode = ({ id, data }: NodeProps<MessageNodeData>) => {
  return (
    <div className={`node node-message node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Message" />
      <div
        className="node-body"
        dangerouslySetInnerHTML={{ __html: data.text || 'Enter message' }}
      />
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default MessageNode;
