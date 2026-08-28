import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ToolNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

const ToolNode = ({ id, data }: NodeProps<ToolNodeData>) => {
  const args = data.arguments ?? [];

  return (
    <div className={`node node-tool node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Tool" />
      <div className="node-body">
        {data.toolName?.trim() ? (
          <>
            <div className="node-chip">{data.toolName}</div>
            {args.length > 0 && (
              <div className="node-empty" style={{ marginTop: 6 }}>
                {args.map((argument) => argument.name).join(', ')}
              </div>
            )}
          </>
        ) : (
          <div className="node-empty">Pick a tool in the inspector.</div>
        )}
        <NodePorts
          ports={[
            { id: 'success', label: 'ok' },
            { id: 'fail', label: 'error' },
          ]}
        />
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
    </div>
  );
};

export default ToolNode;
