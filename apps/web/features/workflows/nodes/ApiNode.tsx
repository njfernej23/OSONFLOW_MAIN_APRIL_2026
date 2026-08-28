import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ApiNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

const ApiNode = ({ id, data }: NodeProps<ApiNodeData>) => {
  const url = data.url?.trim();

  return (
    <div className={`node node-api node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="API" />
      <div className="node-body">
        <div className="node-api-line">
          <span className={`node-api-method method-${(data.method ?? 'GET').toLowerCase()}`}>
            {data.method ?? 'GET'}
          </span>
          <span className="node-api-url">{url || 'Add a request URL.'}</span>
        </div>
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

export default ApiNode;
