import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ButtonsNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const ButtonsNode = ({ id, data }: NodeProps<ButtonsNodeData>) => {
  return (
    <div className={`node node-buttons node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Buttons" />
      <div className="node-body">
        {data.buttons.length === 0 ? (
          <div className="node-empty">Add buttons in the inspector.</div>
        ) : (
          data.buttons.map((button) => (
            <div key={button.id} className="node-button">
              {button.label}
              <Handle
                id={button.id}
                type="source"
                position={Position.Right}
                className="node-handle node-button-handle"
              />
            </div>
          ))
        )}
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
    </div>
  );
};

export default ButtonsNode;
