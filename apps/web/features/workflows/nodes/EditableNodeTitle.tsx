import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent
} from 'react';
import { useNodeRename } from './NodeRenameContext';

type EditableNodeTitleProps = {
  nodeId: string;
  value?: string;
  fallback: string;
};

const stopNodeInteraction = (
  event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>
) => {
  event.stopPropagation();
};

const EditableNodeTitle = ({ nodeId, value, fallback }: EditableNodeTitleProps) => {
  const renameNode = useNodeRename();
  const displayName = value?.trim() || fallback;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [isEditing]);

  const beginEditing = (event: MouseEvent<HTMLButtonElement>) => {
    stopNodeInteraction(event);
    setDraft(displayName);
    setIsEditing(true);
  };

  const commit = () => {
    const nextName = draft.trim();

    if (nextName && nextName !== displayName) {
      renameNode?.(nodeId, nextName);
    }

    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(displayName);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="node-title node-title-input nodrag nopan"
        value={draft}
        aria-label={`Rename ${displayName}`}
        onPointerDown={stopNodeInteraction}
        onClick={stopNodeInteraction}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      className="node-title node-title-editable nodrag nopan"
      title="Rename node"
      onPointerDown={stopNodeInteraction}
      onClick={beginEditing}
    >
      <span>{displayName}</span>
    </button>
  );
};

export default EditableNodeTitle;
