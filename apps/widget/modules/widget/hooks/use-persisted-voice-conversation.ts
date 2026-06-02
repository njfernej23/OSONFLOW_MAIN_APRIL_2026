import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { useAtomValue } from "jotai"
import { useEffect, useRef } from "react"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
} from "../atoms/widget-atoms"

type VoiceConversationProvider = "openai_realtime" | "gemini_live" | "vapi"

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

  const createConversation = useMutation(api.public.aiConversations.create)
  const appendMessage = useMutation(api.public.aiConversations.appendMessage)
  const finishConversationMutation = useMutation(
    api.public.aiConversations.finish
  )
  const persistedTranscript = useQuery(
    api.public.aiConversations.getLatestTranscript,
    organizationId && contactSessionId
      ? {
          organizationId,
          contactSessionId,
          provider,
        }
      : "skip"
  )

  const conversationIdRef = useRef<Id<"aiVoiceConversations"> | null>(null)
  const conversationPromiseRef =
    useRef<Promise<Id<"aiVoiceConversations"> | null> | null>(null)

  useEffect(() => {
    conversationIdRef.current = null
    conversationPromiseRef.current = null
  }, [contactSessionId, organizationId, provider])

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

  const finishConversation = async () => {
    const activeConversationId = await getActiveConversationId()

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
    finishConversation,
    persistedTranscript: persistedTranscript ?? [],
  }
}
