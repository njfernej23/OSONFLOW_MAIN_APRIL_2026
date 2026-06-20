"use client"

import { useEffect, useRef } from "react"
import { playNotificationSound } from "../lib/notification-sound"

export const useNotifyOnCountIncrease = (
  count: number | undefined,
  options?: {
    enabled?: boolean
  }
) => {
  const previousCountRef = useRef<number | null>(null)
  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled || count === undefined) {
      return
    }

    const previousCount = previousCountRef.current

    if (previousCount !== null && count > previousCount) {
      playNotificationSound()
    }

    previousCountRef.current = count
  }, [count, enabled])
}
