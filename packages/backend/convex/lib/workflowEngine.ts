/**
 * Shared workflow graph helpers used by the Convex runtime.
 * Keep in sync with apps/web/features/workflows run-panel semantics.
 */

export type JsonRecord = Record<string, unknown>

export type WorkflowButton = {
  id: string
  label: string
}

export type WorkflowNode = {
  id: string
  type?: string
  data?: JsonRecord
}

export type WorkflowEdge = {
  id?: string
  source?: string
  target?: string
  sourceHandle?: string | null
}

export type WorkflowDefinition = {
  schemaVersion?: number
  id?: string
  name?: string
  description?: string
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
}

export type RuntimeVariables = Record<string, string>

export type WaitingMode = "buttons" | "capture" | "choice" | "ai_turn"

export const MAX_STEPS_PER_TURN = 50

export const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

export const asString = (value: unknown) =>
  typeof value === "string" ? value : ""

export const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback

export const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

export const renderTemplate = (value: string, variables: RuntimeVariables) =>
  value.replace(/{{\s*([\w.-]+)\s*}}/g, (_match, key: string) => {
    return variables[key] ?? ""
  })

export const normalizeButtons = (value: unknown): WorkflowButton[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((button) => {
      if (!isRecord(button)) {
        return null
      }

      const id = asString(button.id).trim()
      const label = asString(button.label).trim()

      if (!id || !label) {
        return null
      }

      return { id, label }
    })
    .filter((button): button is WorkflowButton => button !== null)
}

export const getNodeMap = (definition: WorkflowDefinition) =>
  new Map((definition.nodes ?? []).map((node) => [node.id, node]))

export const getEdgesBySource = (definition: WorkflowDefinition) => {
  const map = new Map<string, WorkflowEdge[]>()

  for (const edge of definition.edges ?? []) {
    if (!edge.source || !edge.target) {
      continue
    }

    const edges = map.get(edge.source) ?? []
    edges.push(edge)
    map.set(edge.source, edges)
  }

  return map
}

export const getNextNodeId = (
  edgesBySource: Map<string, WorkflowEdge[]>,
  sourceId: string,
  handleId?: string | null
) => {
  const outgoing = edgesBySource.get(sourceId) ?? []

  if (handleId) {
    // A branch handle only follows its own edge. Falling back to any other
    // outgoing edge would silently route "false" down the "true" path, or a
    // button with no wire down whichever button happens to be connected.
    return (
      outgoing.find((edge) => edge.sourceHandle === handleId)?.target ?? null
    )
  }

  return (
    outgoing.find((edge) => !edge.sourceHandle)?.target ??
    outgoing[0]?.target ??
    null
  )
}

export const getStartNodeId = (definition: WorkflowDefinition) => {
  const nodes = definition.nodes ?? []
  return nodes.find((node) => node.type === "start")?.id ?? nodes[0]?.id ?? null
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists"

export const evaluateCondition = (
  data: JsonRecord,
  variables: RuntimeVariables
) => {
  const key = asString(data.key).trim()
  const operator = (asString(data.operator) || "equals") as ConditionOperator
  const expected = asString(data.value)
  const actual = key ? (variables[key] ?? "") : ""
  const hasValue = Boolean(actual.trim())

  switch (operator) {
    case "not_equals":
      return actual !== expected
    case "contains":
      return actual.toLowerCase().includes(expected.toLowerCase())
    case "not_contains":
      return !actual.toLowerCase().includes(expected.toLowerCase())
    case "exists":
      return hasValue
    case "not_exists":
      return !hasValue
    case "equals":
    default:
      return actual === expected
  }
}

export const matchChoice = (
  choices: WorkflowButton[],
  prompt: string,
  choiceId?: string | null
) => {
  const normalizedPrompt = prompt.trim().toLowerCase()

  return (
    choices.find((choice) => choice.id === choiceId) ??
    choices.find(
      (choice) => choice.label.trim().toLowerCase() === normalizedPrompt
    ) ??
    null
  )
}

export const isAiNodeType = (type: string | undefined) =>
  type === "prompt" ||
  type === "kbSearch" ||
  type === "playbook" ||
  type === "agent" ||
  type === "crew" ||
  type === "operator"

/** Steps that run out of band in a scheduled action, then resume the walk. */
export const isDeferredNodeType = (type: string | undefined) =>
  type === "api" || type === "javascript" || type === "tool"

export const getCaptureVariableKey = (data: JsonRecord) => {
  const key =
    asString(data.variableKey).trim() ||
    asString(data.key).trim() ||
    "lastInput"
  return key
}

export const getOutputVariableKey = (data: JsonRecord, fallback: string) => {
  const key = asString(data.outputVariable).trim()
  return key || fallback
}

export const buildPromptInstructions = (
  data: JsonRecord,
  variables: RuntimeVariables
) => {
  const instructions = renderTemplate(
    asString(data.instructions) ||
      asString(data.description) ||
      "Respond helpfully to the user based on the conversation context.",
    variables
  )
  return instructions.trim()
}

export const buildKbQuery = (
  data: JsonRecord,
  variables: RuntimeVariables
) => {
  const query = renderTemplate(
    asString(data.query) ||
      variables.lastInput ||
      variables.lastUserMessage ||
      "",
    variables
  )
  return query.trim()
}

export type BlockStep = {
  id: string
  type: string
  data: JsonRecord
}

/** Ordered steps of a Block node; empty for every other node type. */
export const getBlockSteps = (data: JsonRecord): BlockStep[] => {
  if (!Array.isArray(data.steps)) {
    return []
  }

  return data.steps
    .map((step) => {
      if (!isRecord(step)) {
        return null
      }

      return {
        id: asString(step.id),
        type: asString(step.type),
        data: isRecord(step.data) ? step.data : {},
      }
    })
    .filter((step): step is BlockStep => step !== null && step.type !== "")
}

export const isBlockNodeType = (type: string | undefined) => type === "block"

/**
 * Steps that branch or end the run. They can only be the last step of a
 * block, so a wait on one of them leaves the block rather than resuming
 * inside it.
 */
export const isTerminalStepType = (type: string | undefined) =>
  type === "buttons" ||
  type === "choice" ||
  type === "condition" ||
  type === "api" ||
  type === "javascript" ||
  type === "tool" ||
  type === "carousel" ||
  type === "card" ||
  type === "end" ||
  type === "callForward"
