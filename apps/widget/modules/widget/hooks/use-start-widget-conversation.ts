"use client"

import { useState } from "react"
import { useAction, useMutation } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import {
  chatReturnScreenAtom,
  contactSessionIdAtomFamily,
  conversationIdAtom,
  agentIdAtom,
  errorMessageAtom,
  hasAnyVoiceAtom,
  organizationIdAtom,
  pendingInitialMessageAtom,
  pendingStartChatAtom,
  screenAtom,
  widgetModeAtom,
  type ChatReturnScreen,
} from "@/modules/widget/atoms/widget-atoms"
import { getWidgetMetadata } from "../lib/widget-metadata"

export const useStartWidgetConversation = () => {
  const setScreen = useSetAtom(screenAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)
  const setConversationId = useSetAtom(conversationIdAtom)
  const setChatReturnScreen = useSetAtom(chatReturnScreenAtom)
  const setPendingInitialMessage = useSetAtom(pendingInitialMessageAtom)
  const setPendingStartChat = useSetAtom(pendingStartChatAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const agentId = useAtomValue(agentIdAtom)
  const widgetMode = useAtomValue(widgetModeAtom)
  const hasAnyVoice = useAtomValue(hasAnyVoiceAtom)
  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const createConversation = useMutation(api.public.conversations.create)
  const createAnonymousSession = useAction(
    api.public.contactSessions.createAnonymous
  )
  const [isPending, setIsPending] = useState(false)
  const shouldCaptureDetailsInChat = widgetMode !== "voice" && !hasAnyVoice

  const startConversation = async ({
    initialMessage,
    returnScreen = "selection",
    contactSessionId: providedSessionId,
  }: {
    initialMessage?: string
    returnScreen?: ChatReturnScreen
    contactSessionId?: Id<"contactSessions">
  } = {}) => {
    if (!organizationId) {
      setScreen("error")
      setErrorMessage("Missing Organization ID")
      return
    }

    let sessionId = providedSessionId ?? contactSessionId

    if (!sessionId && !shouldCaptureDetailsInChat) {
      setPendingStartChat({
        initialMessage,
        returnScreen,
      })
      setScreen("auth")
      return
    }

    setIsPending(true)
    try {
      if (!sessionId) {
        sessionId = await createAnonymousSession({
          organizationId,
          metadata: getWidgetMetadata("chat_widget"),
          name: "Anonymous visitor",
        })
        setContactSessionId(sessionId)
      }

      const result = await createConversation({
        contactSessionId: sessionId,
        organizationId,
        agentId: agentId ?? undefined,
        metadata: getWidgetMetadata("chat_widget"),
      })
      const trimmedMessage = initialMessage?.trim()
      setPendingStartChat(null)
      setContactSessionId(result.contactSessionId)
      setPendingInitialMessage(trimmedMessage ? trimmedMessage : null)
      setChatReturnScreen(returnScreen)
      setConversationId(result.conversationId)
      setScreen("chat")
    } catch {
      setPendingInitialMessage(null)

      if (shouldCaptureDetailsInChat) {
        setScreen("error")
        setErrorMessage("Unable to start chat")
        return
      }

      setPendingStartChat({
        initialMessage,
        returnScreen,
      })
      setScreen("auth")
    } finally {
      setIsPending(false)
    }
  }

  return {
    isPending,
    startConversation,
  }
}
