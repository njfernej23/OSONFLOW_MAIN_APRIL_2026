"use client"

import { useAtomValue } from "jotai"
import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
} from "@/modules/widget/atoms/widget-atoms"
import { useNotifyOnCountIncrease } from "@workspace/ui/hooks/use-notify-on-count-increase"

export const WidgetNotificationSound = () => {
  const screen = useAtomValue(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )

  const unreadSummary = useQuery(
    api.public.conversations.getUnreadSummary,
    contactSessionId ? { contactSessionId } : "skip"
  )

  useNotifyOnCountIncrease(unreadSummary?.unreadMessageCount, {
    enabled: screen !== "chat",
  })

  return null
}
