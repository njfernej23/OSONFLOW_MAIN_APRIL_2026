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
      <span className="text-sidebar-foreground/55 italic">
        No transcript yet
      </span>
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
      ended: items.filter((conversation) => conversation.endedAt).length,
    }
  }, [conversations.results])

  const providerCounts = useMemo(() => {
    const items = conversations.results

    return {
      all: items.length,
      openai_realtime: items.filter(
        (conversation) => conversation.provider === "openai_realtime"
      ).length,
      gemini_live: items.filter(
        (conversation) => conversation.provider === "gemini_live"
      ).length,
    } satisfies Record<ProviderFilterValue, number>
  }, [conversations.results])

  const sessionCounts = useMemo(() => {
    const items = conversations.results

    return {
      all: items.length,
      live: items.filter((conversation) => !conversation.endedAt).length,
      ended: items.filter((conversation) => conversation.endedAt).length,
    } satisfies Record<SessionFilterValue, number>
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
    <div className="surface-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border/70 bg-sidebar/78 px-3 pt-4 pb-3 backdrop-blur-xl sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
              Inbox
            </p>
            <h2 className="mt-1 truncate text-[16px] font-semibold text-sidebar-foreground">
              AI Voicechats
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-sidebar-foreground/58">
              {summary.total} total, {summary.live} live
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-sidebar-border/70 bg-sidebar-accent/55">
            <div className="border-r border-sidebar-border/70 px-2.5 py-1.5 text-center">
              <p className="text-[13px] font-semibold tabular-nums">
                {summary.live}
              </p>
              <p className="text-[9px] font-medium text-sidebar-foreground/48 uppercase">
                Live
              </p>
            </div>
            <div className="px-2.5 py-1.5 text-center">
              <p className="text-[13px] font-semibold tabular-nums">
                {filteredConversations.length}
              </p>
              <p className="text-[9px] font-medium text-sidebar-foreground/48 uppercase">
                Shown
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sidebar-foreground/55" />
          <Input
            aria-label="Search AI voicechats"
            className="h-10 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/70 pr-14 pl-9 text-sm text-sidebar-foreground shadow-none transition-all placeholder:text-sidebar-foreground/42 focus-visible:border-sidebar-ring focus-visible:bg-sidebar focus-visible:ring-0"
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
                onClick={() => setSearchQuery("")}
                size="icon"
                type="button"
                variant="ghost"
                className="size-7 text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <XIcon className="size-3.5" />
                <span className="sr-only">Clear search</span>
              </Button>
            ) : (
              <Kbd className="hidden bg-sidebar-accent text-[10px] text-sidebar-foreground/70 md:inline-flex">
                ⌘K
              </Kbd>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold tracking-[0.1em] text-sidebar-foreground/50 uppercase">
              Provider
            </span>
            {hasActiveFilters || normalizedSearchQuery ? (
              <button
                className="text-[10px] font-medium text-sidebar-primary hover:text-sidebar-primary/80"
                onClick={() => {
                  setSearchQuery("")
                  setProviderFilter("all")
                  setSessionFilter("all")
                }}
                type="button"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {PROVIDER_FILTER_OPTIONS.map((option) => {
              const isActive = providerFilter === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => setProviderFilter(option.value)}
                  type="button"
                  className={cn(
                    "flex min-w-0 flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "border-transparent bg-sidebar-accent/70 text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span className="truncate text-[11px] font-semibold">
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] tabular-nums",
                      isActive
                        ? "text-sidebar-primary-foreground/74"
                        : "text-sidebar-foreground/46"
                    )}
                  >
                    {providerCounts[option.value]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold tracking-[0.1em] text-sidebar-foreground/50 uppercase">
              Session
            </span>
            <span className="text-[10px] text-sidebar-foreground/44">
              {summary.ended} ended
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {SESSION_FILTER_OPTIONS.map((option) => {
              const isActive = sessionFilter === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => setSessionFilter(option.value)}
                  type="button"
                  className={cn(
                    "flex min-w-0 items-center justify-between gap-1 rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
                    isActive
                      ? "border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "border-transparent bg-sidebar-accent/70 text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      isActive
                        ? "text-sidebar-primary-foreground/74"
                        : "text-sidebar-foreground/46"
                    )}
                  >
                    {sessionCounts[option.value]}
                  </span>
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
          <div className="p-2 sm:p-2.5">
            {!conversations.results.length && !normalizedSearchQuery ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-sidebar-accent/70">
                  <BotIcon className="size-5 text-sidebar-foreground/55" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">
                    No AI voicechats yet
                  </p>
                  <p className="mt-1 text-[12px] text-sidebar-foreground/60">
                    OpenAI realtime and Gemini live transcripts will appear
                    here.
                  </p>
                </div>
              </div>
            ) : !hasSearchResults &&
              (normalizedSearchQuery || hasActiveFilters) ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-sidebar-accent/70">
                  <BotIcon className="size-5 text-sidebar-foreground/55" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">
                    No results found
                  </p>
                  <p className="mt-1 text-[12px] text-sidebar-foreground/60">
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
              <div className="space-y-4">
                {groupedConversations.map((group) => (
                  <div key={group.label}>
                    <div className="mb-1.5 flex items-center gap-2 px-2">
                      <p className="shrink-0 text-[10px] font-semibold tracking-[0.08em] text-sidebar-foreground/46 uppercase">
                        {group.label}
                      </p>
                      <div className="h-px flex-1 bg-sidebar-border/60" />
                      <span className="text-[10px] text-sidebar-foreground/42 tabular-nums">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="space-y-1">
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
                              "group relative block rounded-2xl border px-3 py-3 transition-all duration-200 hover:-translate-y-0.5",
                              isActive
                                ? "border-sidebar-primary/20 bg-sidebar-accent/95 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.5)]"
                                : "border-transparent bg-transparent hover:border-sidebar-border/70 hover:bg-sidebar-accent/58 hover:shadow-sm"
                            )}
                            href={`/ai-conversations/${conversation._id}`}
                          >
                            <div
                              className={cn(
                                "absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-sidebar-primary transition-opacity",
                                isActive
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-30"
                              )}
                            />

                            <div className="flex items-start gap-3">
                              <DicebearAvatar
                                seed={
                                  conversation.contactSession?._id ??
                                  conversation._id
                                }
                                size={38}
                                badgeImageUrl={countryFlagUrl}
                                className="mt-0.5 shrink-0"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] leading-snug font-semibold text-sidebar-foreground">
                                      {highlightMatch(
                                        conversation.contactSession?.name ??
                                          "Unknown visitor",
                                        normalizedSearchQuery
                                      )}
                                    </p>
                                    <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/54">
                                      {highlightMatch(
                                        conversation.contactSession?.email,
                                        normalizedSearchQuery
                                      )}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-[10px] text-sidebar-foreground/50 tabular-nums">
                                    {formatConversationTime(
                                      conversation.lastActivityAt
                                    )}
                                  </span>
                                </div>

                                <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-sidebar-foreground/62">
                                  {highlightMatch(
                                    conversation.lastMessagePreview,
                                    normalizedSearchQuery
                                  )}
                                </p>

                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    className={cn(
                                      "h-5 rounded-md border px-1.5 text-[10px] font-medium",
                                      providerBadgeClassName
                                    )}
                                    variant="outline"
                                  >
                                    {providerLabel}
                                  </Badge>
                                  <div className="flex h-5 items-center gap-1 rounded-md bg-sidebar-accent/68 px-1.5 text-[10px] font-medium text-sidebar-foreground/58">
                                    <CircleIcon
                                      className={cn(
                                        "size-1.5 fill-current",
                                        conversation.endedAt
                                          ? "text-sidebar-foreground/35"
                                          : "text-emerald-500"
                                      )}
                                    />
                                    <span>
                                      {conversation.endedAt ? "Ended" : "Live"}
                                    </span>
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
