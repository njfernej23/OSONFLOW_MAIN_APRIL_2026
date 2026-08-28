import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { JavascriptNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

const JavascriptNode = ({ id, data }: NodeProps<JavascriptNodeData>) => {
  const preview = (data.code ?? '').trim().split('\n').slice(0, 3).join('\n');

  return (
    <div className={`node node-javascript node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="JavaScript" />
      <div className="node-body">
        {preview ? (
          <pre className="node-code">{preview}</pre>
        ) : (
          <div className="node-empty">Write a snippet in the inspector.</div>
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

export default JavascriptNode;
