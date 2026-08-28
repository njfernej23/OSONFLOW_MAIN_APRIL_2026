export const STATUS_FILTER_KEY = "sonflow-sattus-filter"
export const ASSIGNMENT_FILTER_KEY = "sonflow-assignment-filter"

export const AI_CONVERSATION_PROVIDER_LABELS = {
  openai_realtime: "OpenAI realtime",
  gemini_live: "Gemini live",
} as const

// Provider is an identity, not a status, so it draws from the console's
// categorical series rather than the reserved good/warning/critical hues —
// which keeps a provider badge from reading like a "Live" or "Ended" state.
export const AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES = {
  openai_realtime: "console-series-1 console-tone-wash text-foreground/85",
  gemini_live: "console-series-2 console-tone-wash text-foreground/85",
} as const
