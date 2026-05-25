import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ImageNodeData } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';

const ImageNode = ({ id, data }: NodeProps<ImageNodeData>) => {
  const title = data.customName?.trim() || 'Image';
  const hasImage = Boolean(data.url?.trim());
  const detail = data.fileName || (data.url ? 'Linked image or GIF' : 'Upload an image or GIF');

  return (
    <div
      className={`node node-image ${
        hasImage ? 'node-image-has-preview' : ''
      } node-color-${data.blockColor ?? 'default'}`}
    >
      {hasImage ? (
        <>
          <EditableNodeTitle nodeId={id} value={data.customName} fallback="Image" />
          <div className="node-body node-image-preview-body">
            <img src={data.url} alt={data.alt || title} draggable={false} />
          </div>
        </>
      ) : (
        <div className="node-body node-image-body">
          <div className="node-image-icon" aria-hidden>
            <span />
            <span />
          </div>
          <div className="node-image-copy">
            <div className="node-image-title">{title}</div>
            <div className="node-image-subtitle">{detail}</div>
          </div>
        </div>
      )}
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default ImageNode;
