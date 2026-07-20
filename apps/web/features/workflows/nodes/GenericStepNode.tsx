import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { GenericNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const GenericStepNode = ({ id, data }: NodeProps<GenericNodeData>) => {
  const preview =
    data.instructions?.trim() ||
    data.query?.trim() ||
    data.description?.trim() ||
    'Configure this step in the inspector.';

  return (
    <div
      className={`node node-generic node-${data.accent ?? 'system'} node-color-${
        data.blockColor ?? 'default'
      }`}
    >
      <EditableNodeTitle nodeId={id} value={data.customName} fallback={data.label} />
      <div className="node-body">{preview}</div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default GenericStepNode;
