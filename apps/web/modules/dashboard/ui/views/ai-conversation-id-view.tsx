"use client"

import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { usePaginatedQuery, useQuery } from "convex/react"
import { format, isSameDay } from "date-fns"
import {
  ArrowLeftIcon,
  BotIcon,
  Clock3Icon,
  GlobeIcon,
  MailIcon,
  MessageSquareTextIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation"
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message"
import { AIResponse } from "@workspace/ui/components/ai/response"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { cn } from "@workspace/ui/lib/utils"
import {
  AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES,
  AI_CONVERSATION_PROVIDER_LABELS,
  AI_CONVERSATION_STATUS_BADGE_CLASSNAMES,
  AI_CONVERSATION_STATUS_LABELS,
} from "../../constants"

const formatTimestamp = (timestamp: number) =>
  format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a")

const formatTranscriptTime = (timestamp: number) =>
  format(new Date(timestamp), "h:mm a")

const formatCurrentPage = (value: string | undefined) => {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    return `${url.hostname}${url.pathname}`
  } catch {
    return value
  }
}

export const AIConversationIdView = ({
  conversationId,
}: {
  conversationId: Id<"aiVoiceConversations">
}) => {
  const isMobile = useIsMobile()
  const router = useRouter()

  const conversation = useQuery(api.private.aiConversations.getOne, {
    conversationId,
  })

  const messages = usePaginatedQuery(
    api.private.aiConversations.getMessages,
    { conversationId },
    { initialNumItems: 100 }
  )

  const orderedMessages = useMemo(
    () => [...messages.results].reverse(),
    [messages.results]
  )

  const transcriptItems = useMemo(
    () =>
      orderedMessages.map((message, index) => {
        const previousMessage = orderedMessages[index - 1]
        const dayLabel =
          !previousMessage ||
          !isSameDay(
            new Date(previousMessage._creationTime),
            new Date(message._creationTime)
          )
            ? format(new Date(message._creationTime), "EEEE, MMM d")
            : null

        return {
          dayLabel,
          message,
        }
      }),
    [orderedMessages]
  )

  if (conversation === undefined) {
    return <AIConversationIdSkeleton />
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Conversation not found.
      </div>
    )
  }

  const providerLabel = AI_CONVERSATION_PROVIDER_LABELS[conversation.provider]
  const providerBadgeClassName =
    AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES[conversation.provider]
  const status = conversation.status ?? "unresolved"
  const statusLabel = AI_CONVERSATION_STATUS_LABELS[status]
  const statusBadgeClassName = AI_CONVERSATION_STATUS_BADGE_CLASSNAMES[status]
  const currentPage = formatCurrentPage(
    conversation.contactSession?.metadata?.currentUrl
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b bg-background px-6 py-5">
        <div className="flex items-start gap-4">
          {isMobile ? (
            <Button
              className="mt-0.5 -ml-2"
              onClick={() => router.push("/ai-conversations")}
              size="icon"
              variant="ghost"
            >
              <ArrowLeftIcon className="size-4" />
              <span className="sr-only">Back to AI conversations</span>
            </Button>
          ) : null}

          <DicebearAvatar
            seed={conversation.contactSession?._id ?? conversation._id}
            size={44}
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-semibold text-foreground">
                  {conversation.contactSession?.name ?? "Unknown visitor"}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {conversation.contactSession?.email ?? "No email available"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-[11px] font-medium",
                    providerBadgeClassName
                  )}
                  variant="outline"
                >
                  {providerLabel}
                </Badge>
                <Badge
                  className="h-7 rounded-full border px-2.5 text-[11px] font-medium"
                  variant="outline"
                >
                  {conversation.endedAt ? "Ended" : "Live"}
                </Badge>
                <Badge
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-[11px] font-medium",
                    statusBadgeClassName
                  )}
                  variant="outline"
                >
                  {statusLabel}
                </Badge>
                {conversation.lastMessageRole ? (
                  <Badge
                    className="h-7 rounded-full border px-2.5 text-[11px] font-medium"
                    variant="outline"
                  >
                    {conversation.lastMessageRole === "assistant"
                      ? "Assistant last"
                      : "Visitor last"}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3Icon className="size-3.5" />
                Started {formatTimestamp(conversation._creationTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3Icon className="size-3.5" />
                Last activity {formatTimestamp(conversation.lastActivityAt)}
              </span>
              {conversation.contactSession?.metadata?.timezone ? (
                <span className="inline-flex items-center gap-1.5">
                  <GlobeIcon className="size-3.5" />
                  {conversation.contactSession.metadata.timezone}
                </span>
              ) : null}
              {currentPage ? (
                <span className="inline-flex items-center gap-1.5">
                  <GlobeIcon className="size-3.5" />
                  <span className="max-w-[260px] truncate">{currentPage}</span>
                </span>
              ) : null}
              {conversation.contactSession?.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <MailIcon className="size-3.5" />
                  {conversation.contactSession.email}
                </span>
              ) : null}
              {conversation.linkedConversationId ? (
                <Button
                  className="h-7 rounded-full px-3 text-[11px]"
                  onClick={() =>
                    router.push(
                      `/conversations/${conversation.linkedConversationId}`
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <MessageSquareTextIcon className="size-3.5" />
                  Open human handoff
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Transcript</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {orderedMessages.length} saved line
              {orderedMessages.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <AIConversation className="min-h-0 flex-1 bg-muted/20 px-6 py-6">
        <AIConversationContent>
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {transcriptItems.length > 0 ? (
              transcriptItems.map(({ dayLabel, message }) => (
                <div key={message._id}>
                  {dayLabel ? (
                    <div className="mb-4 flex justify-center">
                      <span className="rounded-full bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                        {dayLabel}
                      </span>
                    </div>
                  ) : null}

                  <AIMessage
                    from={message.role === "assistant" ? "assistant" : "user"}
                  >
                    <div className="flex max-w-xl flex-col gap-2">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground",
                          message.role === "assistant"
                            ? "justify-start"
                            : "justify-end"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <BotIcon className="size-3.5" />
                        ) : (
                          <UserRoundIcon className="size-3.5" />
                        )}
                        <span>
                          {message.role === "assistant"
                            ? "Assistant"
                            : "Visitor"}
                        </span>
                        <span className="text-muted-foreground/60">
                          {formatTranscriptTime(message._creationTime)}
                        </span>
                      </div>

                      <AIMessageContent
                        className={cn(
                          "rounded-2xl border px-4 py-3 shadow-none",
                          message.role === "assistant"
                            ? "border-border bg-background text-foreground"
                            : "border-transparent bg-foreground text-background"
                        )}
                      >
                        <AIResponse>{message.text}</AIResponse>
                      </AIMessageContent>
                    </div>
                  </AIMessage>
                </div>
              ))
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-background p-6 text-center">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/50">
                  <SparklesIcon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No transcript messages yet
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    This session was created before transcript lines were
                    stored.
                  </p>
                </div>
              </div>
            )}
          </div>
        </AIConversationContent>
        <AIConversationScrollButton />
      </AIConversation>
    </div>
  )
}

const AIConversationIdSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="border-b px-6 py-5">
        <div className="flex items-start gap-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-2 h-4 w-56" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-b px-6 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-muted/20 px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "max-w-xl rounded-2xl border px-4 py-3",
                index % 2 === 0 ? "self-start" : "self-end"
              )}
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-3 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
