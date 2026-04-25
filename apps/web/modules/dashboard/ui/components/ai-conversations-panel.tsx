"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Kbd } from "@workspace/ui/components/kbd";
import { Badge } from "@workspace/ui/components/badge";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { api } from "@workspace/backend/_generated/api";
import { getCountryFlagUrl, getCountryFromTimezone } from "@/lib/country-utils";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format, isToday, isYesterday } from "date-fns";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { BotIcon, CircleIcon, SearchIcon, XIcon } from "lucide-react";
import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES,
  AI_CONVERSATION_PROVIDER_LABELS,
} from "../../constants";

type ProviderFilterValue = "all" | "openai_realtime" | "gemini_live";
type SessionFilterValue = "all" | "live" | "ended";

const PROVIDER_FILTER_OPTIONS: Array<{
  label: string;
  value: ProviderFilterValue;
}> = [
  { label: "All", value: "all" },
  { label: "OpenAI", value: "openai_realtime" },
  { label: "Gemini", value: "gemini_live" },
];

const SESSION_FILTER_OPTIONS: Array<{
  label: string;
  value: SessionFilterValue;
}> = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Ended", value: "ended" },
];

const highlightMatch = (value: string | undefined, query: string) => {
  if (!value) {
    return (
      <span className="italic text-muted-foreground/60">No transcript yet</span>
    );
  }

  if (!query) {
    return value;
  }

  const lowerValue = value.toLowerCase();
  const startIndex = lowerValue.indexOf(query);

  if (startIndex === -1) {
    return value;
  }

  const endIndex = startIndex + query.length;

  return (
    <>
      {value.slice(0, startIndex)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-current dark:bg-amber-800/50">
        {value.slice(startIndex, endIndex)}
      </mark>
      {value.slice(endIndex)}
    </>
  );
};

const formatConversationTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
};

const formatConversationDayLabel = (timestamp: number) => {
  const date = new Date(timestamp);

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";

  return format(date, "MMMM d");
};

export const AIConversationsPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] =
    useState<ProviderFilterValue>("all");
  const [sessionFilter, setSessionFilter] =
    useState<SessionFilterValue>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const router = useRouter();

  const conversations = usePaginatedQuery(
    api.private.aiConversations.getMany,
    {},
    { initialNumItems: 12 }
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const summary = useMemo(() => {
    const items = conversations.results;

    return {
      total: items.length,
      live: items.filter((conversation) => !conversation.endedAt).length,
    };
  }, [conversations.results]);

  const filteredConversations = useMemo(() => {
    return conversations.results.filter((conversation) => {
      if (
        providerFilter !== "all" &&
        conversation.provider !== providerFilter
      ) {
        return false;
      }

      if (sessionFilter === "live" && conversation.endedAt) {
        return false;
      }

      if (sessionFilter === "ended" && !conversation.endedAt) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
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
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [
    conversations.results,
    normalizedSearchQuery,
    providerFilter,
    sessionFilter,
  ]);

  const groupedConversations = useMemo(() => {
    const groups = new Map<string, typeof filteredConversations>();

    for (const conversation of filteredConversations) {
      const label = formatConversationDayLabel(conversation.lastActivityAt);
      const existing = groups.get(label);

      if (existing) {
        existing.push(conversation);
      } else {
        groups.set(label, [conversation]);
      }
    }

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [filteredConversations]);

  const firstMatchingConversation = filteredConversations[0];
  const hasSearchResults = filteredConversations.length > 0;
  const hasActiveFilters =
    providerFilter !== "all" || sessionFilter !== "all";

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
  });

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isFocusSearch =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (!isFocusSearch) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="shrink-0 border-b bg-background px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">
              AI Conversations
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {summary.total} transcripts
              {summary.total > 0 ? ` · ${summary.live} live` : ""}
            </p>
          </div>

          {conversations.results.length > 0 ? (
            <Badge
              className="h-7 rounded-full border px-2.5 text-[11px] font-medium"
              variant="outline"
            >
              {normalizedSearchQuery || hasActiveFilters
                ? `${filteredConversations.length} of ${conversations.results.length}`
                : `${conversations.results.length}`}
            </Badge>
          ) : null}
        </div>

        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search AI conversations"
            className="h-10 rounded-xl border bg-muted/35 pl-9 pr-14 text-sm shadow-none transition-all focus-visible:border-border focus-visible:bg-background focus-visible:ring-0"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && searchQuery) {
                event.preventDefault();
                setSearchQuery("");
                return;
              }

              if (event.key === "Enter" && firstMatchingConversation?._id) {
                event.preventDefault();
                router.push(`/ai-conversations/${firstMatchingConversation._id}`);
              }
            }}
            placeholder="Search transcripts, visitors, or providers"
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

        <div className="mt-3 flex flex-wrap gap-2">
          {PROVIDER_FILTER_OPTIONS.map((option) => {
            const isActive = providerFilter === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setProviderFilter(option.value)}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {SESSION_FILTER_OPTIONS.map((option) => {
            const isActive = sessionFilter === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setSessionFilter(option.value)}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingFirstPage ? (
        <SkeletonAIConversations />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3">
            {!conversations.results.length && !normalizedSearchQuery ? (
              <div className="mx-auto mt-10 flex max-w-[220px] flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/45">
                  <BotIcon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No AI conversations yet
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    OpenAI realtime and Gemini live transcripts will appear here.
                  </p>
                </div>
              </div>
            ) : !hasSearchResults && (normalizedSearchQuery || hasActiveFilters) ? (
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
                    setSearchQuery("");
                    setProviderFilter("all");
                    setSessionFilter("all");
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
                    <p className="px-2 text-[11px] font-medium text-muted-foreground">
                      {group.label}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {group.items.map((conversation) => {
                        const isActive =
                          pathname === `/ai-conversations/${conversation._id}`;
                        const country = getCountryFromTimezone(
                          conversation.contactSession?.metadata?.timezone
                        );
                        const countryFlagUrl = country?.code
                          ? getCountryFlagUrl(country.code)
                          : undefined;
                        const providerLabel =
                          AI_CONVERSATION_PROVIDER_LABELS[conversation.provider];
                        const providerBadgeClassName =
                          AI_CONVERSATION_PROVIDER_BADGE_CLASSNAMES[
                            conversation.provider
                          ];

                        return (
                          <Link
                            key={conversation._id}
                            className={cn(
                              "block rounded-2xl px-3 py-3 transition-colors",
                              isActive
                                ? "bg-muted ring-1 ring-border"
                                : "hover:bg-muted/50"
                            )}
                            href={`/ai-conversations/${conversation._id}`}
                          >
                            <div className="flex items-start gap-3">
                              <DicebearAvatar
                                seed={
                                  conversation.contactSession?._id ??
                                  conversation._id
                                }
                                size={40}
                                badgeImageUrl={countryFlagUrl}
                                className="shrink-0"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-[14px] font-medium text-foreground">
                                      {highlightMatch(
                                        conversation.contactSession?.name ??
                                          "Unknown visitor",
                                        normalizedSearchQuery
                                      )}
                                    </p>
                                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                                      {highlightMatch(
                                        conversation.contactSession?.email,
                                        normalizedSearchQuery
                                      )}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {formatConversationTime(
                                      conversation.lastActivityAt
                                    )}
                                  </span>
                                </div>

                                <p className="mt-2 line-clamp-2 text-[13px] text-foreground/80">
                                  {highlightMatch(
                                    conversation.lastMessagePreview,
                                    normalizedSearchQuery
                                  )}
                                </p>

                                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
                                      providerBadgeClassName
                                    )}
                                  >
                                    {providerLabel}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <CircleIcon
                                      className={cn(
                                        "size-2 fill-current",
                                        conversation.endedAt
                                          ? "text-muted-foreground/50"
                                          : "text-emerald-500"
                                      )}
                                    />
                                    {conversation.endedAt ? "Ended" : "Live"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
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
  );
};

const SkeletonAIConversations = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto p-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="flex items-start gap-3 rounded-2xl px-3 py-3"
          key={index}
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
