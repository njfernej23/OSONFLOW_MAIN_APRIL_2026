"use client"

import { useState } from "react"
import Link from "next/link"
import { useConvex, usePaginatedQuery, useQuery } from "convex/react"
import {
  DownloadIcon,
  ExternalLinkIcon,
  MailIcon,
  SearchIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { cn } from "@workspace/ui/lib/utils"

const LEADS_EXPORT_LIMIT = 5000

type LeadTab = "all" | "newcomers" | "with_chats"

type CsvValue = string | number | null | undefined

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

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp)

const formatCsvTimestamp = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""

const escapeCsvCell = (value: CsvValue) => {
  const raw = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw

  return `"${safe.replaceAll('"', '""')}"`
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

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
}

const StatTile = ({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string | number
  tone?: "default" | "green" | "blue"
}) => (
  <div className="surface-frosted rounded-[18px] px-4 py-3.5">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p
      className={cn(
        "mt-1 text-2xl font-semibold",
        tone === "green" && "text-emerald-600 dark:text-emerald-400",
        tone === "blue" && "text-sky-600 dark:text-sky-400"
      )}
    >
      {value}
    </p>
  </div>
)

const LeadRow = ({ lead }: { lead: LeadRecord }) => {
  const secondaryLine =
    lead.socialHandle ?? lead.phone ?? lead.referrer ?? lead.currentUrl

  return (
    <article className="surface-frosted rounded-[18px] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {lead.name}
            </h3>
            <Badge variant="outline">{lead.channel}</Badge>
            {lead.isNewcomer ? (
              <Badge className="bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/12 dark:text-emerald-300">
                Newcomer
              </Badge>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MailIcon className="size-3.5" />
              {lead.email}
            </span>
            {secondaryLine ? (
              <span className="truncate">{secondaryLine}</span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span>First seen {formatDate(lead.firstSeenAt)}</span>
            {lead.timezone ? <span>{lead.timezone}</span> : null}
            {lead.language ? <span>{lead.language}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {lead.conversationCount}{" "}
            {lead.conversationCount === 1 ? "chat" : "chats"}
          </Badge>
          {lead.latestConversationId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/conversations/${lead.latestConversationId}`}>
                Open chat
                <ExternalLinkIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
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
      const blob = new Blob(["\uFEFF", csv], {
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
    return (
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid min-w-0 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-3 sm:p-5">
      <div className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-4">
        <section className="surface-frosted rounded-[18px] px-3.5 py-4 sm:rounded-[22px] sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlusIcon className="size-4" />
                </span>
                <span className="font-medium">Chat signups and newcomers</span>
                <span className="hidden text-muted-foreground/50 sm:inline">
                  /
                </span>
                <span>{summary.totalLeads} leads captured</span>
              </div>
              <h1 className="mt-3 text-xl font-semibold text-foreground sm:text-3xl">
                Leads
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                See everyone who shared contact details through your widget,
                Telegram, WhatsApp, Instagram, or other chat channels. Download
                the list for follow-up.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, email, channel, or page"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <Button
                disabled={isExporting}
                onClick={handleDownloadCsv}
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
              >
                <DownloadIcon data-icon="inline-start" />
                {isExporting ? "Exporting..." : "Download CSV"}
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTile label="Total leads" value={summary.totalLeads} />
          <StatTile
            label="Newcomers (7d)"
            value={summary.newcomerCount}
            tone="green"
          />
          <StatTile
            label="Started a chat"
            value={summary.withConversationsCount}
            tone="blue"
          />
          <StatTile
            label="Widget leads"
            value={summary.channelCounts.widget}
          />
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as LeadTab)}
        >
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="all" className="gap-1.5">
              <UsersIcon className="size-3.5" />
              All leads
            </TabsTrigger>
            <TabsTrigger value="newcomers" className="gap-1.5">
              <SparklesIcon className="size-3.5" />
              Newcomers
              {summary.newcomerCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {summary.newcomerCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="with_chats" className="gap-1.5">
              With chats
              {summary.withConversationsCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {summary.withConversationsCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {visibleLeads.length === 0 && !isLoadingFirstPage ? (
              <div className="surface-frosted rounded-[18px] px-5 py-10 text-center">
                <UserPlusIcon className="mx-auto size-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  No leads yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Leads appear when visitors share contact details in your chat
                  widget or connected channels.
                </p>
              </div>
            ) : (
              visibleLeads.map((lead) => (
                <LeadRow key={lead.contactSessionId} lead={lead} />
              ))
            )}

            <InfiniteScrollTrigger
              ref={topElementRef}
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
