import { atomFamily } from "jotai-family"
import { atomWithStorage } from "jotai/utils"
import { WidgetScreen } from "@/modules/widget/types"
import { CONTACT_SESSION_KEY } from "../constants"
import { Doc, Id } from "@workspace/backend/_generated/dataModel"
import { atom } from "jotai"

export type VoiceProvider = "gemini" | "openai" | "vapi"
export type ChatReturnScreen = "selection" | "help" | "inbox"
export type WidgetMode = "standard" | "voice"
export type WidgetHelpArticle = {
  title: string
  excerpt: string
  body: string
}
export type WidgetHelpTopic = {
  title: string
  excerpt: string
  articles: WidgetHelpArticle[]
}
export type WidgetHomeHelpCard =
  | {
      type: "topic"
      topic: WidgetHelpTopic
    }
  | {
      type: "article"
      topic: WidgetHelpTopic
      article: WidgetHelpArticle
    }

export const screenAtom = atom<WidgetScreen>("loading")
export const widgetModeAtom = atom<WidgetMode>("standard")
export const organizationIdAtom = atom<string | null>(null)
export const contactSessionIdAtomFamily = atomFamily(
  (organizationId: string) => {
    return atomWithStorage<Id<"contactSessions"> | null>(
      `${CONTACT_SESSION_KEY}_${organizationId}`,
      null
    )
  }
)

export const errorMessageAtom = atom<string | null>(null)
export const loadingMessageAtom = atom<string | null>(null)
export const conversationIdAtom = atom<Id<"conversations"> | null>(null)
export const chatReturnScreenAtom = atom<ChatReturnScreen>("selection")
export const pendingInitialMessageAtom = atom<string | null>(null)
export const selectedHelpArticleAtom = atom<WidgetHelpArticle | null>(null)
export const selectedHelpTopicAtom = atom<WidgetHelpTopic | null>(null)
export const helpSearchQueryAtom = atom("")

export const widgetSettingsAtom = atom<Doc<"widgetSettings"> | null>(null)

export const vapiSecretsAtom = atom<{
  publicApiKey: string
} | null>(null)

export const activeVoiceProviderAtom = atom<VoiceProvider | null>(null)

export const hasVapiSecretsAtom = atom((get) => get(vapiSecretsAtom) !== null)

export const hasOpenAIRealtimeVoiceAtom = atom((get) => {
  const settings = get(widgetSettingsAtom)
  return Boolean(settings?.openaiRealtimeSettings?.enabled)
})

export const hasGeminiLiveVoiceAtom = atom((get) => {
  const settings = get(widgetSettingsAtom)
  return Boolean(settings?.geminiLiveSettings?.enabled)
})

export const hasAnyVoiceAtom = atom(
  (get) =>
    get(hasVapiSecretsAtom) ||
    get(hasOpenAIRealtimeVoiceAtom) ||
    get(hasGeminiLiveVoiceAtom)
)
