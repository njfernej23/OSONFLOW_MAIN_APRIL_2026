import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { CaptureNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const CaptureNode = ({ id, data }: NodeProps<CaptureNodeData>) => {
  return (
    <div className={`node node-generic node-listen node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Capture" />
      <div className="node-body">
        <div className="node-chip">{data.variableKey || 'lastInput'}</div>
        {data.prompt?.trim() ? (
          <div className="node-empty" style={{ marginTop: 8 }}>
            {data.prompt}
          </div>
        ) : (
          <div className="node-empty" style={{ marginTop: 8 }}>
            Waits for the user reply, then stores it.
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default CaptureNode;
