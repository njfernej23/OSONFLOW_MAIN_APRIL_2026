export const STATUS_FILTER_KEY = "sonflow-sattus-filter";
export const ASSIGNMENT_FILTER_KEY = "sonflow-assignment-filter";

export const AI_CONVERSATION_PROVIDER_LABELS = {
  openai_realtime: "OpenAI realtime",
  gemini_live: "Gemini live",
} as const;

export const AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES = {
  openai_realtime:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  gemini_live:
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
} as const;
