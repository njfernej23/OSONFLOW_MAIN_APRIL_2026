"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import { api } from "@workspace/backend/_generated/api"
import type { Doc, Id } from "@workspace/backend/_generated/dataModel"
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

const getWidgetMetadata = (): Doc<"contactSessions">["metadata"] => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      source: "workflow_widget",
    }
  }

  let visitorId: string | null = null

  try {
    visitorId = window.localStorage.getItem("osonflow_visitor_id")

    if (!visitorId) {
      visitorId = `visitor_${Date.now().toString(36)}`
      window.localStorage.setItem("osonflow_visitor_id", visitorId)
    }
  } catch {
    visitorId = `visitor_${Date.now().toString(36)}`
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(","),
    platform: navigator.platform,
    vendor: navigator.vendor,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookieEnabled: navigator.cookieEnabled,
    referrer: document.referrer || "direct",
    currentUrl: window.location.href,
    source: "workflow_widget",
    visitorId,
  }
}

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
