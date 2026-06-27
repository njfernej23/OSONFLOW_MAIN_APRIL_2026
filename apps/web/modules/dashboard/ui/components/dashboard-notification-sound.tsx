"use client"

import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { api } from "@workspace/backend/_generated/api"
import { useNotifyOnCountIncrease } from "@workspace/ui/hooks/use-notify-on-count-increase"
import { useNotificationSoundUnlock } from "@workspace/ui/hooks/use-notification-sound-unlock"

const isConversationDetailPath = (pathname: string) =>
  /^\/conversations\/[^/]+$/.test(pathname) ||
  /^\/ai-conversations\/[^/]+$/.test(pathname)

export const DashboardNotificationSound = () => {
  useNotificationSoundUnlock()

  const pathname = usePathname()
  const { isLoaded: isAuthLoaded, orgId } = useAuth()
  const hasActiveOrganization = isAuthLoaded && Boolean(orgId)
  const isViewingConversationDetail = isConversationDetailPath(pathname)

  const conversationUnreadSummary = useQuery(
    api.private.conversations.getUnreadSummary,
    hasActiveOrganization ? {} : "skip"
  )
  const aiVoicechatUnreadSummary = useQuery(
    api.private.aiConversations.getUnreadSummary,
    hasActiveOrganization ? {} : "skip"
  )

  useNotifyOnCountIncrease(conversationUnreadSummary?.unreadMessageCount, {
    enabled: !isViewingConversationDetail,
    resetKey: pathname,
  })
  useNotifyOnCountIncrease(aiVoicechatUnreadSummary?.unreadMessageCount, {
    enabled: !isViewingConversationDetail,
    resetKey: pathname,
  })

  return null
}
