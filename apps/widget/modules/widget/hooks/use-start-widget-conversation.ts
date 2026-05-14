"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import { api } from "@workspace/backend/_generated/api"
import {
  chatReturnScreenAtom,
  contactSessionIdAtomFamily,
  conversationIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  pendingInitialMessageAtom,
  screenAtom,
  type ChatReturnScreen,
} from "@/modules/widget/atoms/widget-atoms"

export const useStartWidgetConversation = () => {
  const setScreen = useSetAtom(screenAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)
  const setConversationId = useSetAtom(conversationIdAtom)
  const setChatReturnScreen = useSetAtom(chatReturnScreenAtom)
  const setPendingInitialMessage = useSetAtom(pendingInitialMessageAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const createConversation = useMutation(api.public.conversations.create)
  const [isPending, setIsPending] = useState(false)

  const startConversation = async ({
    initialMessage,
    returnScreen = "selection",
  }: {
    initialMessage?: string
    returnScreen?: ChatReturnScreen
  } = {}) => {
    if (!organizationId) {
      setScreen("error")
      setErrorMessage("Missing Organization ID")
      return
    }

    if (!contactSessionId) {
      setPendingInitialMessage(null)
      setScreen("auth")
      return
    }

    setIsPending(true)
    try {
      const nextConversationId = await createConversation({
        contactSessionId,
        organizationId,
      })
      const trimmedMessage = initialMessage?.trim()
      setPendingInitialMessage(trimmedMessage ? trimmedMessage : null)
      setChatReturnScreen(returnScreen)
      setConversationId(nextConversationId)
      setScreen("chat")
    } catch {
      setPendingInitialMessage(null)
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
