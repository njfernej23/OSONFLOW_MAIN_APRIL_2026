"use client"

import { useAuth } from "@clerk/nextjs"
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
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import {
  ListIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CornerUpLeftIcon,
  SearchIcon,
  UserCheckIcon,
  XIcon,
  InboxIcon,
} from "lucide-react"
import { usePaginatedQuery } from "convex/react"
import Link from "next/link"
import { useAtomValue, useSetAtom } from "jotai/react"
import { useEffect, useRef, useState } from "react"
import { assignmentFilterAtom, statusFilterAtom } from "../../atoms"

type CombinedFilterValue =
  | "all"
  | "unresolved"
  | "escalated"
  | "resolved"
  | "assigned_to_me"
  | "unassigned"

const FILTER_OPTIONS: {
  label: string
  value: CombinedFilterValue
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { label: "All", value: "all", icon: ListIcon },
  { label: "Open", value: "unresolved", icon: ArrowRightIcon },
  { label: "Escalated", value: "escalated", icon: ArrowUpIcon },
  { label: "Resolved", value: "resolved", icon: CheckIcon },
  { label: "Mine", value: "assigned_to_me", icon: UserCheckIcon },
  { label: "Unassigned", value: "unassigned", icon: XIcon },
]

const STATUS_ACCENT: Record<string, string> = {
  unresolved: "bg-amber-400",
  escalated: "bg-red-500",
  resolved: "bg-emerald-500",
}

const highlightMatch = (value: string | undefined, query: string) => {
  if (!value) {
    return (
      <span className="text-sidebar-foreground/55 italic">No messages yet</span>
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

export const ConversationsPanel = () => {
  const { userId } = useAuth()

  const statusFilter = useAtomValue(statusFilterAtom)
  const setStatusFilter = useSetAtom(statusFilterAtom)
  const assignmentFilter = useAtomValue(assignmentFilterAtom)
  const setAssignmentFilter = useSetAtom(assignmentFilterAtom)

  const combinedFilterValue: CombinedFilterValue =
    assignmentFilter !== "all" ? assignmentFilter : statusFilter

  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const pathname = usePathname()
  const router = useRouter()
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const conversations = usePaginatedQuery(
    api.private.conversations.getMany,
    {
      status: statusFilter === "all" ? undefined : statusFilter,
      assignmentFilter,
      searchQuery: normalizedSearchQuery || undefined,
    },
    { initialNumItems: 10 }
  )

  const filteredConversations = conversations.results

  const firstMatchingConversation = filteredConversations[0]
  const hasSearchResults = filteredConversations.length > 0

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
    isLoadingFirstPage,
  } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: 10,
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

  const handleFilterChange = (value: CombinedFilterValue) => {
    if (value === "assigned_to_me" || value === "unassigned") {
      setAssignmentFilter(value)
      setStatusFilter("all")
      return
    }
    setAssignmentFilter("all")
    setStatusFilter(value)
  }

  return (
    <div className="surface-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[30px] text-sidebar-foreground">
      {/* Panel header */}
      <div className="shrink-0 border-b border-sidebar-border/70 bg-sidebar/72 px-3 pt-3.5 pb-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/64">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold tracking-tight text-sidebar-foreground">
            Conversations
          </h2>
          {conversations.results.length > 0 && (
            <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-medium text-sidebar-foreground/70 tabular-nums">
              {normalizedSearchQuery
                ? `${filteredConversations.length} / ${conversations.results.length}`
                : conversations.results.length}
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-2.5">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-sidebar-foreground/55" />
          <Input
            aria-label="Search conversations"
            className="h-8 border border-sidebar-border/60 bg-sidebar-accent/80 pr-14 pl-8 text-sm text-sidebar-foreground shadow-none transition-all placeholder:text-sidebar-foreground/45 focus-visible:border-sidebar-ring focus-visible:bg-sidebar focus-visible:ring-0"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && searchQuery) {
                event.preventDefault()
                setSearchQuery("")
                return
              }

              if (event.key === "Enter" && firstMatchingConversation?._id) {
                event.preventDefault()
                router.push(`/conversations/${firstMatchingConversation._id}`)
              }
            }}
            placeholder="Search..."
            ref={searchInputRef}
            value={searchQuery}
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            {searchQuery ? (
              <Button
                onClick={() => setSearchQuery("")}
                size="icon"
                type="button"
                variant="ghost"
                className="size-6 text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <XIcon className="size-3" />
                <span className="sr-only">Clear search</span>
              </Button>
            ) : (
              <Kbd className="hidden bg-sidebar-accent text-[10px] text-sidebar-foreground/70 md:inline-flex">
                ⌘K
              </Kbd>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_OPTIONS.map((option) => {
            const isActive = combinedFilterValue === option.value
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                type="button"
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_14px_28px_-20px_color-mix(in_srgb,var(--sidebar-primary)_70%,transparent)]"
                    : "bg-sidebar-accent/82 text-sidebar-foreground/72 hover:bg-sidebar-accent/94 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-3" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation list */}
      {isLoadingFirstPage ? (
        <SkeletonConversations />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex w-full flex-col gap-1 p-2.5">
            {!hasSearchResults && normalizedSearchQuery ? (
              <div className="mx-auto mt-10 flex max-w-[200px] flex-col items-center gap-3 text-center">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-accent/55">
                  <InboxIcon className="size-5 text-sidebar-foreground/55" />
                </div>
                <div>
                  <p className="text-xs font-medium text-sidebar-foreground">
                    No results found
                  </p>
                  <p className="mt-0.5 text-[11px] text-sidebar-foreground/60">
                    Try searching by name, email, or message
                  </p>
                </div>
                <Button
                  onClick={() => setSearchQuery("")}
                  size="sm"
                  type="button"
                  variant="outline"
                  className="h-7 text-xs"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isLastMessageFromOperator =
                  conversation.lastMessage?.message?.role !== "user"
                const isAssignedToMe =
                  !!userId && conversation.assignedToId === userId
                const assigneeLabel = isAssignedToMe
                  ? "Me"
                  : (conversation.assignedToName ?? "Assigned")
                const isActive =
                  pathname === `/conversations/${conversation._id}`

                const country = getCountryFromTimezone(
                  conversation.contactSession.metadata?.timezone
                )
                const countryFlagUrl = country?.code
                  ? getCountryFlagUrl(country.code)
                  : undefined
                const activityTimestamp =
                  conversation.lastCustomerMessageAt ??
                  conversation.lastOperatorMessageAt ??
                  conversation._creationTime

                const statusAccent =
                  STATUS_ACCENT[conversation.status] ?? "bg-transparent"
                const showOperatorUnreadBadge =
                  conversation.status === "escalated" &&
                  (conversation.unreadForOperatorCount ?? 0) > 0
                const showVisitorUnreadBadge =
                  (conversation.unreadForContactCount ?? 0) > 0

                return (
                  <Link
                    key={conversation._id}
                    className={cn(
                      "group relative flex cursor-pointer items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-sm leading-tight transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                      isActive
                        ? "border-sidebar-border/80 bg-sidebar-accent/92 text-sidebar-accent-foreground shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)]"
                        : "border-transparent bg-transparent hover:border-sidebar-border/70 hover:bg-sidebar-accent/62 hover:text-sidebar-accent-foreground"
                    )}
                    href={`/conversations/${conversation._id}`}
                  >
                    {/* Status accent stripe */}
                    <div
                      className={cn(
                        "absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full transition-all duration-200",
                        statusAccent,
                        isActive
                          ? "opacity-80"
                          : "opacity-0 group-hover:opacity-30"
                      )}
                    />

                    <DicebearAvatar
                      seed={conversation.contactSession._id}
                      size={36}
                      badgeImageUrl={countryFlagUrl}
                      className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      {/* Name + time row */}
                      <div className="flex w-full items-start justify-between gap-1">
                        <span className="truncate text-[13px] leading-snug font-semibold">
                          {highlightMatch(
                            conversation.contactSession.name,
                            normalizedSearchQuery
                          )}
                        </span>
                        <span className="ml-1 shrink-0 text-[11px] text-sidebar-foreground/55 tabular-nums">
                          {formatConversationTime(activityTimestamp)}
                        </span>
                      </div>

                      {/* Assignment badge */}
                      {(!!conversation.assignedToId ||
                        showOperatorUnreadBadge ||
                        showVisitorUnreadBadge) && (
                        <div className="mt-0.5">
                          {showOperatorUnreadBadge && (
                            <Badge
                              className="h-3.5 bg-amber-500 px-1 text-[10px] leading-none whitespace-nowrap text-black hover:bg-amber-500"
                              variant="default"
                            >
                              {conversation.unreadForOperatorCount} unread
                            </Badge>
                          )}
                          {!!conversation.assignedToId && (
                            <Badge
                              className={cn(
                                "h-3.5 px-1 text-[10px] leading-none",
                                showOperatorUnreadBadge && "ml-1"
                              )}
                              variant={isAssignedToMe ? "default" : "outline"}
                            >
                              {assigneeLabel}
                            </Badge>
                          )}
                          {showVisitorUnreadBadge && (
                            <Badge
                              className="ml-1 h-3.5 bg-rose-500 px-1 text-[10px] leading-none whitespace-nowrap text-white hover:bg-rose-500"
                              variant="default"
                            >
                              Unread {conversation.unreadForContactCount}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Message preview */}
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          {isLastMessageFromOperator && (
                            <CornerUpLeftIcon className="size-3 shrink-0 text-sidebar-foreground/55" />
                          )}
                          <span
                            className={cn(
                              "line-clamp-1 text-[12px]",
                              isLastMessageFromOperator
                                ? "text-sidebar-foreground/60"
                                : "font-medium text-sidebar-foreground"
                            )}
                          >
                            {highlightMatch(
                              conversation.searchMatchPreview ??
                                conversation.lastMessage?.text,
                              normalizedSearchQuery
                            )}
                          </span>
                        </div>
                        <ConversationStatusIcon status={conversation.status} />
                      </div>
                    </div>
                  </Link>
                )
              })
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

export const SkeletonConversations = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className={cn(
            "relative flex items-start gap-2.5 rounded-2xl border px-3 py-2.5",
            index === 1
              ? "border-sidebar-border/80 bg-sidebar-accent/92 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)]"
              : "border-transparent"
          )}
          key={index}
        >
          {index === 1 && (
            <div className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-emerald-400/80" />
          )}
          <div className="relative mt-0.5 size-9 shrink-0">
            <Skeleton className="size-9 rounded-full bg-sidebar-accent" />
            <Skeleton className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-sidebar bg-sidebar" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-32 bg-sidebar-accent" />
              <Skeleton className="h-3 w-10 shrink-0 bg-sidebar-accent" />
            </div>
            <Skeleton
              className={cn(
                "h-3.5 rounded-full bg-sidebar-accent",
                index % 3 === 0 ? "w-12" : "w-9"
              )}
            />
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Skeleton className="size-3 shrink-0 bg-sidebar-accent" />
                <Skeleton
                  className={cn(
                    "h-3 bg-sidebar-accent",
                    index % 2 === 0 ? "w-4/5" : "w-2/3"
                  )}
                />
              </div>
              <Skeleton className="size-4 shrink-0 rounded-full bg-sidebar-accent" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
