"use client"

import type { WorkflowVariable } from "../lib/variable-tokens"

export const VariablePickerList = ({
  top,
  left,
  matches,
  onPick,
}: {
  top: number
  left: number
  matches: WorkflowVariable[]
  onPick: (name: string) => void
}) => (
  <div
    className="variable-picker"
    style={{ top, left }}
    // mousedown only: preventing pointerdown suppresses the click that inserts.
    onMouseDown={(event) => event.preventDefault()}
  >
    <span className="variable-picker-title">Insert variable</span>
    {matches.slice(0, 6).map((entry) => (
      <button
        key={entry.name}
        type="button"
        className="variable-picker-row"
        onClick={() => onPick(entry.name)}
      >
        <strong>{entry.name}</strong>
        <em>{entry.source}</em>
      </button>
    ))}
  </div>
)

export default VariablePickerList
