"use client"

import { use } from "react"
import { AIConversationIdView } from "@/modules/dashboard/ui/views/ai-conversation-id-view"
import { Id } from "@workspace/backend/_generated/dataModel"

const Page = ({
  params,
}: {
  params: Promise<{
    aiConversationId: string
  }>
}) => {
  const { aiConversationId } = use(params)

  return (
    <AIConversationIdView
      conversationId={aiConversationId as Id<"aiVoiceConversations">}
    />
  )
}

export default Page
