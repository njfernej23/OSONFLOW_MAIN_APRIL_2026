"use client"

import { useMemo, useState } from "react"
import { useConvex, useQuery } from "convex/react"
import {
  AlertTriangleIcon,
  BrainIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DownloadIcon,
  HistoryIcon,
  LanguagesIcon,
  ListFilterIcon,
  MailIcon,
  MessagesSquareIcon,
  QuoteIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@workspace/backend/_generated/api"
import type { Doc } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
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
  Meter,
  Panel,
  Pill,
  Stat,
  StatGrid,
  TabCount,
} from "../components/console"

const CUSTOMER_MEMORY_EXPORT_LIMIT = 5000

type CustomerMemory = Doc<"customerMemories">
type MemoryTab = "all" | "attention" | "recent" | "resolved"

const formatIntent = (intent: string) =>
  intent
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp)

const isRecentlySeen = (timestamp: number) =>
  Date.now() - timestamp <= 30 * 24 * 60 * 60 * 1000

const initialsOf = (name: string | undefined, email: string) => {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/[\s@._-]+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

const joinList = (items: string[]) => items.filter(Boolean).join("; ")

const formatIssueHistoryForCsv = (memory: CustomerMemory) =>
  memory.issueHistory
    .map((item) =>
      [
        formatCsvTimestamp(item.at),
        item.channel,
        formatIntent(item.intent),
        item.status,
        item.summary,
      ]
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n")

const buildCustomerMemoryCsv = (memories: CustomerMemory[]) => {
  const rows = [
    [
      "Customer ID",
      "Email",
      "Name",
      "Summary",
      "Preferred Language",
      "Recent Intents",
      "Notable Facts",
      "Issue History",
      "Total Conversations",
      "Total Resolved",
      "Total Escalations",
      "Last Seen At",
      "Updated At",
    ],
    ...memories.map((memory) => [
      memory._id,
      memory.email,
      memory.name,
      memory.summary,
      memory.preferredLanguage,
      joinList(memory.recentIntents.map(formatIntent)),
      joinList(memory.notableFacts),
      formatIssueHistoryForCsv(memory),
      memory.totalConversations,
      memory.totalResolved,
      memory.totalEscalations,
      formatCsvTimestamp(memory.lastSeenAt),
      formatCsvTimestamp(memory.updatedAt),
    ]),
  ]

  return stringifyCsvRows(rows)
}

const MemoryCard = ({ memory }: { memory: CustomerMemory }) => {
  const hasEscalations = memory.totalEscalations > 0
  const resolvedRate =
    memory.totalConversations > 0
      ? Math.round((memory.totalResolved / memory.totalConversations) * 100)
      : 0

  return (
    <Panel className="console-interactive flex flex-col">
      {/* identity */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="console-medallion console-numeral size-10 shrink-0 text-xs">
            {initialsOf(memory.name, memory.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {memory.name || "Unknown customer"}
            </p>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <MailIcon className="size-3 shrink-0" />
              <span className="truncate">{memory.email}</span>
            </p>
          </div>
        </div>
        {hasEscalations ? (
          <Pill icon={AlertTriangleIcon} tone="critical">
            {memory.totalEscalations}
          </Pill>
        ) : null}
      </div>

      {/* summary */}
      <div className="px-4 pt-4 sm:px-5">
        <p className="border-l-2 border-[var(--console-hairline)] pl-3 text-sm leading-relaxed break-words text-foreground/90">
          {memory.summary}
        </p>
      </div>

      {/* intents */}
      {memory.recentIntents.length ? (
        <div className="flex flex-wrap gap-1.5 px-4 pt-4 sm:px-5">
          {memory.recentIntents.slice(0, 4).map((intent) => (
            <Pill key={intent} tone="info">
              {formatIntent(intent)}
            </Pill>
          ))}
        </div>
      ) : null}

      {/* facts + history */}
      <div className="mt-4 grid flex-1 gap-px border-y border-[var(--console-hairline-soft)] bg-[var(--console-hairline-soft)] sm:grid-cols-2">
        <div className="min-w-0 bg-card px-4 py-3.5 sm:px-5">
          <p className="console-label flex items-center gap-1.5">
            <QuoteIcon className="size-3" />
            Notable facts
          </p>
          <div className="mt-2.5 space-y-1.5">
            {memory.notableFacts.length ? (
              memory.notableFacts.slice(0, 3).map((fact) => (
                <p
                  className="console-inset px-2.5 py-1.5 text-xs leading-relaxed break-words text-foreground/90"
                  key={fact}
                >
                  {fact}
                </p>
              ))
            ) : (
              <p className="py-3 text-xs text-muted-foreground/70">
                Nothing captured yet.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 bg-card px-4 py-3.5 sm:px-5">
          <p className="console-label flex items-center gap-1.5">
            <HistoryIcon className="size-3" />
            Recent history
          </p>
          <div className="mt-2.5 space-y-1.5">
            {memory.issueHistory.length ? (
              memory.issueHistory.slice(0, 3).map((item) => (
                <div
                  className="console-inset px-2.5 py-1.5"
                  key={`${item.at}-${item.summary}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.72rem] font-medium text-foreground">
                      {formatIntent(item.intent)}
                    </span>
                    <span className="shrink-0 text-[0.68rem] text-muted-foreground">
                      {formatDate(item.at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed break-words text-muted-foreground">
                    {item.summary}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-3 text-xs text-muted-foreground/70">
                No issue history yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
        <span className="flex min-w-[7rem] flex-1 items-center gap-2.5">
          <span className="console-label shrink-0">Resolved</span>
          <Meter
            className="flex-1"
            tone={resolvedRate >= 60 ? "positive" : "warning"}
            value={resolvedRate}
          />
          <span className="console-numeral shrink-0 text-xs">
            {resolvedRate}%
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessagesSquareIcon className="size-3" />
          <span className="console-numeral text-xs">
            {memory.totalConversations}
          </span>
        </span>
        {memory.preferredLanguage ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LanguagesIcon className="size-3" />
            {memory.preferredLanguage}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground/70">
          Seen {formatDate(memory.lastSeenAt)}
        </span>
      </div>
    </Panel>
  )
}

export const CustomerMemoryView = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<MemoryTab>("all")
  const [isExporting, setIsExporting] = useState(false)
  const convex = useConvex()
  const memories = useQuery(api.private.customerMemories.getMany, {
    limit: 75,
  })

  const filteredMemories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!memories || !query) {
      return memories ?? []
    }

    return memories.filter((memory) => {
      const haystack = [
        memory.name,
        memory.email,
        memory.summary,
        memory.preferredLanguage,
        ...memory.recentIntents,
        ...memory.notableFacts,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [memories, searchQuery])

  const tabbedMemories = useMemo(() => {
    if (activeTab === "attention") {
      return filteredMemories.filter((memory) => memory.totalEscalations > 0)
    }

    if (activeTab === "recent") {
      return filteredMemories.filter((memory) =>
        isRecentlySeen(memory.lastSeenAt)
      )
    }

    if (activeTab === "resolved") {
      return filteredMemories.filter(
        (memory) =>
          memory.totalResolved > 0 &&
          memory.totalResolved >= memory.totalEscalations
      )
    }

    return filteredMemories
  }, [activeTab, filteredMemories])

  const attentionCount = filteredMemories.filter(
    (memory) => memory.totalEscalations > 0
  ).length
  const recentCount = filteredMemories.filter((memory) =>
    isRecentlySeen(memory.lastSeenAt)
  ).length
  const resolvedCount = filteredMemories.filter(
    (memory) =>
      memory.totalResolved > 0 &&
      memory.totalResolved >= memory.totalEscalations
  ).length
  const totalConversations = filteredMemories.reduce(
    (total, memory) => total + memory.totalConversations,
    0
  )
  const totalEscalations = filteredMemories.reduce(
    (total, memory) => total + memory.totalEscalations,
    0
  )

  const handleDownloadCsv = async () => {
    setIsExporting(true)

    try {
      const exportMemories = await convex.query(
        api.private.customerMemories.getForExport,
        {
          limit: CUSTOMER_MEMORY_EXPORT_LIMIT,
        }
      )

      if (!exportMemories.length) {
        toast.info("No customer memory to export")
        return
      }

      const csv = buildCustomerMemoryCsv(exportMemories)
      const blob = new Blob(["﻿", csv], {
        type: "text/csv;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = url
      link.download = `customer-memory-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${exportMemories.length} customer memories`)
    } catch {
      toast.error("Failed to export customer memory")
    } finally {
      setIsExporting(false)
    }
  }

  if (memories === undefined) {
    return <ConsoleSkeleton rows={2} />
  }

  const tabTitle =
    activeTab === "all"
      ? "All customer memories"
      : activeTab === "attention"
        ? "Needs attention"
        : activeTab === "recent"
          ? "Recently active"
          : "Resolved-heavy"

  const tabDescription =
    activeTab === "all"
      ? "Everything the AI has learned about your customers from chat and voice."
      : activeTab === "attention"
        ? "Records with escalations, so the team can prepare before replying."
        : activeTab === "recent"
          ? "Customers seen in the last 30 days — useful for live inbox work."
          : "Customers whose recent history is mostly resolved."

  return (
    <ConsolePage>
      <ConsoleHeader
        actions={
          <>
            <ConsoleSearch
              className="w-full sm:w-72"
              onChange={setSearchQuery}
              placeholder="Search customers, intents, or notes"
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
        description="Fast context on who the customer is, what they care about, and what happened the last time they got in touch."
        eyebrow="Context"
        icon={BrainIcon}
        meta={
          <>
            <ConsoleMeta label="Records" value={filteredMemories.length} />
            <ConsoleMeta
              dot
              label="Escalations"
              tone={totalEscalations ? "critical" : "positive"}
              value={totalEscalations}
            />
          </>
        }
        title="Customer memory"
      />

      <StatGrid>
        <Stat
          hint="Distinct people with a memory record"
          icon={UsersIcon}
          label="Customers"
          value={filteredMemories.length}
        />
        <Stat
          hint="Across every remembered customer"
          icon={MessagesSquareIcon}
          label="Conversations"
          tone="info"
          value={totalConversations}
        />
        <Stat
          hint="Seen in the last 30 days"
          icon={Clock3Icon}
          label="Recently active"
          tone="positive"
          value={recentCount}
        />
        <Stat
          hint="Handed to a human at least once"
          icon={AlertTriangleIcon}
          label="Escalations"
          tone={totalEscalations ? "critical" : "neutral"}
          value={totalEscalations}
        />
      </StatGrid>

      <Tabs
        onValueChange={(value) => setActiveTab(value as MemoryTab)}
        value={activeTab}
      >
        <TabsList className={consoleTabsListClass}>
          <TabsTrigger className={consoleTabsTriggerClass} value="all">
            <ListFilterIcon />
            All
            <TabCount>{filteredMemories.length}</TabCount>
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="attention">
            <AlertTriangleIcon />
            Attention
            <TabCount tone={attentionCount ? "critical" : "neutral"}>
              {attentionCount}
            </TabCount>
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="recent">
            <Clock3Icon />
            Recent
            <TabCount>{recentCount}</TabCount>
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="resolved">
            <CheckCircle2Icon />
            Resolved
            <TabCount>{resolvedCount}</TabCount>
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-1 min-w-0" value={activeTab}>
          <div className="mb-4">
            <h2 className="console-section-title">{tabTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {tabDescription}
            </p>
          </div>

          {tabbedMemories.length ? (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {tabbedMemories.map((memory) => (
                <MemoryCard key={memory._id} memory={memory} />
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState
                description="Try another tab or search term. Memories build automatically from chat and voice conversations."
                icon={BrainIcon}
                title="No customer memory found"
              />
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </ConsolePage>
  )
}
