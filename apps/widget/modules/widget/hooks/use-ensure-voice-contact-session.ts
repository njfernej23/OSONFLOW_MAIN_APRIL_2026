"use client"

import { useAction } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useRef } from "react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
} from "../atoms/widget-atoms"
import { getWidgetMetadata } from "../lib/widget-metadata"

export const useEnsureVoiceContactSession = () => {
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const createAnonymousSession = useAction(
    api.public.contactSessions.createAnonymous
  )
  const inFlightRef = useRef<Promise<Id<"contactSessions"> | null> | null>(
    null
  )

  const ensureSession = useCallback(async () => {
    if (contactSessionId) {
      return contactSessionId
    }

    if (!organizationId) {
      return null
    }

    if (inFlightRef.current) {
      return await inFlightRef.current
    }

    const promise = createAnonymousSession({
      organizationId,
      metadata: getWidgetMetadata("voice_widget"),
      name: "Anonymous voice visitor",
    })
      .then((sessionId) => {
        setContactSessionId(sessionId)
        return sessionId
      })
      .catch((error) => {
        console.error("Unable to create anonymous voice session", error)
        return null
      })
      .finally(() => {
        inFlightRef.current = null
      })

    inFlightRef.current = promise
    return await promise
  }, [
    contactSessionId,
    createAnonymousSession,
    organizationId,
    setContactSessionId,
  ])

  return {
    contactSessionId,
    ensureSession,
  }
}
