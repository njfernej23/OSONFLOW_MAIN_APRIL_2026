"use client"

import { useAuth } from "@clerk/nextjs"
import { useAtomValue } from "jotai"
import { usePathname } from "next/navigation"
import { api } from "@workspace/backend/_generated/api"
import { useSafeQuery } from "@/lib/use-safe-query"
import { useNotifyOnCountIncrease } from "@workspace/ui/hooks/use-notify-on-count-increase"
import { useNotificationSoundUnlock } from "@workspace/ui/hooks/use-notification-sound-unlock"
import {
  openAiConversationIdAtom,
  openConversationIdAtom,
} from "@/modules/dashboard/atoms"

export const DashboardNotificationSound = () => {
  useNotificationSoundUnlock()

  const pathname = usePathname()
  const { isLoaded: isAuthLoaded, orgId } = useAuth()
  const hasActiveOrganization = isAuthLoaded && Boolean(orgId)
  const openConversationId = useAtomValue(openConversationIdAtom)
  const openAiConversationId = useAtomValue(openAiConversationIdAtom)

  const conversationUnreadSummary = useSafeQuery(
    api.private.conversations.getUnreadSummary,
    hasActiveOrganization
      ? openConversationId
        ? { excludeConversationId: openConversationId }
        : {}
      : "skip"
  )
  const aiVoicechatUnreadSummary = useSafeQuery(
    api.private.aiConversations.getUnreadSummary,
    hasActiveOrganization
      ? openAiConversationId
        ? { excludeConversationId: openAiConversationId }
        : {}
      : "skip"
  )

  // Re-baseline whenever the operator moves around or opens a different thread,
  // so the resulting change in the excluded count is never mistaken for a new
  // message.
  useNotifyOnCountIncrease(conversationUnreadSummary?.unreadMessageCount, {
    resetKey: `${pathname}:${openConversationId ?? ""}`,
  })
  useNotifyOnCountIncrease(aiVoicechatUnreadSummary?.unreadMessageCount, {
    resetKey: `${pathname}:${openAiConversationId ?? ""}`,
  })

  return null
}
