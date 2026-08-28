import { createContext, useContext } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { BlockNodeData } from '../lib/types';
import { stepPorts } from '../lib/types';
import EditableNodeTitle from './EditableNodeTitle';
import StepRow from './StepRow';

/** Lets the canvas tell the inspector which step inside a block is selected. */
export const BlockStepSelectionContext = createContext<{
  selected: { nodeId: string; stepId: string } | null;
  select: (nodeId: string, stepId: string) => void;
}>({ selected: null, select: () => {} });

const BlockNode = ({ id, data }: NodeProps<BlockNodeData>) => {
  const steps = data.steps ?? [];
  const { selected, select } = useContext(BlockStepSelectionContext);
  const lastStep = steps[steps.length - 1];
  const hasPorts = lastStep ? stepPorts(lastStep).length > 0 : false;

  return (
    <div className={`node node-block node-color-${data.blockColor ?? 'default'}`}>
      <EditableNodeTitle nodeId={id} value={data.customName} fallback="Block" />
      <div className="node-body block-body">
        {steps.length === 0 ? (
          <div className="node-empty">Drop a step onto this block.</div>
        ) : (
          steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              isSelected={selected?.nodeId === id && selected?.stepId === step.id}
              onSelect={() => select(id, step.id)}
            />
          ))
        )}
      </div>
      <Handle type="target" position={Position.Left} className="node-handle" />
      {/* The last step's ports replace the block's own exit when it branches. */}
      {!hasPorts && (
        <Handle type="source" position={Position.Right} className="node-handle" />
      )}
    </div>
  );
};

export default BlockNode;
