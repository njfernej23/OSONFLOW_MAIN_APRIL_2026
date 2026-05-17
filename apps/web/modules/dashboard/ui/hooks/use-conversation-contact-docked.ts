"use client"

import { useCallback, useSyncExternalStore } from "react"

export const CONVERSATION_CONTACT_DOCKED_QUERY = "(min-width: 1680px)"

export const useConversationContactDocked = () => {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia(CONVERSATION_CONTACT_DOCKED_QUERY)

    mediaQuery.addEventListener("change", onStoreChange)

    return () => mediaQuery.removeEventListener("change", onStoreChange)
  }, [])

  const getSnapshot = useCallback(() => {
    return window.matchMedia(CONVERSATION_CONTACT_DOCKED_QUERY).matches
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
