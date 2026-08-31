import { Doc } from "../_generated/dataModel"

export type AssistantToolType = Doc<"assistantTools">["type"]
export type AssistantToolParameter = Doc<"assistantTools">["parameters"][number]
export type AssistantToolConfig = NonNullable<Doc<"assistantTools">["config"]>

export const BUILTIN_ASSISTANT_TOOLS: Array<{
  type: AssistantToolType
  name: string
  description: string
  parameters: AssistantToolParameter[]
  sortOrder: number
}> = [
  {
    type: "query",
    name: "search_knowledge_base",
    description:
      "Search the organization's knowledge base for accurate product, pricing, policy, support, or company information.",
    parameters: [
      {
        name: "query",
        description:
          "The user's question or the specific information to search for.",
        type: "string",
        required: true,
      },
    ],
    sortOrder: 0,
  },
  {
    type: "handoff",
    name: "handoff_to_human",
    description:
      "Escalate the conversation to a human operator when the user needs human assistance.",
    parameters: [],
    sortOrder: 1,
  },
  {
    type: "resolve",
    name: "resolve_conversation",
    description:
      "Mark the conversation as resolved when the user's issue has been fully addressed.",
    parameters: [],
    sortOrder: 2,
  },
]

export const ASSISTANT_TOOL_TYPE_LABELS: Record<AssistantToolType, string> = {
  query: "Query",
  handoff: "Handoff",
  resolve: "Resolve",
  google_sheets: "Google Sheets",
  google_calendar: "Google Calendar",
  api_request: "API Request",
  custom_webhook: "Custom Tool",
}

export const VOICE_UNSUPPORTED_ASSISTANT_TOOL_TYPES =
  new Set<AssistantToolType>(["handoff", "resolve"])

export const isVoiceCompatibleAssistantTool = (
  tool: Pick<Doc<"assistantTools">, "type">
) => !VOICE_UNSUPPORTED_ASSISTANT_TOOL_TYPES.has(tool.type)

export const sanitizeAssistantToolName = (rawName: string) => {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (!normalized) {
    throw new Error("Tool name is required")
  }

  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw new Error(
      "Tool name must start with a letter and contain only letters, numbers, and underscores"
    )
  }

  return normalized
}

/**
 * Normalizes a tool parameter name.
 *
 * Parameters are generated from sheet headers, so they arrive with spaces and
 * mixed case ("Bolaning yoshi"). A model reproduces `bolaning_yoshi` far more
 * reliably than a spaced property name, and column matching folds the two to
 * the same form, so the sheet still lines up. Unlike a tool name this may start
 * with a digit — a column called "2024" has to stay addressable.
 */
export const sanitizeAssistantToolParameterName = (rawName: string) => {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (!normalized) {
    throw new Error("Parameter name is required")
  }

  return normalized
}

export const sanitizeAssistantToolParameters = (
  parameters: AssistantToolParameter[]
): AssistantToolParameter[] => {
  const seen = new Set<string>()

  return parameters.map((parameter) => {
    const name = sanitizeAssistantToolParameterName(parameter.name)

    // Two headers that differ only in punctuation would collide here, and the
    // loser could never be matched back to its column. Better to say so than to
    // silently ship a parameter that always writes an empty cell.
    if (seen.has(name)) {
      throw new Error(
        `Two parameters resolve to the same name ("${name}"). Rename one of them.`
      )
    }

    seen.add(name)

    return { ...parameter, name }
  })
}

export const buildOpenAIToolParameters = (
  parameters: AssistantToolParameter[]
) => {
  const properties: Record<string, { type: string; description: string }> = {}
  const required: string[] = []

  for (const parameter of parameters) {
    properties[parameter.name] = {
      type:
        parameter.type === "number"
          ? "number"
          : parameter.type === "boolean"
            ? "boolean"
            : "string",
      description: parameter.description,
    }

    if (parameter.required) {
      required.push(parameter.name)
    }
  }

  return {
    type: "object" as const,
    properties,
    required,
    additionalProperties: false,
  }
}

export const interpolateTemplate = (
  template: string,
  args: Record<string, unknown>
) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = args[key]
    return value === undefined || value === null ? "" : String(value)
  })
