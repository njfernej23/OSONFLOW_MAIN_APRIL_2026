"use client"

import { useEffect } from "react"
import { unlockNotificationSound } from "../lib/notification-sound"

export const useNotificationSoundUnlock = () => {
  useEffect(() => {
    const unlock = () => {
      unlockNotificationSound()
    }

    window.addEventListener("pointerdown", unlock, { passive: true })
    window.addEventListener("keydown", unlock)

    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [])
}