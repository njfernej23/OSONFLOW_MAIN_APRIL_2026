"use client"

import { useEffect, useRef } from "react"
import { playNotificationSound } from "../lib/notification-sound"

type MessageLike = {
  id?: string
  _id?: string
  role?: string
}

const getMessageId = (message: MessageLike) => message.id ?? message._id ?? null

/**
 * Plays the notification sound when a message with `notifyForRole` lands at the
 * end of the list. Only the newest message is inspected so paginating older
 * history into the list never triggers a chime.
 */
export const useNotifyOnNewMessages = <T extends MessageLike>(
  messages: T[] | undefined,
  options: {
    enabled?: boolean
    notifyForRole: string
  }
) => {
  const lastSeenIdRef = useRef<string | null>(null)
  const hasBaselineRef = useRef(false)
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!messages?.length) {
      return
    }

    const latestMessage = messages[messages.length - 1]
    const latestId = latestMessage ? getMessageId(latestMessage) : null

    if (!latestId || latestId === lastSeenIdRef.current) {
      return
    }

    const hadBaseline = hasBaselineRef.current

    lastSeenIdRef.current = latestId
    hasBaselineRef.current = true

    if (!enabled || !hadBaseline) {
      return
    }

    if (latestMessage?.role === options.notifyForRole) {
      playNotificationSound()
    }
  }, [enabled, messages, options.notifyForRole])
}
