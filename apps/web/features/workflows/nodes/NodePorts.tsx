import { Handle, Position } from 'reactflow';

export type NodePort = {
  id: string;
  label: string;
};

/**
 * Named exits for a node, rendered as rows.
 *
 * Every branching node uses this so its handles follow the content instead of
 * sitting at hardcoded pixel offsets that drift as the node grows.
 */
const NodePorts = ({ ports }: { ports: NodePort[] }) => {
  if (ports.length === 0) {
    return null;
  }

  return (
    <div className="node-ports">
      {ports.map((port) => (
        <div key={port.id} className="node-button node-port-row">
          <span>{port.label}</span>
          <Handle
            id={port.id}
            type="source"
            position={Position.Right}
            className="node-handle node-button-handle"
          />
        </div>
      ))}
    </div>
  );
};

export default NodePorts;
