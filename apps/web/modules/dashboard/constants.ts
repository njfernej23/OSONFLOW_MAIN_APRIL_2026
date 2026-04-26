export const STATUS_FILTER_KEY = "sonflow-sattus-filter"
export const ASSIGNMENT_FILTER_KEY = "sonflow-assignment-filter"

export const AI_CONVERSATION_PROVIDER_LABELS = {
  openai_realtime: "OpenAI realtime",
  gemini_live: "Gemini live",
} as const

export const AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES = {
  openai_realtime:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  gemini_live:
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
} as const

export const AI_CONVERSATION_STATUS_LABELS = {
  unresolved: "Open",
  escalated: "Escalated",
  resolved: "Resolved",
} as const

export const AI_CONVERSATION_STATUS_BADGE_CLASSNAMES = {
  unresolved:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  escalated:
    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  resolved:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
} as const
