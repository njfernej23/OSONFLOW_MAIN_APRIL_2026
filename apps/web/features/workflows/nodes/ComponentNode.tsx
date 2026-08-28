import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ComponentNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const ComponentNode = ({ id, data }: NodeProps<ComponentNodeData>) => {
  const inputs = data.inputs ?? [];

  return (
    <div className={`node node-component node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Component" />
      <div className="node-body">
        {data.workflowId ? (
          <>
            <div className="node-chip">{data.workflowName || 'Saved workflow'}</div>
            {inputs.length > 0 && (
              <div className="node-empty" style={{ marginTop: 8 }}>
                {inputs.map((input) => input.name).filter(Boolean).join(', ')}
              </div>
            )}
          </>
        ) : (
          <div className="node-empty">Pick a workflow in the inspector.</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default ComponentNode;
