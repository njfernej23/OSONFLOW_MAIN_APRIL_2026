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
  SearchIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@workspace/backend/_generated/api"
import type { Doc } from "@workspace/backend/_generated/dataModel"
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
import { cn } from "@workspace/ui/lib/utils"

const CUSTOMER_MEMORY_EXPORT_LIMIT = 5000

type CustomerMemory = Doc<"customerMemories">
type CsvValue = string | number | null | undefined
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

const formatCsvTimestamp = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""

const escapeCsvCell = (value: CsvValue) => {
  const raw = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw

  return `"${safe.replaceAll('"', '""')}"`
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

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
}

const SectionHeader = ({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) => (
  <div className="flex items-start justify-between gap-3 sm:gap-4">
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
    <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
      <Icon className="size-4" />
    </div>
  </div>
)

const StatTile = ({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string | number
  tone?: "default" | "green" | "amber" | "blue"
}) => {
  const valueClass = {
    default: "text-foreground",
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    blue: "text-sky-700 dark:text-sky-300",
  }[tone]

  return (
    <div className="surface-panel rounded-xl p-3.5 sm:p-4">
      <p className="text-[11px] font-medium text-muted-foreground uppercase sm:text-xs">
        {label}
      </p>
      <p className={cn("mt-2 text-xl font-semibold sm:text-2xl", valueClass)}>
        {value}
      </p>
    </div>
  )
}

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <section className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/58 p-8 text-center">
    <div className="max-w-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <BrainIcon className="size-5" />
      </div>
      {children}
    </div>
  </section>
)

const MemoryCard = ({ memory }: { memory: CustomerMemory }) => {
  const hasEscalations = memory.totalEscalations > 0
  const resolvedRate =
    memory.totalConversations > 0
      ? Math.round((memory.totalResolved / memory.totalConversations) * 100)
      : 0

  return (
    <article className="surface-panel min-w-0 overflow-hidden rounded-xl">
      <div className="border-b border-border/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRoundIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {memory.name || "Unknown customer"}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <MailIcon className="size-3.5 shrink-0" />
                <span className="truncate">{memory.email}</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
            <Badge variant="secondary">
              {memory.totalConversations} conversations
            </Badge>
            <Badge variant={hasEscalations ? "destructive" : "outline"}>
              {hasEscalations
                ? `${memory.totalEscalations} escalated`
                : "No escalations"}
            </Badge>
            {memory.preferredLanguage ? (
              <Badge variant="outline" className="gap-1">
                <LanguagesIcon className="size-3" />
                {memory.preferredLanguage}
              </Badge>
            ) : null}
          </div>
        </div>

        <p className="mt-4 break-words text-sm leading-relaxed text-foreground">
          {memory.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {memory.recentIntents.slice(0, 5).map((intent) => (
            <Badge key={intent} variant="outline">
              {formatIntent(intent)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-0">
        <div className="min-w-0 border-b border-border/70 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Notable facts
            </p>
            <Badge variant="ghost">{memory.notableFacts.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {memory.notableFacts.length ? (
              memory.notableFacts.slice(0, 4).map((fact) => (
                <p
                  key={fact}
                  className="rounded-lg bg-muted/45 px-3 py-2 text-xs leading-relaxed break-words text-foreground"
                >
                  {fact}
                </p>
              ))
            ) : (
              <p className="rounded-lg bg-muted/25 px-3 py-6 text-center text-xs text-muted-foreground">
                No facts captured yet.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
              <HistoryIcon className="size-3.5" />
              Recent history
            </p>
            <Badge variant="ghost" className="w-fit shrink-0">
              Last seen {formatDate(memory.lastSeenAt)}
            </Badge>
          </div>
          <div className="mt-3 space-y-2">
            {memory.issueHistory.length ? (
              memory.issueHistory.slice(0, 4).map((item) => (
                <div
                  key={`${item.at}-${item.summary}`}
                  className="min-w-0 rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                >
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <Badge variant="secondary" className="min-w-0 max-w-full">
                      {formatIntent(item.intent)}
                    </Badge>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDate(item.at)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed break-words text-foreground">
                    {item.summary}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                No issue history yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border/70 bg-muted/18 px-4 py-3 sm:px-5">
        <Badge variant="outline">{memory.totalResolved} resolved</Badge>
        <Badge variant="outline">{resolvedRate}% resolution rate</Badge>
        <Badge variant="ghost">Updated {formatDate(memory.updatedAt)}</Badge>
      </div>
    </article>
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
      const blob = new Blob(["\uFEFF", csv], {
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
    return (
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-2xl" />
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
                  <BrainIcon className="size-4" />
                </span>
                <span className="font-medium">
                  Memory-rich customer support
                </span>
                <span className="hidden text-muted-foreground/50 sm:inline">
                  /
                </span>
                <span>{filteredMemories.length} customer records</span>
              </div>
              <h1 className="mt-3 text-xl font-semibold text-foreground sm:text-3xl">
                Customer memory
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Give operators fast context on who the customer is, what they
                care about, and what happened recently.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search customers, intents, or notes"
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
          <StatTile label="Customers" value={filteredMemories.length} />
          <StatTile
            label="Conversations"
            value={totalConversations}
            tone="blue"
          />
          <StatTile label="Recent" value={recentCount} tone="green" />
          <StatTile
            label="Escalations"
            value={totalEscalations}
            tone={totalEscalations ? "amber" : "default"}
          />
        </section>

        <Tabs
          className="min-w-0 gap-3"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as MemoryTab)}
        >
          <div className="surface-panel overflow-x-auto overflow-y-hidden rounded-xl p-1.5">
            <TabsList className="flex h-auto min-w-max gap-1 bg-transparent p-0 md:grid md:w-full md:min-w-0 md:grid-cols-4">
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="all"
              >
                <ListFilterIcon data-icon="inline-start" />
                All
                <Badge variant="secondary">{filteredMemories.length}</Badge>
              </TabsTrigger>
              <TabsTrigger
                className="h-10 min-w-[9rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="attention"
              >
                <AlertTriangleIcon data-icon="inline-start" />
                Attention
                <Badge variant={attentionCount ? "destructive" : "secondary"}>
                  {attentionCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="recent"
              >
                <Clock3Icon data-icon="inline-start" />
                Recent
                <Badge variant="secondary">{recentCount}</Badge>
              </TabsTrigger>
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="resolved"
              >
                <CheckCircle2Icon data-icon="inline-start" />
                Resolved
                <Badge variant="secondary">{resolvedCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="min-w-0" value={activeTab}>
            <SectionHeader
              title={
                activeTab === "all"
                  ? "All customer memories"
                  : activeTab === "attention"
                    ? "Needs attention"
                    : activeTab === "recent"
                      ? "Recently active customers"
                      : "Resolved-heavy customers"
              }
              description={
                activeTab === "all"
                  ? "Browse the customer context your AI has learned from support conversations."
                  : activeTab === "attention"
                    ? "Records with escalations stay visible so the team can prepare before replying."
                    : activeTab === "recent"
                      ? "Customers seen in the last 30 days, useful for live inbox work."
                      : "Customers whose recent history is mostly resolved, useful for pattern review."
              }
              icon={SparklesIcon}
            />

            {tabbedMemories.length ? (
              <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
                {tabbedMemories.map((memory) => (
                  <MemoryCard key={memory._id} memory={memory} />
                ))}
              </section>
            ) : (
              <div className="mt-4">
                <EmptyState>
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    No customer memory found
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Try another tab or search term. New memories will build
                    automatically from chat and voice conversations.
                  </p>
                </EmptyState>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
