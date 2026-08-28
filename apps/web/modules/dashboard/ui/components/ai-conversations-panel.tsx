"use client"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { Badge } from "@workspace/ui/components/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { getCountryFlagUrl, getCountryFromTimezone } from "@/lib/country-utils"
import { cn } from "@workspace/ui/lib/utils"
import { usePathname, useRouter } from "next/navigation"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { format, isToday, isYesterday } from "date-fns"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import {
  BotIcon,
  CircleIcon,
  DownloadIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useConvex, useMutation, usePaginatedQuery } from "convex/react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES,
  AI_CONVERSATION_PROVIDER_LABELS,
} from "../../constants"
import { downloadConversationExport } from "../lib/conversation-export"

type SessionFilterValue = "all" | "live" | "ended"

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
      <span className="text-muted-foreground/70 italic">No transcript yet</span>
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

const formatPageAddress = (value: string | undefined) => {
  if (!value) return undefined

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
    formatPageAddress(conversation.contactSession.metadata?.currentUrl) ??
    conversation.contactSession.metadata?.timezone ??
    "Anonymous voice session"
  )
}

export const AIConversationsPanel = () => {
  const convex = useConvex()
  const deleteConversation = useMutation(api.private.aiConversations.remove)
  const [searchQuery, setSearchQuery] = useState("")
  const [sessionFilter, setSessionFilter] = useState<SessionFilterValue>("all")
  const [conversationToDelete, setConversationToDelete] = useState<{
    id: Id<"aiVoiceConversations">
    label: string
  } | null>(null)
  const [isDeletingConversation, setIsDeletingConversation] = useState(false)
  const [downloadingConversationId, setDownloadingConversationId] =
    useState<Id<"aiVoiceConversations"> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const pathname = usePathname()
  const router = useRouter()
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const conversations = usePaginatedQuery(
    api.private.aiConversations.getMany,
    { searchQuery: normalizedSearchQuery || undefined },
    { initialNumItems: 12 }
  )

  const summary = useMemo(() => {
    const items = conversations.results

    return {
      total: items.length,
      live: items.filter((conversation) => !conversation.endedAt).length,
      ended: items.filter((conversation) => conversation.endedAt).length,
    }
  }, [conversations.results])

  const filteredConversations = useMemo(() => {
    return conversations.results.filter((conversation) => {
      if (sessionFilter === "live" && conversation.endedAt) {
        return false
      }

      if (sessionFilter === "ended" && !conversation.endedAt) {
        return false
      }

      return true
    })
  }, [conversations.results, sessionFilter])

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
  const hasActiveFilters = sessionFilter !== "all"

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

  const handleDownloadConversation = async (
    conversationId: Id<"aiVoiceConversations">,
    label: string
  ) => {
    try {
      setDownloadingConversationId(conversationId)
      const exportPayload = await convex.query(
        api.private.aiConversations.exportOne,
        { conversationId }
      )

      downloadConversationExport(exportPayload, label)
      toast.success("AI voicechat downloaded")
    } catch {
      toast.error("Failed to download AI voicechat")
    } finally {
      setDownloadingConversationId(null)
    }
  }

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) {
      return
    }

    try {
      setIsDeletingConversation(true)
      await deleteConversation({ conversationId: conversationToDelete.id })

      if (pathname === `/ai-conversations/${conversationToDelete.id}`) {
        router.push("/ai-conversations")
      }

      toast.success("AI voicechat deleted")
      setConversationToDelete(null)
    } catch {
      toast.error("Failed to delete AI voicechat")
    } finally {
      setIsDeletingConversation(false)
    }
  }

  return (
    <div className="console-card flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--console-hairline-soft)] px-3.5 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="console-eyebrow">Voice inbox</p>
            <h2 className="console-section-title mt-1.5 truncate text-[0.95rem]">
              AI voicechats
            </h2>
          </div>

          <span className="flex shrink-0 items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className={cn(
                "console-dot",
                summary.live ? "console-tone-positive" : "console-tone-neutral"
              )}
            />
            <span className="console-numeral text-xs">{summary.live}</span>
            <span className="text-muted-foreground">live</span>
          </span>
        </div>

        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search AI voicechats"
            className="console-inset h-9 rounded-[10px] pr-14 pl-9 text-sm shadow-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
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
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
                <span className="sr-only">Clear search</span>
              </Button>
            ) : (
              <Kbd className="hidden text-[10px] md:inline-flex">
                ⌘K
              </Kbd>
            )}
          </div>
        </div>

        <div className="console-segment mt-3 flex gap-1">
          {SESSION_FILTER_OPTIONS.map((option) => {
            const isActive = sessionFilter === option.value
            const count =
              option.value === "live"
                ? summary.live
                : option.value === "ended"
                  ? summary.ended
                  : summary.total

            return (
              <button
                className={cn(
                  "console-segment-item flex flex-1 items-center justify-center gap-1.5 border border-transparent px-2 py-1 text-[0.72rem] font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
                data-active={isActive || undefined}
                key={option.value}
                onClick={() => setSessionFilter(option.value)}
                type="button"
              >
                {option.label}
                <span className="console-numeral text-[0.68rem] text-muted-foreground">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {isLoadingFirstPage ? (
        <SkeletonAIConversations />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-2 sm:p-2.5">
            {!conversations.results.length && !normalizedSearchQuery ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <span className="console-medallion size-12">
                  <BotIcon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No AI voicechats yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    OpenAI realtime and Gemini live transcripts will appear
                    here.
                  </p>
                </div>
              </div>
            ) : !hasSearchResults &&
              (normalizedSearchQuery || hasActiveFilters) ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <span className="console-medallion size-12">
                  <BotIcon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No results found
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a wider search or reset the filters.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSearchQuery("")
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
                      <p className="console-eyebrow shrink-0">{group.label}</p>
                      <div className="console-rule flex-1" />
                      <span className="console-numeral text-[0.66rem] text-muted-foreground/70">
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
                        const providerLabel = getProviderLabel(
                          conversation.provider
                        )
                        const providerBadgeClassName =
                          getProviderBadgeClassName(conversation.provider)
                        const unreadCount =
                          conversation.unreadForOperatorCount ?? 0

                        const visitorLabel = getVisitorLabel(conversation)

                        return (
                          <ContextMenu key={conversation._id}>
                            <ContextMenuTrigger asChild>
                              <Link
                                className={cn(
                                  "group relative block rounded-[10px] border px-3 py-2.5 transition-colors duration-200",
                                  isActive
                                    ? "border-[var(--console-hairline)] bg-muted/55"
                                    : "border-transparent hover:bg-muted/35"
                                )}
                                href={`/ai-conversations/${conversation._id}`}
                              >
                                <div
                                  className={cn(
                                    "absolute top-2.5 bottom-2.5 -left-px w-0.5 rounded-r-full bg-foreground transition-opacity",
                                    isActive
                                      ? "opacity-100"
                                      : "opacity-0 group-hover:opacity-25"
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
                                        <p className="truncate text-[0.8rem] leading-snug font-medium text-foreground">
                                          {highlightMatch(
                                            visitorLabel,
                                            normalizedSearchQuery
                                          )}
                                        </p>
                                        <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                                          {highlightMatch(
                                            getVisitorDetail(conversation),
                                            normalizedSearchQuery
                                          )}
                                        </p>
                                      </div>

                                      <span className="console-numeral shrink-0 text-[0.66rem] text-muted-foreground/70">
                                        {formatConversationTime(
                                          conversation.lastActivityAt
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-1.5 line-clamp-2 text-[0.72rem] leading-relaxed text-muted-foreground">
                                      {highlightMatch(
                                        conversation.searchMatchPreview ??
                                          conversation.lastMessagePreview,
                                        normalizedSearchQuery
                                      )}
                                    </p>

                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                      <Badge
                                        className={cn(
                                          "h-5 rounded-full border px-2 text-[0.66rem] font-medium",
                                          providerBadgeClassName
                                        )}
                                        variant="outline"
                                      >
                                        {providerLabel}
                                      </Badge>
                                      <span
                                        className={cn(
                                          "console-tone-wash flex h-5 items-center gap-1.5 rounded-full border px-2 text-[0.66rem] font-medium",
                                          conversation.endedAt
                                            ? "console-tone-neutral"
                                            : "console-tone-positive"
                                        )}
                                      >
                                        <CircleIcon className="size-1.5 fill-current" />
                                        <span className="text-foreground/80">
                                          {conversation.endedAt
                                            ? "Ended"
                                            : "Live"}
                                        </span>
                                      </span>
                                      {unreadCount > 0 ? (
                                        <span className="console-numeral console-tone-critical console-tone-wash flex h-5 items-center rounded-full border px-2 text-[0.66rem]">
                                          {unreadCount > 99
                                            ? "99+"
                                            : unreadCount}{" "}
                                          new
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48">
                              <ContextMenuItem
                                disabled={
                                  downloadingConversationId === conversation._id
                                }
                                onSelect={() => {
                                  void handleDownloadConversation(
                                    conversation._id,
                                    visitorLabel
                                  )
                                }}
                              >
                                <DownloadIcon className="size-4" />
                                <span>
                                  {downloadingConversationId ===
                                  conversation._id
                                    ? "Downloading..."
                                    : "Download"}
                                </span>
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onSelect={() =>
                                  setConversationToDelete({
                                    id: conversation._id,
                                    label: visitorLabel,
                                  })
                                }
                                variant="destructive"
                              >
                                <Trash2Icon className="size-4" />
                                <span>Delete from database</span>
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasSearchResults ? (
              <InfiniteScrollTrigger
                canLoadMore={canLoadMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
                ref={topElementRef}
              />
            ) : null}
          </div>
        </ScrollArea>
      )}
      <AlertDialog
        open={!!conversationToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingConversation) {
            setConversationToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI voicechat?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{conversationToDelete?.label ?? "this voicechat"}"
              and its transcript from the database. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConversation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingConversation}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteConversation()
              }}
              variant="destructive"
            >
              {isDeletingConversation ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
