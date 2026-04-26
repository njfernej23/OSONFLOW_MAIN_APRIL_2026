import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { useMutation } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import { useRef } from "react"
import {
  contactSessionIdAtomFamily,
  conversationIdAtom,
  organizationIdAtom,
  screenAtom,
} from "../atoms/widget-atoms"

type VoiceConversationProvider = "openai_realtime" | "gemini_live"

type TranscriptMessage = {
  role: "user" | "assistant"
  text: string
}

export const usePersistedVoiceConversation = (
  provider: VoiceConversationProvider
) => {
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const setConversationId = useSetAtom(conversationIdAtom)
  const setScreen = useSetAtom(screenAtom)

  const createConversation = useMutation(api.public.aiConversations.create)
  const appendMessage = useMutation(api.public.aiConversations.appendMessage)
  const escalateToHumanMutation = useMutation(
    api.public.aiConversations.escalateToHuman
  )
  const resolveConversationMutation = useMutation(
    api.public.aiConversations.resolve
  )
  const finishConversationMutation = useMutation(
    api.public.aiConversations.finish
  )

  const conversationIdRef = useRef<Id<"aiVoiceConversations"> | null>(null)
  const conversationPromiseRef =
    useRef<Promise<Id<"aiVoiceConversations"> | null> | null>(null)

  const ensureConversation = async () => {
    if (conversationIdRef.current) {
      return conversationIdRef.current
    }

    if (conversationPromiseRef.current) {
      return await conversationPromiseRef.current
    }

    if (!organizationId || !contactSessionId) {
      return null
    }

    const promise = createConversation({
      organizationId,
      contactSessionId,
      provider,
    })
      .then((conversationId) => {
        conversationIdRef.current = conversationId
        return conversationId
      })
      .catch((error) => {
        console.error("Unable to create persisted voice conversation", error)
        return null
      })
      .finally(() => {
        conversationPromiseRef.current = null
      })

    conversationPromiseRef.current = promise

    return await promise
  }

  const getActiveConversationId = async () => {
    if (conversationIdRef.current) {
      return conversationIdRef.current
    }

    if (conversationPromiseRef.current) {
      return await conversationPromiseRef.current
    }

    return null
  }

  const persistTranscriptMessage = async (message: TranscriptMessage) => {
    const text = message.text.trim()

    if (!text || !contactSessionId) {
      return
    }

    const conversationId = await ensureConversation()

    if (!conversationId) {
      return
    }

    try {
      await appendMessage({
        conversationId,
        contactSessionId,
        role: message.role,
        text,
      })
    } catch (error) {
      console.error("Unable to persist voice transcript message", error)
    }
  }

  const escalateToHumanConversation = async () => {
    if (!contactSessionId) {
      return null
    }

    const activeConversationId =
      (await getActiveConversationId()) ?? (await ensureConversation())

    if (!activeConversationId) {
      return null
    }

    try {
      const result = await escalateToHumanMutation({
        conversationId: activeConversationId,
        contactSessionId,
      })

      setConversationId(result.conversationId)
      setScreen("chat")

      return result.conversationId
    } catch (error) {
      console.error("Unable to escalate persisted voice conversation", error)
      return null
    }
  }

  const resolveConversation = async () => {
    if (!contactSessionId) {
      return false
    }

    const activeConversationId =
      (await getActiveConversationId()) ?? (await ensureConversation())

    if (!activeConversationId) {
      return false
    }

    try {
      await resolveConversationMutation({
        conversationId: activeConversationId,
        contactSessionId,
      })
      return true
    } catch (error) {
      console.error("Unable to resolve persisted voice conversation", error)
      return false
    }
  }

  const finishConversation = async () => {
    const activeConversationId = await getActiveConversationId()

    conversationIdRef.current = null
    conversationPromiseRef.current = null

    if (!activeConversationId || !contactSessionId) {
      return
    }

    try {
      await finishConversationMutation({
        conversationId: activeConversationId,
        contactSessionId,
      })
    } catch (error) {
      console.error("Unable to finish persisted voice conversation", error)
    }
  }

  return {
    persistTranscriptMessage,
    escalateToHumanConversation,
    resolveConversation,
    finishConversation,
  }
}
