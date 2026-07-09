import {
  BUILTIN_TOOL_OPTIONS,
  GOOGLE_SHEETS_TEMPLATES,
  INTEGRATION_TOOL_OPTIONS,
  type AssistantTool,
  type BuiltinToolType,
  type IntegrationToolType,
} from "../constants"

export type ToolRegistryEntry = {
  type: AssistantTool["type"]
  title: string
  description: string
  icon: string
  iconClassName: string
  category: "builtin" | "integration"
  voiceSupported: boolean
  supportsMultiple: boolean
}

const VOICE_UNSUPPORTED = new Set<AssistantTool["type"]>(["handoff", "resolve"])

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  ...BUILTIN_TOOL_OPTIONS.map((option) => ({
    type: option.type as BuiltinToolType,
    title: option.title,
    description: option.description,
    icon: option.icon,
    iconClassName: option.iconClassName,
    category: "builtin" as const,
    voiceSupported: !VOICE_UNSUPPORTED.has(option.type),
    supportsMultiple: false,
  })),
  ...INTEGRATION_TOOL_OPTIONS.map((option) => ({
    type: option.type as IntegrationToolType,
    title: option.title,
    description: option.description,
    icon: option.icon,
    iconClassName: option.iconClassName,
    category: "integration" as const,
    voiceSupported: true,
    supportsMultiple: true,
  })),
  {
    type: "google_sheets",
    title: "Google Sheets",
    description: "Look up, add, update, or delete spreadsheet rows",
    icon: "▦",
    iconClassName: "bg-emerald-500/15 text-emerald-400",
    category: "integration",
    voiceSupported: true,
    supportsMultiple: true,
  },
]

export const getToolRegistryEntry = (type: AssistantTool["type"]) =>
  TOOL_REGISTRY.find((entry) => entry.type === type)

export const getGoogleSheetsTemplate = (
  operation: NonNullable<NonNullable<AssistantTool["config"]>["operation"]>
) => GOOGLE_SHEETS_TEMPLATES.find((template) => template.operation === operation)
