"use client"

import { useEffect } from "react"
import { unlockNotificationSound } from "../lib/notification-sound"

export const useNotificationSoundUnlock = () => {
  useEffect(() => {
    const unlock = () => {
      unlockNotificationSound()
    }

    // `touchstart` is needed on iOS Safari, where `pointerdown` alone does not
    // reliably count as the activating gesture for media playback.
    window.addEventListener("pointerdown", unlock, { passive: true })
    window.addEventListener("touchstart", unlock, { passive: true })
    window.addEventListener("keydown", unlock)

    // The page may already hold playback permission (e.g. a client-side
    // navigation after the visitor interacted), so try once up front.
    unlock()

    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("touchstart", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [])
}
