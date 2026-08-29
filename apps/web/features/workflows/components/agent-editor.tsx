"use client"

import { useMemo, useState } from "react"
import { useAction } from "convex/react"
import { api } from "@workspace/backend/_generated/api"

import Icon from "../nodes/StepIcon"
import {
  AGENT_CAPABILITIES,
  AGENT_MODELS,
  AGENT_PERSONAS,
  AGENT_TOOLS,
  DEFAULT_AGENT_MODEL,
  createAgentTool,
  createExitCondition,
  createExitVariable,
  type AgentToolOption,
  type AssistantToolType,
} from "../lib/agent-config"
import type {
  AgentCapability,
  AgentExitCondition,
  AgentNodeData,
  AgentToolKind,
} from "../lib/types"

export type AgentEditorToolSummary = {
  _id: string
  name: string
  description: string
  type: AssistantToolType
  isEnabled: boolean
}

type AgentEditorProps = {
  nodeId: string
  title: string
  data: AgentNodeData
  assistantTools: AgentEditorToolSummary[] | undefined
  onChange: (next: AgentNodeData) => void
  onRename: (name: string) => void
  onClose: () => void
}

/** Assistant tools that could back a catalog entry, enabled ones only. */
const matchingTools = (
  option: AgentToolOption,
  assistantTools: AgentEditorToolSummary[] | undefined
) => {
  if (option.availability.status !== "needsTool") return []
  const wanted = option.availability.toolTypes
  return (assistantTools ?? []).filter(
    (tool) => tool.isEnabled && wanted.includes(tool.type)
  )
}

const AgentEditor = ({
  nodeId,
  title,
  data,
  assistantTools,
  onChange,
  onRename,
  onClose,
}: AgentEditorProps) => {
  const exits = data.exitConditions ?? []
  const tools = data.tools ?? []
  const capabilities = data.capabilities ?? []
  const [activeExitId, setActiveExitId] = useState<string | null>(
    exits[0]?.id ?? null
  )
  const [toolPickerFor, setToolPickerFor] = useState<AgentToolKind | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const generateInstructions = useAction(
    api.private.workflows.generateAgentInstructions
  )

  const activeExit = exits.find((exit) => exit.id === activeExitId) ?? null

  const usableTools = useMemo(
    () =>
      new Map(
        AGENT_TOOLS.map((option) => [
          option.kind,
          option.availability.status === "ready"
            ? []
            : matchingTools(option, assistantTools),
        ])
      ),
    [assistantTools]
  )

  const patch = (next: Partial<AgentNodeData>) => onChange({ ...data, ...next })

  const patchExit = (id: string, next: Partial<AgentExitCondition>) =>
    patch({
      exitConditions: exits.map((exit) =>
        exit.id === id ? { ...exit, ...next } : exit
      ),
    })

  const addExit = () => {
    const exit = createExitCondition()
    patch({ exitConditions: [...exits, exit] })
    setActiveExitId(exit.id)
  }

  const removeExit = (id: string) => {
    const remaining = exits.filter((exit) => exit.id !== id)
    patch({ exitConditions: remaining })
    if (activeExitId === id) setActiveExitId(remaining[0]?.id ?? null)
  }

  const applyPersona = (personaId: string) => {
    const persona = AGENT_PERSONAS.find((entry) => entry.id === personaId)
    if (!persona) return
    const seeded = persona.exits.map((exit) => createExitCondition(exit))
    patch({
      persona: persona.id,
      instructions: persona.instructions,
      capabilities: persona.capabilities,
      exitConditions: seeded,
    })
    setActiveExitId(seeded[0]?.id ?? null)
  }

  const toggleCapability = (id: AgentCapability, on: boolean) =>
    patch({
      capabilities: on
        ? [...capabilities.filter((entry) => entry !== id), id]
        : capabilities.filter((entry) => entry !== id),
    })

  const toolFor = (kind: AgentToolKind) =>
    tools.find((tool) => tool.kind === kind)

  const removeTool = (kind: AgentToolKind) =>
    patch({ tools: tools.filter((tool) => tool.kind !== kind) })

  const selectTool = (kind: AgentToolKind, toolName?: string) => {
    patch({
      tools: [
        ...tools.filter((tool) => tool.kind !== kind),
        createAgentTool(kind, toolName),
      ],
    })
    setToolPickerFor(null)
  }

  const handleToolClick = (option: AgentToolOption) => {
    if (option.availability.status === "unavailable") return
    if (toolFor(option.kind)) {
      removeTool(option.kind)
      return
    }
    if (option.availability.status === "ready") {
      selectTool(option.kind)
      return
    }
    const candidates = usableTools.get(option.kind) ?? []
    if (candidates.length === 1) {
      selectTool(option.kind, candidates[0]!.name)
      return
    }
    setToolPickerFor(option.kind)
  }

  const runGenerate = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      const text = await generateInstructions({
        agentName: title,
        hint: data.instructions ?? "",
      })
      patch({ instructions: text })
    } catch (error) {
      setGenerateError(
        error instanceof Error
          ? error.message
          : "Could not generate instructions."
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="agent-editor-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} configuration`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="agent-editor">
        <header className="agent-editor-header">
          <input
            className="agent-editor-title"
            value={title}
            aria-label="Agent name"
            onChange={(event) => onRename(event.target.value)}
          />
          <div className="agent-editor-header-actions">
            <label className="agent-model-pill">
              <Icon name="agent" size={15} />
              <select
                value={data.model ?? DEFAULT_AGENT_MODEL}
                aria-label="Model"
                onChange={(event) => patch({ model: event.target.value })}
              >
                {AGENT_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="agent-editor-close"
              onClick={onClose}
              title="Close"
              aria-label="Close agent editor"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

        <div className="agent-editor-body">
          <main className="agent-editor-main">
            <div className="agent-editor-field">
              <span className="agent-editor-label">Instructions</span>
              <div className="agent-instructions">
                <textarea
                  value={data.instructions ?? ""}
                  placeholder="Enter agent instructions…"
                  aria-label="Agent instructions"
                  onChange={(event) =>
                    patch({
                      instructions: event.target.value,
                      persona: undefined,
                    })
                  }
                />
                {!(data.instructions ?? "").trim() && (
                  <p className="agent-instructions-hint">
                    Enter agent instructions, or{" "}
                    <button type="button" onClick={runGenerate}>
                      generate
                    </button>
                  </p>
                )}
                <button
                  type="button"
                  className={`agent-generate ${generating ? "busy" : ""}`}
                  onClick={runGenerate}
                  disabled={generating}
                  title="Generate instructions"
                  aria-label="Generate instructions"
                >
                  <Icon name="prompt" size={16} />
                </button>
              </div>
              {generateError && (
                <p className="agent-editor-error">{generateError}</p>
              )}
            </div>

            <div className="agent-persona-row">
              {AGENT_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  className={`agent-persona ${
                    data.persona === persona.id ? "active" : ""
                  }`}
                  onClick={() => applyPersona(persona.id)}
                >
                  <Icon name={persona.icon} size={16} />
                  <span>{persona.label}</span>
                </button>
              ))}
            </div>

            {activeExit ? (
              <section className="agent-exit-editor">
                <div className="agent-exit-editor-body">
                  <label className="agent-editor-field">
                    <span className="agent-editor-label">Name</span>
                    <input
                      value={activeExit.name}
                      placeholder="Enter exit condition name"
                      onChange={(event) =>
                        patchExit(activeExit.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="agent-editor-field">
                    <span className="agent-editor-label">Exit when</span>
                    <textarea
                      value={activeExit.description}
                      placeholder="Describe the conditions under which to take this exit…"
                      onChange={(event) =>
                        patchExit(activeExit.id, {
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="agent-exit-section">
                  <div className="agent-exit-section-head">
                    <span>Required variables</span>
                    <button
                      type="button"
                      onClick={() =>
                        patchExit(activeExit.id, {
                          requiredVariables: [
                            ...activeExit.requiredVariables,
                            createExitVariable(),
                          ],
                        })
                      }
                      title="Add required variable"
                      aria-label="Add required variable"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                  {activeExit.requiredVariables.map((variable, index) => (
                    <div key={variable.id} className="agent-exit-row">
                      <input
                        value={variable.name}
                        placeholder="variableName"
                        aria-label={`Required variable ${index + 1} name`}
                        onChange={(event) =>
                          patchExit(activeExit.id, {
                            requiredVariables: activeExit.requiredVariables.map(
                              (entry) =>
                                entry.id === variable.id
                                  ? { ...entry, name: event.target.value }
                                  : entry
                            ),
                          })
                        }
                      />
                      <input
                        value={variable.description}
                        placeholder="What the agent should collect"
                        aria-label={`Required variable ${index + 1} description`}
                        onChange={(event) =>
                          patchExit(activeExit.id, {
                            requiredVariables: activeExit.requiredVariables.map(
                              (entry) =>
                                entry.id === variable.id
                                  ? {
                                      ...entry,
                                      description: event.target.value,
                                    }
                                  : entry
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patchExit(activeExit.id, {
                            requiredVariables:
                              activeExit.requiredVariables.filter(
                                (entry) => entry.id !== variable.id
                              ),
                          })
                        }
                        title="Remove variable"
                        aria-label="Remove required variable"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="agent-exit-section">
                  <div className="agent-exit-section-head">
                    <span>Messages</span>
                    <button
                      type="button"
                      onClick={() =>
                        patchExit(activeExit.id, {
                          messages: [...activeExit.messages, ""],
                        })
                      }
                      title="Add message"
                      aria-label="Add message"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                  {activeExit.messages.map((message, index) => (
                    <div key={index} className="agent-exit-row">
                      <input
                        value={message}
                        placeholder="Sent before this exit is taken"
                        aria-label={`Exit message ${index + 1}`}
                        onChange={(event) =>
                          patchExit(activeExit.id, {
                            messages: activeExit.messages.map((entry, at) =>
                              at === index ? event.target.value : entry
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patchExit(activeExit.id, {
                            messages: activeExit.messages.filter(
                              (_entry, at) => at !== index
                            ),
                          })
                        }
                        title="Remove message"
                        aria-label="Remove message"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="agent-exit-empty">
                <strong>No exit conditions</strong>
                <p>
                  Add one on the right and it becomes an outgoing path on the
                  canvas, so the agent can hand control to a different branch.
                </p>
              </div>
            )}
          </main>

          <aside className="agent-editor-side">
            <section className="agent-side-section">
              <div className="agent-side-head">
                <h3>Tools</h3>
              </div>
              <div className="agent-tool-grid">
                {AGENT_TOOLS.map((option) => {
                  const selected = toolFor(option.kind)
                  const candidates = usableTools.get(option.kind) ?? []
                  const blocked =
                    option.availability.status === "unavailable" ||
                    (option.availability.status === "needsTool" &&
                      candidates.length === 0)
                  const hint =
                    option.availability.status === "unavailable"
                      ? option.availability.reason
                      : blocked
                        ? `Configure a ${option.label} assistant tool first.`
                        : selected?.toolName
                          ? `Runs "${selected.toolName}"`
                          : option.description

                  return (
                    <button
                      key={option.kind}
                      type="button"
                      className={`agent-tool ${selected ? "selected" : ""} ${
                        blocked ? "blocked" : ""
                      }`}
                      title={hint}
                      aria-pressed={Boolean(selected)}
                      disabled={blocked}
                      onClick={() => handleToolClick(option)}
                    >
                      <Icon name={option.icon} size={15} />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>

              {toolPickerFor && (
                <div className="agent-tool-picker">
                  <p>Which configured tool should the agent call?</p>
                  {(usableTools.get(toolPickerFor) ?? []).map((tool) => (
                    <button
                      key={tool._id}
                      type="button"
                      onClick={() => selectTool(toolPickerFor, tool.name)}
                    >
                      <strong>{tool.name}</strong>
                      <em>{tool.description}</em>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="agent-tool-picker-cancel"
                    onClick={() => setToolPickerFor(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </section>

            <section className="agent-side-section">
              {AGENT_CAPABILITIES.map((capability) => {
                const on = capabilities.includes(capability.id)
                return (
                  <label
                    key={capability.id}
                    className={`agent-capability ${
                      capability.available ? "" : "blocked"
                    }`}
                    title={
                      capability.available
                        ? capability.description
                        : capability.unavailableReason
                    }
                  >
                    <span>{capability.label}</span>
                    {!capability.available && (
                      <em className="agent-capability-flag">unavailable</em>
                    )}
                    <input
                      type="checkbox"
                      role="switch"
                      checked={on && capability.available}
                      disabled={!capability.available}
                      onChange={(event) =>
                        toggleCapability(capability.id, event.target.checked)
                      }
                    />
                    <span className="agent-switch" aria-hidden />
                  </label>
                )
              })}
            </section>

            <section className="agent-side-section">
              <div className="agent-side-head">
                <h3>Exit conditions</h3>
                <button
                  type="button"
                  onClick={addExit}
                  title="Add exit condition"
                  aria-label="Add exit condition"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <div className="agent-exit-list">
                {exits.length === 0 && (
                  <p className="agent-side-empty">
                    None yet — the agent falls through its single default path.
                  </p>
                )}
                {exits.map((exit) => (
                  <div
                    key={exit.id}
                    className={`agent-exit-item ${
                      activeExitId === exit.id ? "active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveExitId(exit.id)}
                    >
                      {exit.name.trim() || "New exit condition"}
                      {exit.description.trim() ? "" : " (inactive)"}
                    </button>
                    <button
                      type="button"
                      className="agent-exit-remove"
                      onClick={() => removeExit(exit.id)}
                      title="Remove exit condition"
                      aria-label={`Remove ${exit.name.trim() || "exit condition"}`}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="agent-side-note">
                Node <code>{nodeId}</code>
              </p>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

export default AgentEditor
