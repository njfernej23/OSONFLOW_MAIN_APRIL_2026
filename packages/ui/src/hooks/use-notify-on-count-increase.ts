"use client"

import { useEffect, useRef } from "react"
import { playNotificationSound } from "../lib/notification-sound"

export const useNotifyOnCountIncrease = (
  count: number | null | undefined,
  options?: {
    enabled?: boolean
    resetKey?: string | number | null
  }
) => {
  const previousCountRef = useRef<number | null>(null)
  const enabled = options?.enabled ?? true
  const resetKey = options?.resetKey

  useEffect(() => {
    previousCountRef.current = null
  }, [resetKey])

  useEffect(() => {
    if (!enabled || count === undefined) {
      return
    }

    const nextCount = count ?? 0
    const previousCount = previousCountRef.current

    if (previousCount !== null && nextCount > previousCount) {
      playNotificationSound()
    }

    previousCountRef.current = nextCount
  }, [count, enabled])
}
