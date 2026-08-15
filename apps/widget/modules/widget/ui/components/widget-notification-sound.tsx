"use client"

import { useEffect } from "react"
import { useAtomValue } from "jotai"
import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import {
  contactSessionIdAtomFamily,
  conversationIdAtom,
  organizationIdAtom,
  screenAtom,
} from "@/modules/widget/atoms/widget-atoms"
import { useNotifyOnCountIncrease } from "@workspace/ui/hooks/use-notify-on-count-increase"
import { useNotificationSoundUnlock } from "@workspace/ui/hooks/use-notification-sound-unlock"
import { setNotificationSoundDelegate } from "@workspace/ui/lib/notification-sound"

export const WidgetNotificationSound = () => {
  useNotificationSoundUnlock()

  const screen = useAtomValue(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const conversationId = useAtomValue(conversationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )

  // Browsers block audio in a cross-origin iframe the visitor has not clicked
  // in, which is the normal case while the widget sits closed on the host page.
  // Once the embed script reports that it can play the chime itself, hand
  // playback over to it and stop trying from in here.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) {
      return
    }

    const hostWindow = window.parent
    let isHostAudioReady = false

    const onHostMessage = (event: MessageEvent) => {
      // `event.source` alone can be satisfied by any embedding page, so also
      // require the message to come from a real origin rather than a sandboxed
      // ("null" origin) frame injected alongside us.
      if (
        event.source !== hostWindow ||
        !event.origin ||
        event.origin === "null"
      ) {
        return
      }

      if (event.data?.type === "host-audio-ready") {
        isHostAudioReady = true
      }
    }

    setNotificationSoundDelegate(() => {
      if (!isHostAudioReady) {
        return false
      }

      hostWindow.postMessage({ type: "notification-sound" }, "*")
      return true
    })

    window.addEventListener("message", onHostMessage)
    hostWindow.postMessage({ type: "widget-ready" }, "*")

    return () => {
      window.removeEventListener("message", onHostMessage)
      setNotificationSoundDelegate(null)
    }
  }, [])

  // The open chat thread is excluded rather than muting the widget entirely, so
  // a reply in another conversation still chimes while reading a different one.
  const openConversationId = screen === "chat" ? conversationId : null

  const unreadSummary = useQuery(
    api.public.conversations.getUnreadSummary,
    contactSessionId
      ? {
          contactSessionId,
          excludeConversationId: openConversationId ?? undefined,
        }
      : "skip"
  )

  useNotifyOnCountIncrease(unreadSummary?.unreadMessageCount, {
    resetKey: `${screen}:${openConversationId ?? ""}`,
  })

  return null
}
