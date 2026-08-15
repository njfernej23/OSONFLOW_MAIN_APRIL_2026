"use client"

import { useEffect, useRef } from "react"
import { playNotificationSound } from "../lib/notification-sound"

const UNSET = Symbol("unset")

type ResetKey = string | number | null | undefined

export const useNotifyOnCountIncrease = (
  count: number | null | undefined,
  options?: {
    enabled?: boolean
    resetKey?: ResetKey
  }
) => {
  const previousCountRef = useRef<number | null>(null)
  const resetKeyRef = useRef<ResetKey | typeof UNSET>(UNSET)
  const enabled = options?.enabled ?? true
  const resetKey = options?.resetKey

  useEffect(() => {
    // `undefined` means the query has not resolved yet, which is different from
    // a resolved count of zero.
    const nextCount = count === undefined ? null : (count ?? 0)

    // Re-baseline against the count we already have. Resetting to `null` here
    // would swallow the first increase that follows the reset.
    if (resetKeyRef.current !== resetKey) {
      resetKeyRef.current = resetKey
      previousCountRef.current = nextCount
      return
    }

    if (nextCount === null) {
      return
    }

    const previousCount = previousCountRef.current
    previousCountRef.current = nextCount

    // The baseline is tracked even while disabled so re-enabling does not fire
    // for a backlog that built up in the meantime.
    if (enabled && previousCount !== null && nextCount > previousCount) {
      playNotificationSound()
    }
  }, [count, enabled, resetKey])
}
