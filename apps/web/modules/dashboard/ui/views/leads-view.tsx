"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useConvex, usePaginatedQuery, useQuery } from "convex/react"
import {
  ArrowUpRightIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  LinkIcon,
  MailIcon,
  MessagesSquareIcon,
  PhoneIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatCsvTimestamp,
  stringifyCsvRows,
} from "../lib/conversation-export"
import {
  ConsoleHeader,
  ConsoleMeta,
  ConsolePage,
  ConsoleSearch,
  ConsoleSkeleton,
  consoleTabsListClass,
  consoleTabsTriggerClass,
  EmptyState,
  Panel,
  PanelHeader,
  Pill,
  Stat,
  StatGrid,
  TabCount,
  type ConsoleTone,
} from "../components/console"

const LEADS_EXPORT_LIMIT = 5000

type LeadTab = "all" | "newcomers" | "with_chats"

type LeadRecord = {
  contactSessionId: Id<"contactSessions">
  name: string
  email: string
  channel: string
  phone?: string
  socialHandle?: string
  referrer?: string
  currentUrl?: string
  timezone?: string
  language?: string
  firstSeenAt: number
  conversationCount: number
  latestConversationId?: Id<"conversations">
  isNewcomer: boolean
}

const CHANNEL_TONES: Record<string, ConsoleTone> = {
  Widget: "accent",
  Voice: "info",
  Telegram: "info",
  WhatsApp: "positive",
  Instagram: "critical",
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp)

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp)

const initialsOf = (name: string, email: string) => {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/[\s@._-]+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

const buildLeadsCsv = (leads: LeadRecord[]) => {
  const rows = [
    [
      "Name",
      "Email",
      "Channel",
      "Phone",
      "Social Handle",
      "Referrer",
      "Page URL",
      "Timezone",
      "Language",
      "First Seen At",
      "Conversation Count",
      "Latest Conversation ID",
      "Is Newcomer",
    ],
    ...leads.map((lead) => [
      lead.name,
      lead.email,
      lead.channel,
      lead.phone ?? "",
      lead.socialHandle ?? "",
      lead.referrer ?? "",
      lead.currentUrl ?? "",
      lead.timezone ?? "",
      lead.language ?? "",
      formatCsvTimestamp(lead.firstSeenAt),
      lead.conversationCount,
      lead.latestConversationId ?? "",
      lead.isNewcomer ? "yes" : "no",
    ]),
  ]

  return stringifyCsvRows(rows)
}

/** Hairline bar showing how leads split across the connected channels. */
const ChannelSplit = ({
  counts,
  total,
}: {
  counts: Record<string, number>
  total: number
}) => {
  const segments = useMemo(
    () =>
      (
        [
          ["Widget", "widget", "console-series-1"],
          ["Voice", "voice", "console-series-2"],
          ["Telegram", "telegram", "console-series-3"],
          ["WhatsApp", "whatsapp", "console-series-4"],
          ["Instagram", "instagram", "console-series-5"],
          ["Other", "web", "console-series-6"],
        ] as const
      )
        .map(([label, key, series]) => ({
          label,
          series,
          count: counts[key] ?? 0,
        }))
        .filter((segment) => segment.count > 0),
    [counts]
  )

  if (!segments.length) {
    return null
  }

  return (
    <Panel>
      <PanelHeader
        description="Where the people in this list first reached you."
        icon={GlobeIcon}
        title="Channel mix"
      />
      <div className="px-4 py-4 sm:px-5">
        <div className="console-stack w-full">
          {segments.map((segment) => (
            <div
              className={segment.series}
              key={segment.label}
              style={{ width: `${(segment.count / total) * 100}%` }}
              title={`${segment.label}: ${segment.count}`}
            />
          ))}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
          {segments.map((segment) => (
            <span
              className="flex items-center gap-2 text-xs"
              key={segment.label}
            >
              <span aria-hidden className={cn("console-dot", segment.series)} />
              <span className="text-muted-foreground">{segment.label}</span>
              <span className="console-numeral text-xs">{segment.count}</span>
            </span>
          ))}
        </div>
      </div>
    </Panel>
  )
}

/** One template for the header and every row, so columns cannot drift apart. */
const LEAD_COLUMNS =
  "md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"

const LeadTableHead = () => (
  <div
    className={cn(
      "hidden border-b border-[var(--console-hairline-soft)] px-4 py-2.5 sm:px-5 md:grid md:items-center md:gap-4",
      LEAD_COLUMNS
    )}
  >
    <span className="console-label">Lead</span>
    <span className="console-label">Channel</span>
    <span className="console-label">Activity</span>
    <span className="console-label text-right">Chat</span>
  </div>
)

const LeadRow = ({ lead }: { lead: LeadRecord }) => {
  const contactLine = lead.socialHandle ?? lead.phone
  const sourceLine = lead.currentUrl ?? lead.referrer

  return (
    <article
      className={cn(
        "console-row grid grid-cols-1 gap-3 border-b border-[var(--console-hairline-soft)] px-4 py-3.5 last:border-b-0 sm:px-5 md:items-center md:gap-4",
        LEAD_COLUMNS
      )}
    >
      {/* identity */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="console-medallion console-numeral size-9 shrink-0 text-[0.7rem]">
          {initialsOf(lead.name, lead.email)}
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">
              {lead.name || "Unnamed visitor"}
            </h3>
            {lead.isNewcomer ? (
              <span
                aria-label="Newcomer"
                className="console-dot console-tone-positive shrink-0"
              />
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <MailIcon className="size-3 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        </div>
      </div>

      {/* channel + contact */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Pill tone={CHANNEL_TONES[lead.channel] ?? "neutral"}>
          {lead.channel}
        </Pill>
        {contactLine ? (
          <Pill icon={lead.phone ? PhoneIcon : LinkIcon}>{contactLine}</Pill>
        ) : null}
      </div>

      {/* activity */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs text-foreground">
          <MessagesSquareIcon className="size-3 shrink-0 text-muted-foreground" />
          <span className="console-numeral text-xs">
            {lead.conversationCount}
          </span>
          <span className="text-muted-foreground">
            {lead.conversationCount === 1 ? "chat" : "chats"}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3 shrink-0" />
          <span className="truncate">
            {formatDate(lead.firstSeenAt)} · {formatTime(lead.firstSeenAt)}
          </span>
        </span>
      </div>

      {/* action */}
      <div className="flex shrink-0 items-center justify-start md:justify-end">
        {lead.latestConversationId ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/conversations/${lead.latestConversationId}`}>
              Open
              <ArrowUpRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <span className="px-2 text-xs text-muted-foreground/70">
            No chat yet
          </span>
        )}
      </div>

      {sourceLine ? (
        <p className="col-span-full truncate text-[0.7rem] text-muted-foreground/70">
          {sourceLine}
        </p>
      ) : null}
    </article>
  )
}

export const LeadsView = () => {
  const convex = useConvex()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<LeadTab>("all")
  const [isExporting, setIsExporting] = useState(false)

  const normalizedSearchQuery = searchQuery.trim()
  const newcomersOnly = activeTab === "newcomers"
  const withChatsOnly = activeTab === "with_chats"

  const summary = useQuery(api.private.leads.getSummary, {})
  const leads = usePaginatedQuery(
    api.private.leads.getMany,
    {
      searchQuery: normalizedSearchQuery || undefined,
      newcomersOnly: newcomersOnly || undefined,
      withChatsOnly: withChatsOnly || undefined,
    },
    { initialNumItems: 25 }
  )

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
    isLoadingFirstPage,
  } = useInfiniteScroll({
    status: leads.status,
    loadMore: leads.loadMore,
    loadSize: 25,
  })

  const visibleLeads = leads.results

  const handleDownloadCsv = async () => {
    setIsExporting(true)

    try {
      const exportLeads = await convex.query(api.private.leads.getForExport, {
        searchQuery: normalizedSearchQuery || undefined,
        newcomersOnly: newcomersOnly || undefined,
        withChatsOnly: withChatsOnly || undefined,
        limit: LEADS_EXPORT_LIMIT,
      })

      if (!exportLeads.length) {
        toast.info("No leads to export")
        return
      }

      const csv = buildLeadsCsv(exportLeads)
      const blob = new Blob(["﻿", csv], {
        type: "text/csv;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = url
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${exportLeads.length} leads`)
    } catch {
      toast.error("Failed to export leads")
    } finally {
      setIsExporting(false)
    }
  }

  if (summary === undefined || leads.results === undefined) {
    return <ConsoleSkeleton />
  }

  const engagementRate = summary.totalLeads
    ? Math.round((summary.withConversationsCount / summary.totalLeads) * 100)
    : 0

  return (
    <ConsolePage>
      <ConsoleHeader
        actions={
          <>
            <ConsoleSearch
              className="w-full sm:w-72"
              onChange={setSearchQuery}
              placeholder="Search name, email, channel, page"
              value={searchQuery}
            />
            <Button
              disabled={isExporting}
              onClick={handleDownloadCsv}
              variant="outline"
            >
              <DownloadIcon data-icon="inline-start" />
              {isExporting ? "Exporting…" : "Export CSV"}
            </Button>
          </>
        }
        description="Everyone who shared contact details through your widget, voice line, or a connected messaging channel — ready for follow-up."
        eyebrow="Customer support"
        icon={UserPlusIcon}
        meta={
          <>
            <ConsoleMeta label="Captured" value={summary.totalLeads} />
            <ConsoleMeta
              dot
              label="New this week"
              tone="positive"
              value={summary.newcomerCount}
            />
            <ConsoleMeta label="Engaged" value={`${engagementRate}%`} />
          </>
        }
        title="Leads"
      />

      <StatGrid>
        <Stat
          hint="Unique contacts captured across every channel"
          icon={UsersIcon}
          label="Total leads"
          value={summary.totalLeads}
        />
        <Stat
          hint="First seen in the last 7 days"
          icon={SparklesIcon}
          label="Newcomers"
          tone="positive"
          value={summary.newcomerCount}
        />
        <Stat
          hint={`${engagementRate}% of all captured leads`}
          icon={MessagesSquareIcon}
          label="Started a chat"
          progress={engagementRate}
          tone="info"
          value={summary.withConversationsCount}
        />
        <Stat
          hint="Captured by the on-site chat widget"
          icon={GlobeIcon}
          label="Widget leads"
          tone="accent"
          value={summary.channelCounts.widget}
        />
      </StatGrid>

      {summary.totalLeads > 0 ? (
        <ChannelSplit
          counts={summary.channelCounts}
          total={summary.totalLeads}
        />
      ) : null}

      <Tabs
        onValueChange={(value) => setActiveTab(value as LeadTab)}
        value={activeTab}
      >
        <TabsList className={consoleTabsListClass}>
          <TabsTrigger className={consoleTabsTriggerClass} value="all">
            <UsersIcon />
            All leads
            <TabCount>{summary.totalLeads}</TabCount>
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="newcomers">
            <SparklesIcon />
            Newcomers
            <TabCount tone={summary.newcomerCount ? "positive" : "neutral"}>
              {summary.newcomerCount}
            </TabCount>
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="with_chats">
            <MessagesSquareIcon />
            With chats
            <TabCount>{summary.withConversationsCount}</TabCount>
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-1" value={activeTab}>
          <Panel>
            <PanelHeader
              actions={
                <Pill>
                  {visibleLeads.length}
                  {canLoadMore ? "+" : ""} shown
                </Pill>
              }
              description={
                normalizedSearchQuery
                  ? `Matching “${normalizedSearchQuery}”`
                  : "Sorted by most recently captured."
              }
              title={
                activeTab === "newcomers"
                  ? "Newcomers"
                  : activeTab === "with_chats"
                    ? "Leads with conversations"
                    : "All leads"
              }
            />

            {visibleLeads.length === 0 && !isLoadingFirstPage ? (
              <EmptyState
                description={
                  normalizedSearchQuery
                    ? "No lead matches that search. Try a different name, email, or channel."
                    : "Leads appear here as soon as visitors share contact details in your chat widget or a connected channel."
                }
                icon={UserPlusIcon}
                title="No leads yet"
              />
            ) : (
              <div>
                <LeadTableHead />
                {visibleLeads.map((lead) => (
                  <LeadRow key={lead.contactSessionId} lead={lead} />
                ))}
              </div>
            )}

            <InfiniteScrollTrigger
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              ref={topElementRef}
            />
          </Panel>
        </TabsContent>
      </Tabs>
    </ConsolePage>
  )
}
