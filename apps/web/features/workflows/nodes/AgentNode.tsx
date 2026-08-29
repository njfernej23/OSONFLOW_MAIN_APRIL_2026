import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { AgentNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

/**
 * A node from the agent family. Its exit conditions are real ports, so an
 * agent branches on the canvas the same way a Condition does; with none
 * configured it keeps a single default handle on the right.
 */
const AgentNode = ({ id, data }: NodeProps<AgentNodeData>) => {
  const exits = data.exitConditions ?? [];
  const tools = data.tools ?? [];
  const preview =
    data.instructions?.trim() ||
    (data as { description?: string }).description?.trim() ||
    'Open the agent editor to write its instructions.';

  return (
    <div
      className={`node node-generic node-agent node-color-${data.blockColor ?? 'default'}`}
    >
      <EditableNodeTitle nodeId={id} value={data.customName} fallback={data.label} />
      <div className="node-body">
        <div className="node-agent-preview">{preview}</div>
        {tools.length > 0 && (
          <div className="node-agent-tools">
            {tools.map((tool) => (
              <span key={tool.id} className="node-chip">
                {tool.toolName || tool.kind}
              </span>
            ))}
          </div>
        )}
        <NodePorts
          ports={exits.map((exit) => ({
            id: exit.id,
            label: exit.name.trim() || 'Exit',
          }))}
        />
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      {exits.length === 0 && (
        <Handle type="source" position={Position.Right} className="node-handle" />
      )}
    </div>
  );
};

export default AgentNode;
