"use client"

import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { format, isSameDay, isValid } from "date-fns"
import {
  ArrowLeftIcon,
  BotIcon,
  Clock3Icon,
  GlobeIcon,
  SparklesIcon,
  UserRoundIcon,
  CircleIcon,
} from "lucide-react"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { cn } from "@workspace/ui/lib/utils"
import { useSetAtom } from "jotai"
import { openAiConversationIdAtom } from "@/modules/dashboard/atoms"
import {
  AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES,
  AI_CONVERSATION_PROVIDER_LABELS,
} from "../../constants"

const toValidDate = (timestamp: number | undefined) => {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return null
  }

  const date = new Date(timestamp)
  return isValid(date) ? date : null
}

const formatTimestamp = (timestamp: number | undefined) => {
  const date = toValidDate(timestamp)
  return date ? format(date, "MMM d, yyyy 'at' h:mm a") : "—"
}

const formatTranscriptTime = (timestamp: number | undefined) => {
  const date = toValidDate(timestamp)
  return date ? format(date, "h:mm a") : ""
}

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

const getVisitorLabel = (conversation: {
  contactSession?: { isAnonymous?: boolean; name?: string } | null
}) => {
  if (conversation.contactSession?.isAnonymous) {
    return "Anonymous voice visitor"
  }

  return conversation.contactSession?.name ?? "Unknown visitor"
}

const getVisitorDetail = (conversation: {
  contactSession?: {
    email?: string
    isAnonymous?: boolean
    metadata?: { currentUrl?: string; timezone?: string }
  } | null
}) => {
  if (!conversation.contactSession?.isAnonymous) {
    return conversation.contactSession?.email
  }

  return (
    formatCurrentPage(conversation.contactSession.metadata?.currentUrl) ??
    conversation.contactSession.metadata?.timezone ??
    "Anonymous voice session"
  )
}

const getProviderLabel = (provider: string) => {
  return (
    AI_CONVERSATION_PROVIDER_LABELS[
      provider as keyof typeof AI_CONVERSATION_PROVIDER_LABELS
    ] ?? "Voice AI"
  )
}

const getProviderBadgeClassName = (provider: string) => {
  return (
    AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES[
      provider as keyof typeof AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES
    ] ?? "border-[var(--console-hairline)] bg-muted/60 text-foreground/80"
  )
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
  const markConversationAsRead = useMutation(
    api.private.aiConversations.markAsRead
  )
  const setOpenAiConversationId = useSetAtom(openAiConversationIdAtom)

  useEffect(() => {
    setOpenAiConversationId(conversationId)

    return () => {
      setOpenAiConversationId(null)
    }
  }, [conversationId, setOpenAiConversationId])

  const messages = usePaginatedQuery(
    api.private.aiConversations.getMessages,
    conversation ? { conversationId } : "skip",
    { initialNumItems: 100 }
  )

  const orderedMessages = useMemo(
    () => [...(messages.results ?? [])].reverse(),
    [messages.results]
  )

  useEffect(() => {
    if (!conversationId || !conversation) {
      return
    }

    if ((conversation.unreadForOperatorCount ?? 0) === 0) {
      return
    }

    void markConversationAsRead({
      conversationId,
    })
  }, [conversation, conversationId, markConversationAsRead])

  useEffect(() => {
    if (conversation === null) {
      router.replace("/ai-conversations")
    }
  }, [conversation, router])

  const transcriptItems = useMemo(
    () =>
      orderedMessages.map((message, index) => {
        const previousMessage = orderedMessages[index - 1]
        const messageDate = toValidDate(message._creationTime)
        const previousDate = toValidDate(previousMessage?._creationTime)
        const dayLabel =
          messageDate &&
          (!previousDate || !isSameDay(previousDate, messageDate))
            ? format(messageDate, "EEEE, MMM d")
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
    return <AIConversationIdSkeleton />
  }

  const providerLabel = getProviderLabel(conversation.provider)
  const providerBadgeClassName = getProviderBadgeClassName(
    conversation.provider
  )
  const currentPage = formatCurrentPage(
    conversation.contactSession?.metadata?.currentUrl
  )

  return (
    <div className="console-page flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
      <header className="console-card shrink-0 px-3.5 py-3.5 sm:px-4.5 sm:py-4">
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
              <p className="console-eyebrow">AI voicechat</p>
              <h1 className="mt-1.5 truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[1.15rem]">
                {getVisitorLabel(conversation)}
              </h1>
              {getVisitorDetail(conversation) ? (
                <p className="mt-0.5 truncate text-[0.78rem] text-muted-foreground">
                  {getVisitorDetail(conversation)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
            <Badge
              className={cn(
                "h-6 rounded-full border px-2.5 text-[0.7rem] font-medium",
                providerBadgeClassName
              )}
              variant="outline"
            >
              {providerLabel}
            </Badge>
            <Badge
              className={cn(
                "console-tone-wash h-6 rounded-full border px-2.5 text-[0.7rem] font-medium",
                conversation.endedAt
                  ? "console-tone-neutral"
                  : "console-tone-positive"
              )}
              variant="outline"
            >
              <CircleIcon className="mr-1 size-1.5 fill-current" />
              <span className="text-foreground/85">
                {conversation.endedAt ? "Ended" : "Live"}
              </span>
            </Badge>
          </div>
        </div>

        <div className="console-rule mt-4" />

        <div className="mt-3.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              [Clock3Icon, "Started", formatTimestamp(conversation._creationTime)],
              [
                Clock3Icon,
                "Last activity",
                formatTimestamp(conversation.lastActivityAt),
              ],
              [
                GlobeIcon,
                "Timezone",
                conversation.contactSession?.metadata?.timezone,
              ],
              [GlobeIcon, "Page", currentPage],
            ] as const
          )
            .filter(([, , value]) => Boolean(value))
            .map(([Icon, label, value]) => (
              <div className="console-inset px-3 py-2" key={label}>
                <p className="console-label flex items-center gap-1.5">
                  <Icon className="size-3" />
                  {label}
                </p>
                <p className="mt-1.5 truncate text-[0.76rem] font-medium text-foreground">
                  {value}
                </p>
              </div>
            ))}
        </div>
      </header>

      <section className="console-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--console-hairline-soft)] px-4 py-3 lg:px-5">
          <div>
            <h2 className="console-section-title">Transcript</h2>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              <span className="console-numeral text-[0.7rem]">
                {orderedMessages.length}
              </span>{" "}
              message{orderedMessages.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="console-label hidden sm:block">Read only</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
            {transcriptItems.length > 0 ? (
              transcriptItems.map(({ dayLabel, message }) => (
                <div key={message._id}>
                  {dayLabel ? (
                    <div className="mb-3 flex items-center gap-3 sm:mb-4">
                      <div className="console-rule flex-1" />
                      <span className="console-eyebrow">{dayLabel}</span>
                      <div className="console-rule flex-1 rotate-180" />
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
                          "rounded-[14px] border px-3.5 py-2.5 text-[0.78rem] leading-relaxed sm:px-4 sm:text-[0.82rem]",
                          message.role === "assistant"
                            ? "border-[var(--console-hairline)] bg-card text-foreground"
                            : "border-transparent bg-primary text-primary-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      </AIMessageContent>
                    </div>
                  </AIMessage>
                </div>
              ))
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-4 text-center sm:min-h-[320px] sm:p-6">
                <span className="console-medallion size-12">
                  <SparklesIcon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No transcript messages yet
                  </p>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    The call is saved. Final transcript lines will appear here
                    as the voice provider returns them.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

const AIConversationIdSkeleton = () => {
  return (
    <div className="console-page flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
      <div className="console-card px-3.5 py-3.5 sm:px-4.5 sm:py-4">
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
            <Skeleton className="h-[3.4rem] rounded-[10px]" key={index} />
          ))}
        </div>
      </div>

      <div className="console-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-[var(--console-hairline-soft)] px-4 py-3 lg:px-5">
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
