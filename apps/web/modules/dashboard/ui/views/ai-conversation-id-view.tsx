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
  MessageSquareTextIcon,
  SparklesIcon,
  UserRoundIcon,
  CircleIcon,
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <header className="surface-frosted mx-3 mt-3 shrink-0 rounded-[30px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
          {isMobile ? (
            <Button
              className="mt-0.5 -ml-2"
              onClick={() => router.push("/ai-conversations")}
              size="icon"
              variant="ghost"
            >
              <ArrowLeftIcon className="size-4" />
              <span className="sr-only">Back to AI voicechats</span>
            </Button>
          ) : null}

          <DicebearAvatar
            seed={conversation.contactSession?._id ?? conversation._id}
            size={isMobile ? 40 : 44}
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-semibold text-foreground sm:text-[19px] lg:text-[20px]">
                  {conversation.contactSession?.name ?? "Unknown visitor"}
                </h1>
                {conversation.contactSession?.email ? (
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground sm:text-[13px] lg:text-sm">
                    {conversation.contactSession.email}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    "h-6 rounded-md border px-2 text-[11px] font-medium",
                    providerBadgeClassName
                  )}
                  variant="outline"
                >
                  {providerLabel}
                </Badge>
                <Badge
                  className={cn(
                    "h-6 rounded-md border px-2 text-[11px] font-medium",
                    conversation.endedAt
                      ? "border-muted-foreground/20 bg-muted/50 text-muted-foreground"
                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  )}
                  variant="outline"
                >
                  <CircleIcon
                    className={cn(
                      "mr-1 size-1.5 fill-current",
                      conversation.endedAt
                        ? "text-muted-foreground/50"
                        : "text-emerald-500"
                    )}
                  />
                  {conversation.endedAt ? "Ended" : "Live"}
                </Badge>
                <Badge
                  className={cn(
                    "h-6 rounded-md border px-2 text-[11px] font-medium",
                    statusBadgeClassName
                  )}
                  variant="outline"
                >
                  {statusLabel}
                </Badge>
              </div>
            </div>

            <div className="mt-2.5 grid gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground sm:mt-3 sm:grid-cols-2 sm:gap-x-4 sm:text-[12px]">
              <div className="inline-flex items-center gap-1.5">
                <Clock3Icon className="size-3.5 shrink-0" />
                <span className="truncate">
                  Started {formatTimestamp(conversation._creationTime)}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Clock3Icon className="size-3.5 shrink-0" />
                <span className="truncate">
                  Last activity {formatTimestamp(conversation.lastActivityAt)}
                </span>
              </div>
              {conversation.contactSession?.metadata?.timezone ? (
                <div className="inline-flex items-center gap-1.5">
                  <GlobeIcon className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {conversation.contactSession.metadata.timezone}
                  </span>
                </div>
              ) : null}
              {currentPage ? (
                <div className="inline-flex items-center gap-1.5">
                  <GlobeIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{currentPage}</span>
                </div>
              ) : null}
            </div>

            {conversation.linkedConversationId ? (
              <div className="mt-2.5 sm:mt-3">
                <Button
                  className="h-7 rounded-lg px-3 text-[11px]"
                  onClick={() =>
                    router.push(
                      `/conversations/${conversation.linkedConversationId}`
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <MessageSquareTextIcon className="size-3.5" />
                  View human handoff
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-3 mt-3 rounded-[26px] border border-border/70 bg-background/72 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-foreground sm:text-sm">
              Transcript
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
              {orderedMessages.length} message
              {orderedMessages.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <AIConversation className="min-h-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <AIConversationContent className="surface-panel rounded-[32px] border-0 px-4 py-4 shadow-none sm:px-5 sm:py-5">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
            {transcriptItems.length > 0 ? (
              transcriptItems.map(({ dayLabel, message }) => (
                <div key={message._id}>
                  {dayLabel ? (
                    <div className="mb-3 flex justify-center sm:mb-4">
                      <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border sm:px-3 sm:text-[11px]">
                        {dayLabel}
                      </span>
                    </div>
                  ) : null}

                  <AIMessage
                    from={message.role === "assistant" ? "assistant" : "user"}
                  >
                    <div className="flex max-w-xl flex-col gap-1.5">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-medium sm:text-[11px]",
                          message.role === "assistant"
                            ? "justify-start text-muted-foreground"
                            : "justify-end text-muted-foreground"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <>
                            <BotIcon className="size-3 sm:size-3.5" />
                            <span>Assistant</span>
                          </>
                        ) : (
                          <>
                            <UserRoundIcon className="size-3 sm:size-3.5" />
                            <span>Visitor</span>
                          </>
                        )}
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-muted-foreground/60">
                          {formatTranscriptTime(message._creationTime)}
                        </span>
                      </div>

                      <AIMessageContent
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-[12px] leading-relaxed shadow-sm sm:px-4 sm:py-2.5 sm:text-[13px]",
                          message.role === "assistant"
                            ? "border-border/70 bg-background text-foreground shadow-[0_14px_34px_-24px_rgba(15,23,42,0.24)]"
                            : "border-transparent bg-foreground text-background shadow-[0_18px_36px_-24px_rgba(15,23,42,0.38)]"
                        )}
                      >
                        <AIResponse>{message.text}</AIResponse>
                      </AIMessageContent>
                    </div>
                  </AIMessage>
                </div>
              ))
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-2.5 rounded-3xl border border-dashed bg-background/85 p-4 text-center sm:min-h-[280px] sm:gap-3 sm:p-6">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-muted/50 sm:size-11">
                  <SparklesIcon className="size-4 text-muted-foreground sm:size-5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground sm:text-sm">
                    No transcript messages yet
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-[12px]">
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <div className="surface-frosted mx-3 mt-3 rounded-[30px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
          <Skeleton className="size-10 shrink-0 rounded-full sm:size-11 lg:size-11" />
          <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
            <div>
              <Skeleton className="h-5 w-36 sm:h-6 sm:w-44" />
              <Skeleton className="mt-1.5 h-3.5 w-44 sm:mt-2 sm:h-4 sm:w-56" />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Skeleton className="h-6 w-20 rounded-md sm:w-24" />
              <Skeleton className="h-6 w-16 rounded-md sm:w-20" />
              <Skeleton className="h-6 w-20 rounded-md sm:w-28" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <Skeleton className="h-3.5 w-36 sm:h-4 sm:w-40" />
              <Skeleton className="h-3.5 w-40 sm:h-4 sm:w-48" />
              <Skeleton className="h-3.5 w-28 sm:h-4 sm:w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-3 mt-3 rounded-[26px] border border-border/70 bg-background/72 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3 lg:px-6">
        <Skeleton className="h-9 w-full rounded-xl sm:h-10" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <div className="surface-panel mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[32px] px-4 py-4 shadow-none sm:gap-4 sm:px-5 sm:py-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "max-w-xl rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3",
                index % 2 === 0 ? "self-start" : "self-end"
              )}
            >
              <Skeleton className="h-3 w-24 sm:w-28" />
              <Skeleton className="mt-2.5 h-3 w-32 sm:mt-3 sm:w-40" />
              <Skeleton className="mt-2 h-3 w-20 sm:w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
