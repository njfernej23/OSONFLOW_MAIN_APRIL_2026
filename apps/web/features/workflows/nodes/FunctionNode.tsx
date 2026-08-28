import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { FunctionNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

const FunctionNode = ({ id, data }: NodeProps<FunctionNodeData>) => {
  const paths = data.paths ?? [];
  const preview = (data.code ?? '').trim().split('\n')[0];

  return (
    <div className={`node node-function node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Function" />
      <div className="node-body">
        {preview ? (
          <pre className="node-code">{preview}</pre>
        ) : (
          <div className="node-empty">Write a snippet in the inspector.</div>
        )}
        {paths.length === 0 ? (
          <div className="node-empty" style={{ marginTop: 6 }}>
            Add at least one path.
          </div>
        ) : (
          <NodePorts
            ports={paths.map((path) => ({ id: path.id, label: path.name }))}
          />
        )}
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
    </div>
  );
};

export default FunctionNode;
