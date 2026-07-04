import { Type } from "@google/genai"

export const END_CALL_TOOL_NAME = "end_call"

export const DEFAULT_GOODBYE_PHRASES = [
  "thanks",
  "thank you",
  "thx",
  "that's all",
  "that is all",
  "no more questions",
  "no more question",
  "no other questions",
  "no questions",
  "i don't have any questions",
  "i dont have any questions",
  "i don't have any question",
  "i dont have any question",
  "i have no questions",
  "i have no question",
  "nothing else",
  "i'm done",
  "im done",
  "i am done",
  "i'm good",
  "im good",
  "i am good",
  "goodbye",
  "bye bye",
  "bye",
  "all set",
  "that helped",
  "got what i need",
  "that's it",
  "that is it",
] as const

export type VoiceCallSettings = {
  autoEndOnGoodbye?: boolean
  customGoodbyePhrases?: string[]
  idleTimeoutSeconds?: number
  maxDurationSeconds?: number
}

export const DEFAULT_VOICE_CALL_SETTINGS: Required<VoiceCallSettings> = {
  autoEndOnGoodbye: true,
  customGoodbyePhrases: [],
  idleTimeoutSeconds: 120,
  maxDurationSeconds: 600,
}

export const resolveVoiceCallSettings = (
  settings?: VoiceCallSettings | null
): Required<VoiceCallSettings> => ({
  autoEndOnGoodbye:
    settings?.autoEndOnGoodbye ?? DEFAULT_VOICE_CALL_SETTINGS.autoEndOnGoodbye,
  customGoodbyePhrases:
    settings?.customGoodbyePhrases ??
    DEFAULT_VOICE_CALL_SETTINGS.customGoodbyePhrases,
  idleTimeoutSeconds:
    settings?.idleTimeoutSeconds ??
    DEFAULT_VOICE_CALL_SETTINGS.idleTimeoutSeconds,
  maxDurationSeconds:
    settings?.maxDurationSeconds ??
    DEFAULT_VOICE_CALL_SETTINGS.maxDurationSeconds,
})

export const mergeVoiceCallSettings = (
  snapshot?: VoiceCallSettings,
  fallback?: VoiceCallSettings
): VoiceCallSettings => {
  const base = resolveVoiceCallSettings(fallback)

  return {
    autoEndOnGoodbye: snapshot?.autoEndOnGoodbye ?? base.autoEndOnGoodbye,
    customGoodbyePhrases:
      snapshot?.customGoodbyePhrases ?? base.customGoodbyePhrases,
    idleTimeoutSeconds: snapshot?.idleTimeoutSeconds ?? base.idleTimeoutSeconds,
    maxDurationSeconds: snapshot?.maxDurationSeconds ?? base.maxDurationSeconds,
  }
}

const normalizeText = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/g, "")
    .replace(/\s+/g, " ")

export const matchesGoodbyeIntent = (
  text: string,
  customPhrases: string[] = []
): boolean => {
  const normalized = normalizeText(text)

  if (normalized.length < 3) {
    return false
  }

  const phrases = [
    ...customPhrases.map((phrase) => normalizeText(phrase)).filter(Boolean),
    ...DEFAULT_GOODBYE_PHRASES,
  ]

  for (const phrase of phrases) {
    if (!phrase) continue

    if (normalized === phrase) {
      return true
    }

    if (
      normalized.endsWith(phrase) &&
      normalized.length <= phrase.length + 40
    ) {
      return true
    }

    if (
      normalized.includes(phrase) &&
      normalized.length < 90 &&
      (phrase.includes("no more") ||
        phrase.includes("nothing else") ||
        phrase.includes("no questions") ||
        phrase.includes("have no question") ||
        phrase.includes("have any question") ||
        phrase.includes("i'm done") ||
        phrase.includes("im done") ||
        phrase.includes("i am done") ||
        phrase.includes("that's all") ||
        phrase.includes("that is all") ||
        phrase.includes("goodbye"))
    ) {
      return true
    }
  }

  return (
    /^(thanks|thank you|thx)( so much| anyway| for helping| for your help)?$/i.test(
      normalized
    ) || /\bno more qu?j?estions?\b/i.test(normalized)
  )
}

export const buildEndCallOpenAITool = () => ({
  type: "function" as const,
  name: END_CALL_TOOL_NAME,
  description:
    "End the voice call after the visitor clearly indicates they are done and you have given a brief closing response.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Short reason the call is ending.",
      },
    },
    required: [] as string[],
  },
})

export const buildEndCallGeminiDeclaration = () => ({
  name: END_CALL_TOOL_NAME,
  description:
    "End the voice call after the visitor clearly indicates they are done and you have given a brief closing response.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: "Short reason the call is ending.",
      },
    },
  },
})

export const buildEndCallInstruction = (enabled: boolean) => {
  if (!enabled) {
    return ""
  }

  return `When the visitor clearly signals they are finished (for example: thanks, no more questions, goodbye), give a brief friendly closing line, then call the ${END_CALL_TOOL_NAME} tool to end the call. Do not call ${END_CALL_TOOL_NAME} while the visitor still has an open question.`
}
