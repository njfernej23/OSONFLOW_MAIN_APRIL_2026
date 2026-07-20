import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ChoiceNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const ChoiceNode = ({ id, data }: NodeProps<ChoiceNodeData>) => {
  const choices = data.choices ?? [];

  return (
    <div className={`node node-buttons node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Choice" />
      <div className="node-body">
        {data.prompt?.trim() ? (
          <div className="node-empty" style={{ marginBottom: 8 }}>
            {data.prompt}
          </div>
        ) : null}
        {choices.length === 0 ? (
          <div className="node-empty">Add choices in the inspector.</div>
        ) : (
          choices.map((choice) => (
            <div key={choice.id} className="node-button">
              {choice.label}
              <Handle
                id={choice.id}
                type="source"
                position={Position.Right}
                className="node-handle node-button-handle"
              />
            </div>
          ))
        )}
        <div className="node-chip" style={{ marginTop: 8 }}>
          → {data.variableKey || 'lastInput'}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
    </div>
  );
};

export default ChoiceNode;
