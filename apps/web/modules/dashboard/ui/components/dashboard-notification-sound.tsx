"use client"

import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { useNotifyOnCountIncrease } from "@workspace/ui/hooks/use-notify-on-count-increase"

export const DashboardNotificationSound = () => {
  const { isLoaded: isAuthLoaded, orgId } = useAuth()
  const hasActiveOrganization = isAuthLoaded && Boolean(orgId)

  const conversationUnreadSummary = useQuery(
    api.private.conversations.getUnreadSummary,
    hasActiveOrganization ? {} : "skip"
  )
  const aiVoicechatUnreadSummary = useQuery(
    api.private.aiConversations.getUnreadSummary,
    hasActiveOrganization ? {} : "skip"
  )

  useNotifyOnCountIncrease(conversationUnreadSummary?.unreadMessageCount)
  useNotifyOnCountIncrease(aiVoicechatUnreadSummary?.unreadMessageCount)

  return null
}
