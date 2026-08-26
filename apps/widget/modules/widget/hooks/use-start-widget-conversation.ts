"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import {
  chatReturnScreenAtom,
  contactSessionIdAtomFamily,
  conversationIdAtom,
  agentIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  pendingInitialMessageAtom,
  pendingStartChatAtom,
  screenAtom,
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
  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const createConversation = useMutation(api.public.conversations.create)
  const [isPending, setIsPending] = useState(false)

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

    const sessionId = providedSessionId ?? contactSessionId

    if (!sessionId) {
      setPendingStartChat({
        initialMessage,
        returnScreen,
      })
      setScreen("auth")
      return
    }

    setIsPending(true)
    try {
      const result = await createConversation({
        contactSessionId: sessionId,
        organizationId,
        agentId: agentId ?? undefined,
        metadata: getWidgetMetadata(),
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
