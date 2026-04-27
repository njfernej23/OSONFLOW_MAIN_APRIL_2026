"use client"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { Badge } from "@workspace/ui/components/badge"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { api } from "@workspace/backend/_generated/api"
import { getCountryFlagUrl, getCountryFromTimezone } from "@/lib/country-utils"
import { cn } from "@workspace/ui/lib/utils"
import { usePathname, useRouter } from "next/navigation"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { format, isToday, isYesterday } from "date-fns"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { BotIcon, CircleIcon, SearchIcon, XIcon } from "lucide-react"
import { usePaginatedQuery } from "convex/react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES,
  AI_CONVERSATION_PROVIDER_LABELS,
  AI_CONVERSATION_STATUS_BADGE_CLASSNAMES,
  AI_CONVERSATION_STATUS_LABELS,
} from "../../constants"

type ProviderFilterValue = "all" | "openai_realtime" | "gemini_live"
type SessionFilterValue = "all" | "live" | "ended"

const PROVIDER_FILTER_OPTIONS: Array<{
  label: string
  value: ProviderFilterValue
}> = [
  { label: "All", value: "all" },
  { label: "OpenAI", value: "openai_realtime" },
  { label: "Gemini", value: "gemini_live" },
]

const SESSION_FILTER_OPTIONS: Array<{
  label: string
  value: SessionFilterValue
}> = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Ended", value: "ended" },
]

const highlightMatch = (value: string | undefined, query: string) => {
  if (!value) {
    return (
      <span className="text-muted-foreground/60 italic">No transcript yet</span>
    )
  }

  if (!query) {
    return value
  }

  const lowerValue = value.toLowerCase()
  const startIndex = lowerValue.indexOf(query)

  if (startIndex === -1) {
    return value
  }

  const endIndex = startIndex + query.length

  return (
    <>
      {value.slice(0, startIndex)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-current dark:bg-amber-800/50">
        {value.slice(startIndex, endIndex)}
      </mark>
      {value.slice(endIndex)}
    </>
  )
}

const formatConversationTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  if (isToday(date)) return format(date, "h:mm a")
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d")
}

const formatConversationDayLabel = (timestamp: number) => {
  const date = new Date(timestamp)

  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"

  return format(date, "MMMM d")
}

export const AIConversationsPanel = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [providerFilter, setProviderFilter] =
    useState<ProviderFilterValue>("all")
  const [sessionFilter, setSessionFilter] = useState<SessionFilterValue>("all")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const pathname = usePathname()
  const router = useRouter()

  const conversations = usePaginatedQuery(
    api.private.aiConversations.getMany,
    {},
    { initialNumItems: 12 }
  )

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const summary = useMemo(() => {
    const items = conversations.results

    return {
      total: items.length,
      live: items.filter((conversation) => !conversation.endedAt).length,
    }
  }, [conversations.results])

  const filteredConversations = useMemo(() => {
    return conversations.results.filter((conversation) => {
      if (
        providerFilter !== "all" &&
        conversation.provider !== providerFilter
      ) {
        return false
      }

      if (sessionFilter === "live" && conversation.endedAt) {
        return false
      }

      if (sessionFilter === "ended" && !conversation.endedAt) {
        return false
      }

      if (!normalizedSearchQuery) {
        return true
      }

      const searchableText = [
        conversation.contactSession?.name,
        conversation.contactSession?.email,
        conversation.lastMessagePreview,
        AI_CONVERSATION_PROVIDER_LABELS[conversation.provider],
        conversation.endedAt ? "ended" : "live",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchableText.includes(normalizedSearchQuery)
    })
  }, [
    conversations.results,
    normalizedSearchQuery,
    providerFilter,
    sessionFilter,
  ])

  const groupedConversations = useMemo(() => {
    const groups = new Map<string, typeof filteredConversations>()

    for (const conversation of filteredConversations) {
      const label = formatConversationDayLabel(conversation.lastActivityAt)
      const existing = groups.get(label)

      if (existing) {
        existing.push(conversation)
      } else {
        groups.set(label, [conversation])
      }
    }

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }))
  }, [filteredConversations])

  const firstMatchingConversation = filteredConversations[0]
  const hasSearchResults = filteredConversations.length > 0
  const hasActiveFilters = providerFilter !== "all" || sessionFilter !== "all"

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
    isLoadingFirstPage,
  } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: 12,
  })

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isFocusSearch =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"

      if (!isFocusSearch) {
        return
      }

      event.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    window.addEventListener("keydown", handleShortcut)

    return () => {
      window.removeEventListener("keydown", handleShortcut)
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="shrink-0 border-b bg-background px-3 pt-4 pb-3 sm:px-4 sm:pt-5 sm:pb-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-foreground sm:text-[16px]">
              AI Voicechats
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-[12px]">
              {summary.total} total · {summary.live} live
            </p>
          </div>

          {conversations.results.length > 0 && (normalizedSearchQuery || hasActiveFilters) ? (
            <Badge
              className="h-6 shrink-0 rounded-full border px-2.5 text-[11px] font-medium"
              variant="outline"
            >
              {filteredConversations.length}
            </Badge>
          ) : null}
        </div>

        <div className="relative mt-3 sm:mt-4">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search AI voicechats"
            className="h-9 rounded-xl border bg-muted/35 pr-14 pl-9 text-[13px] shadow-none transition-all focus-visible:border-border focus-visible:bg-background focus-visible:ring-0 sm:h-10 sm:text-sm"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && searchQuery) {
                event.preventDefault()
                setSearchQuery("")
                return
              }

              if (event.key === "Enter" && firstMatchingConversation?._id) {
                event.preventDefault()
                router.push(
                  `/ai-conversations/${firstMatchingConversation._id}`
                )
              }
            }}
            placeholder="Search transcripts or visitors"
            ref={searchInputRef}
            value={searchQuery}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            {searchQuery ? (
              <Button
                className="size-7"
                onClick={() => setSearchQuery("")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-3.5" />
                <span className="sr-only">Clear search</span>
              </Button>
            ) : (
              <Kbd className="hidden text-[10px] md:inline-flex">⌘K</Kbd>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex flex-1 flex-wrap gap-1.5">
            {PROVIDER_FILTER_OPTIONS.map((option) => {
              const isActive = providerFilter === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => setProviderFilter(option.value)}
                  type="button"
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="hidden h-4 w-px bg-border sm:block" />

          <div className="flex flex-wrap gap-1.5">
            {SESSION_FILTER_OPTIONS.map((option) => {
              const isActive = sessionFilter === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => setSessionFilter(option.value)}
                  type="button"
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {isLoadingFirstPage ? (
        <SkeletonAIConversations />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-2 sm:p-3">
            {!conversations.results.length && !normalizedSearchQuery ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/45">
                  <BotIcon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No AI voicechats yet
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    OpenAI realtime and Gemini live transcripts will appear
                    here.
                  </p>
                </div>
              </div>
            ) : !hasSearchResults &&
              (normalizedSearchQuery || hasActiveFilters) ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/45">
                  <BotIcon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No results found
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Try a wider search or reset the filters.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSearchQuery("")
                    setProviderFilter("all")
                    setSessionFilter("all")
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-xs"
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedConversations.map((group) => (
                  <div key={group.label}>
                    <p className="px-1.5 text-[10px] font-medium text-muted-foreground sm:px-2 sm:text-[11px]">
                      {group.label}
                    </p>

                    <div className="mt-1.5 space-y-1 sm:mt-2 sm:space-y-1.5">
                      {group.items.map((conversation) => {
                        const isActive =
                          pathname === `/ai-conversations/${conversation._id}`
                        const country = getCountryFromTimezone(
                          conversation.contactSession?.metadata?.timezone
                        )
                        const countryFlagUrl = country?.code
                          ? getCountryFlagUrl(country.code)
                          : undefined
                        const providerLabel =
                          AI_CONVERSATION_PROVIDER_LABELS[conversation.provider]
                        const providerBadgeClassName =
                          AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES[
                            conversation.provider
                          ]
                        const status = conversation.status ?? "unresolved"
                        const statusLabel =
                          AI_CONVERSATION_STATUS_LABELS[status]
                        const statusBadgeClassName =
                          AI_CONVERSATION_STATUS_BADGE_CLASSNAMES[status]

                        return (
                          <Link
                            key={conversation._id}
                            className={cn(
                              "block rounded-2xl px-2.5 py-2.5 transition-colors sm:px-3 sm:py-3",
                              isActive
                                ? "bg-muted ring-1 ring-border"
                                : "hover:bg-muted/50"
                            )}
                            href={`/ai-conversations/${conversation._id}`}
                          >
                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <DicebearAvatar
                                seed={
                                  conversation.contactSession?._id ??
                                  conversation._id
                                }
                                size={36}
                                badgeImageUrl={countryFlagUrl}
                                className="shrink-0 sm:size-10"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-foreground sm:text-[14px]">
                                      {highlightMatch(
                                        conversation.contactSession?.name ??
                                          "Unknown visitor",
                                        normalizedSearchQuery
                                      )}
                                    </p>
                                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-[12px]">
                                      {highlightMatch(
                                        conversation.contactSession?.email,
                                        normalizedSearchQuery
                                      )}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-[10px] text-muted-foreground sm:text-[11px]">
                                    {formatConversationTime(
                                      conversation.lastActivityAt
                                    )}
                                  </span>
                                </div>

                                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-[12px]">
                                  {highlightMatch(
                                    conversation.lastMessagePreview,
                                    normalizedSearchQuery
                                  )}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-2.5">
                                  <Badge
                                    className={cn(
                                      "h-5 rounded-md border px-1.5 text-[10px] font-medium",
                                      providerBadgeClassName
                                    )}
                                    variant="outline"
                                  >
                                    {providerLabel}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
                                    <CircleIcon
                                      className={cn(
                                        "size-1.5 fill-current",
                                        conversation.endedAt
                                          ? "text-muted-foreground/50"
                                          : "text-emerald-500"
                                      )}
                                    />
                                    <span>{conversation.endedAt ? "Ended" : "Live"}</span>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "h-5 rounded-md border px-1.5 text-[10px] font-medium",
                                      statusBadgeClassName
                                    )}
                                    variant="outline"
                                  >
                                    {statusLabel}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <InfiniteScrollTrigger
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              ref={topElementRef}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

const SkeletonAIConversations = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2 sm:gap-1.5 sm:p-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="flex items-start gap-2.5 rounded-2xl px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3"
          key={index}
        >
          <Skeleton className="size-9 shrink-0 rounded-full sm:size-10" />
          <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-24 sm:h-4 sm:w-28" />
              <Skeleton className="h-3 w-10 shrink-0 sm:w-12" />
            </div>
            <Skeleton className="h-3 w-32 sm:w-40" />
            <Skeleton className="h-3 w-full sm:w-4/5" />
            <div className="flex gap-1.5 sm:gap-2">
              <Skeleton className="h-5 w-16 rounded-md sm:w-20" />
              <Skeleton className="h-5 w-12 rounded-md sm:w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
