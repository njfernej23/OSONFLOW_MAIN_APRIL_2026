import { atomFamily } from "jotai-family"
import { atomWithStorage } from "jotai/utils"
import { WidgetScreen } from "@/modules/widget/types"
import { CONTACT_SESSION_KEY } from "../constants"
import { Id } from "@workspace/backend/_generated/dataModel"
import { api } from "@workspace/backend/_generated/api"
import type { FunctionReturnType } from "convex/server"
import { atom } from "jotai"

export type VoiceProvider = "gemini" | "openai"
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
export const agentIdAtom = atom<string | null>(null)
export const contactSessionIdAtomFamily = atomFamily(
  (organizationId: string) => {
    return atomWithStorage<Id<"contactSessions"> | null>(
      `${CONTACT_SESSION_KEY}_${organizationId}`,
      null
    )
  }
)

export const errorMessageAtom = atom<string | null>(null)
export const conversationIdAtom = atom<Id<"conversations"> | null>(null)
export const chatReturnScreenAtom = atom<ChatReturnScreen>("selection")
export const pendingInitialMessageAtom = atom<string | null>(null)
export const pendingStartChatAtom = atom<{
  initialMessage?: string
  returnScreen: ChatReturnScreen
} | null>(null)
export const selectedHelpArticleAtom = atom<WidgetHelpArticle | null>(null)
export const selectedHelpTopicAtom = atom<WidgetHelpTopic | null>(null)
export const helpSearchQueryAtom = atom("")

export type PublicWidgetSettings = NonNullable<
  FunctionReturnType<typeof api.public.widgetSettings.getByOrganizationId>
>

export const widgetSettingsAtom = atom<PublicWidgetSettings | null>(null)

export const activeVoiceProviderAtom = atom<VoiceProvider | null>(null)

export const hasOpenAIRealtimeVoiceAtom = atom((get) => {
  const settings = get(widgetSettingsAtom)
  return Boolean(settings?.openaiRealtimeSettings?.enabled)
})

export const hasGeminiLiveVoiceAtom = atom((get) => {
  const settings = get(widgetSettingsAtom)
  return Boolean(settings?.geminiLiveSettings?.enabled)
})

export const hasAnyVoiceAtom = atom(
  (get) => get(hasOpenAIRealtimeVoiceAtom) || get(hasGeminiLiveVoiceAtom)
)
