import type { Doc } from "@workspace/backend/_generated/dataModel"

export type AssistantTool = Doc<"assistantTools">

export type IntegrationToolType = Extract<
  AssistantTool["type"],
  "google_sheets" | "api_request" | "custom_webhook"
>

export type BuiltinToolType = Extract<
  AssistantTool["type"],
  "query" | "handoff" | "resolve"
>

export type GoogleSheetsOperation = NonNullable<
  AssistantTool["config"]
>["operation"]

export const ASSISTANT_TOOL_TYPE_LABELS: Record<AssistantTool["type"], string> =
  {
    query: "Query",
    handoff: "Handoff",
    resolve: "Resolve",
    google_sheets: "Google Sheets",
    api_request: "API Request",
    custom_webhook: "Custom Tool",
  }

export const GOOGLE_SHEETS_OPERATION_LABELS: Record<
  NonNullable<GoogleSheetsOperation>,
  string
> = {
  lookup: "Look up row",
  append: "Add row",
  update: "Update row",
  delete: "Delete row",
}

export const GOOGLE_SHEETS_MATCH_MODE_OPTIONS = [
  {
    value: "exact" as const,
    label: "Exact match",
    description: "Case-insensitive full cell match (best for email, ID, role)",
  },
  {
    value: "contains" as const,
    label: "Contains",
    description: "Substring match (legacy fuzzy behavior)",
  },
  {
    value: "equals" as const,
    label: "Equals (case-sensitive)",
    description: "Exact characters including case",
  },
]

export const GOOGLE_SHEETS_QUERY_STRATEGY_OPTIONS = [
  {
    value: "gviz" as const,
    label: "Server query (recommended)",
    description: "Ask Google for matching rows only — best for large sheets",
  },
  {
    value: "scan" as const,
    label: "Bounded scan",
    description: "Download a capped range and filter locally",
  },
]

export const GOOGLE_SHEETS_TEMPLATES: Array<{
  operation: NonNullable<GoogleSheetsOperation>
  title: string
  description: string
  name: string
  toolDescription: string
  icon: string
  parameters: AssistantTool["parameters"]
  config: NonNullable<AssistantTool["config"]>
}> = [
  {
    operation: "lookup",
    title: "Look up row",
    description: "Find rows by name, phone, or other columns",
    name: "lookup_sheet_row",
    toolDescription:
      "Look up rows in the Google Sheet using the provided search fields.",
    icon: "⌕",
    parameters: [
      {
        name: "name",
        description: "Name or account label to search for",
        type: "string",
        required: true,
      },
      {
        name: "phone_last4",
        description: "Last 4 digits of the phone number",
        type: "string",
        required: false,
      },
    ],
    config: {
      operation: "lookup",
      range: "Sheet1",
      searchColumns: ["name", "phone"],
      matchMode: "exact",
      queryStrategy: "gviz",
      maxLookupRows: 25,
      requireUniqueMatch: true,
    },
  },
  {
    operation: "append",
    title: "Add row",
    description: "Insert a new row with name, phone, and other fields",
    name: "add_sheet_row",
    toolDescription:
      "Add a new row to the Google Sheet with the provided column values.",
    icon: "+",
    parameters: [
      {
        name: "name",
        description: "Name to add to the sheet",
        type: "string",
        required: true,
      },
      {
        name: "phone",
        description: "Phone number to add",
        type: "string",
        required: false,
      },
      {
        name: "email",
        description: "Email address to add",
        type: "string",
        required: false,
      },
    ],
    config: {
      operation: "append",
      range: "Sheet1",
      valueColumns: ["name", "phone", "email"],
      queryStrategy: "gviz",
    },
  },
  {
    operation: "update",
    title: "Update row",
    description: "Find a row and update its fields",
    name: "update_sheet_row",
    toolDescription:
      "Find a row in the Google Sheet by lookup fields, then update the provided columns.",
    icon: "✎",
    parameters: [
      {
        name: "name",
        description: "Name used to find the row",
        type: "string",
        required: true,
      },
      {
        name: "phone_last4",
        description: "Last 4 digits used to find the row",
        type: "string",
        required: false,
      },
      {
        name: "phone",
        description: "New phone number value",
        type: "string",
        required: false,
      },
      {
        name: "email",
        description: "New email value",
        type: "string",
        required: false,
      },
      {
        name: "status",
        description: "New status value",
        type: "string",
        required: false,
      },
    ],
    config: {
      operation: "update",
      range: "Sheet1",
      searchColumns: ["name", "phone"],
      updateColumns: ["phone", "email", "status"],
      matchMode: "exact",
      queryStrategy: "gviz",
      requireUniqueMatch: true,
    },
  },
  {
    operation: "delete",
    title: "Delete row",
    description: "Find a row and remove it from the sheet",
    name: "delete_sheet_row",
    toolDescription:
      "Find a row in the Google Sheet using lookup fields and delete it.",
    icon: "×",
    parameters: [
      {
        name: "name",
        description: "Name used to find the row to delete",
        type: "string",
        required: true,
      },
      {
        name: "phone_last4",
        description: "Last 4 digits used to find the row to delete",
        type: "string",
        required: false,
      },
    ],
    config: {
      operation: "delete",
      range: "Sheet1",
      searchColumns: ["name", "phone"],
      matchMode: "exact",
      queryStrategy: "gviz",
      requireUniqueMatch: true,
    },
  },
]

export const CHAT_MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
]

export const createEmptyParameter = () => ({
  name: "",
  description: "",
  type: "string" as const,
  required: true,
})
