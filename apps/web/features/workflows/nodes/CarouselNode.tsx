import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { CarouselNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import NodePorts from './NodePorts';

const CarouselNode = ({ id, data }: NodeProps<CarouselNodeData>) => {
  const cards = data.cards ?? [];
  const multiple = cards.length > 1;

  // Ports are listed once, below the track. Nesting them inside the
  // horizontally scrolling cards would scatter the handles across the node.
  const ports = cards.flatMap((card, index) =>
    card.buttons.map((button) => ({
      id: button.id,
      label: multiple ? `${index + 1} · ${button.label}` : button.label,
    }))
  );

  return (
    <div className={`node node-carousel node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Carousel" />
      <div className="node-body">
        {cards.length === 0 ? (
          <div className="node-empty">Add cards in the inspector.</div>
        ) : (
          <div className="node-carousel-track">
            {cards.map((card, index) => (
              <div className="node-carousel-card" key={card.id}>
                <div className="node-carousel-thumb" aria-hidden>
                  {card.url?.trim() ? <img src={card.url} alt="" draggable={false} /> : <span />}
                </div>
                <div className="node-carousel-title">
                  {card.title?.trim() || `Option ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
        <NodePorts ports={ports} />
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      {ports.length === 0 && (
        <Handle type="source" position={Position.Right} className="node-handle" />
      )}
    </div>
  );
};

export default CarouselNode;
