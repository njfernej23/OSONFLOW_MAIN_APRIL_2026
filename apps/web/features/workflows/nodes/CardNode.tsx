import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { CardNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const stripHtml = (html: string) => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element.textContent?.trim() ?? '';
};

const CardNode = ({ id, data }: NodeProps<CardNodeData>) => {
  const title = data.title?.trim() || data.customName || 'Card title';
  const description = stripHtml(data.description || '');
  const hasImage = Boolean(data.url?.trim());
  const hasButtons = data.buttons.length > 0;

  return (
    <div
      className={`node node-card ${hasImage ? 'node-card-has-image' : ''} node-color-${
        data.blockColor ?? 'default'
      }`}
    >
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Card" />
      <div className="node-body node-card-body">
        <div className="node-card-summary">
          <div className="node-card-thumb" aria-hidden>
            {hasImage ? (
              <img src={data.url} alt="" draggable={false} />
            ) : (
              <span />
            )}
          </div>
          {hasImage && (
            <div className="node-card-image-preview" aria-hidden>
              <img src={data.url} alt="" draggable={false} />
            </div>
          )}
          <div className="node-card-copy">
            <div className="node-card-title">{title}</div>
            <div className="node-card-description">
              {description || 'Add a card description.'}
            </div>
          </div>
        </div>

        {hasButtons ? (
          <div className="node-card-buttons">
            {data.buttons.map((button) => (
              <div key={button.id} className="node-card-button">
                <span>{button.label || 'Button'}</span>
                <Handle
                  id={button.id}
                  type="source"
                  position={Position.Right}
                  className="node-handle node-card-button-handle"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="node-card-empty">Add a button in the inspector.</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="node-handle" />
      {!hasButtons && (
        <Handle type="source" position={Position.Right} className="node-handle" />
      )}
    </div>
  );
};

export default CardNode;
