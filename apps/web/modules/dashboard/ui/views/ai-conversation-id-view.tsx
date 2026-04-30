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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-transparent p-3">
      <header className="surface-frosted shrink-0 rounded-[22px] px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {isMobile ? (
              <Button
                className="-ml-2 shrink-0"
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
              size={isMobile ? 40 : 46}
              className="shrink-0"
            />

            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                AI Voicechat
              </p>
              <h1 className="mt-1 truncate text-[18px] font-semibold text-foreground sm:text-[20px]">
                {conversation.contactSession?.name ?? "Unknown visitor"}
              </h1>
              {conversation.contactSession?.email ? (
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                  {conversation.contactSession.email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
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
            {conversation.linkedConversationId ? (
              <Button
                className="h-7 rounded-lg px-2.5 text-[11px]"
                onClick={() =>
                  router.push(
                    `/conversations/${conversation.linkedConversationId}`
                  )
                }
                size="sm"
                variant="outline"
              >
                <MessageSquareTextIcon className="size-3.5" />
                Handoff
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/65 bg-background/58 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              <Clock3Icon className="size-3.5" />
              Started
            </div>
            <p className="mt-1 truncate text-[12px] font-medium text-foreground">
              {formatTimestamp(conversation._creationTime)}
            </p>
          </div>
          <div className="rounded-xl border border-border/65 bg-background/58 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              <Clock3Icon className="size-3.5" />
              Last activity
            </div>
            <p className="mt-1 truncate text-[12px] font-medium text-foreground">
              {formatTimestamp(conversation.lastActivityAt)}
            </p>
          </div>
          {conversation.contactSession?.metadata?.timezone ? (
            <div className="rounded-xl border border-border/65 bg-background/58 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                <GlobeIcon className="size-3.5" />
                Timezone
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-foreground">
                {conversation.contactSession.metadata.timezone}
              </p>
            </div>
          ) : null}
          {currentPage ? (
            <div className="rounded-xl border border-border/65 bg-background/58 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                <GlobeIcon className="size-3.5" />
                Page
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-foreground">
                {currentPage}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <section className="surface-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] shadow-sm">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/62 px-4 py-3 lg:px-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Transcript</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {orderedMessages.length} message
              {orderedMessages.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="hidden rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:block">
            Read only
          </div>
        </div>

        <AIConversation className="min-h-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          <AIConversationContent className="px-0 py-0">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
              {transcriptItems.length > 0 ? (
                transcriptItems.map(({ dayLabel, message }) => (
                  <div key={message._id}>
                    {dayLabel ? (
                      <div className="mb-3 flex items-center gap-3 sm:mb-4">
                        <div className="h-px flex-1 bg-border/70" />
                        <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border sm:px-3 sm:text-[11px]">
                          {dayLabel}
                        </span>
                        <div className="h-px flex-1 bg-border/70" />
                      </div>
                    ) : null}

                    <AIMessage
                      from={message.role === "assistant" ? "assistant" : "user"}
                    >
                      <div className="flex max-w-2xl flex-col gap-1.5">
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
                              : "border-transparent bg-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(15,23,42,0.38)]"
                          )}
                        >
                          <AIResponse>{message.text}</AIResponse>
                        </AIMessageContent>
                      </div>
                    </AIMessage>
                  </div>
                ))
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed bg-background/65 p-4 text-center sm:min-h-[320px] sm:gap-3 sm:p-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted/50 sm:size-11">
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
      </section>
    </div>
  )
}

const AIConversationIdSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-transparent p-3">
      <div className="surface-frosted rounded-[22px] px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full sm:size-11 lg:size-11" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-36 sm:h-6 sm:w-44" />
              <Skeleton className="mt-1.5 h-3.5 w-44 sm:mt-2 sm:h-4 sm:w-56" />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Skeleton className="h-6 w-20 rounded-md sm:w-24" />
              <Skeleton className="h-6 w-16 rounded-md sm:w-20" />
              <Skeleton className="h-6 w-20 rounded-md sm:w-28" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-[58px] rounded-xl" key={index} />
          ))}
        </div>
      </div>

      <div className="surface-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] shadow-sm">
        <div className="border-b border-border/70 bg-background/62 px-4 py-3 lg:px-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-1.5 h-3 w-16" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-5">
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
