"use client"

import { useEffect, useRef } from "react"
import { playNotificationSound } from "../lib/notification-sound"

type MessageLike = {
  id?: string
  _id?: string
  role?: string
}

const getMessageId = (message: MessageLike) => message.id ?? message._id ?? null

export const useNotifyOnNewMessages = <T extends MessageLike>(
  messages: T[] | undefined,
  options: {
    enabled?: boolean
    notifyForRole: string
  }
) => {
  const previousIdsRef = useRef<Set<string> | null>(null)
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled || !messages) {
      return
    }

    const currentIds = new Set(
      messages
        .map((message) => getMessageId(message))
        .filter((id): id is string => Boolean(id))
    )

    const previousIds = previousIdsRef.current

    if (previousIds !== null) {
      for (const message of messages) {
        const messageId = getMessageId(message)

        if (
          !messageId ||
          previousIds.has(messageId) ||
          message.role !== options.notifyForRole
        ) {
          continue
        }

        playNotificationSound()
        break
      }
    }

    previousIdsRef.current = currentIds
  }, [enabled, messages, options.notifyForRole])
}
