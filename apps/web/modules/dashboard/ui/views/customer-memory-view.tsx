"use client"

import { useMemo, useState } from "react"
import { useConvex, useQuery } from "convex/react"
import {
  BrainIcon,
  DownloadIcon,
  HistoryIcon,
  LanguagesIcon,
  MailIcon,
  SearchIcon,
  UserRoundIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@workspace/backend/_generated/api"
import type { Doc } from "@workspace/backend/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"

const CUSTOMER_MEMORY_EXPORT_LIMIT = 5000

type CustomerMemory = Doc<"customerMemories">
type CsvValue = string | number | null | undefined

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

export const CustomerMemoryView = () => {
  const [searchQuery, setSearchQuery] = useState("")
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-2xl border border-border/70 bg-background/78 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BrainIcon className="size-4" />
                <span>Memory-rich customer support</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
                Customer memory
              </h1>
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
                className="shrink-0"
                disabled={isExporting}
                onClick={handleDownloadCsv}
                variant="outline"
              >
                <DownloadIcon data-icon="inline-start" />
                {isExporting ? "Exporting..." : "Download CSV"}
              </Button>
            </div>
          </div>
        </section>

        {filteredMemories.length ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {filteredMemories.map((memory) => (
              <article
                key={memory._id}
                className="rounded-2xl border border-border/70 bg-background/82 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserRoundIcon className="size-4" />
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {memory.totalConversations} conversations
                    </Badge>
                    {memory.preferredLanguage ? (
                      <Badge variant="outline" className="gap-1">
                        <LanguagesIcon className="size-3" />
                        {memory.preferredLanguage}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-foreground">
                  {memory.summary}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {memory.recentIntents.slice(0, 5).map((intent) => (
                    <Badge key={intent} variant="outline">
                      {formatIntent(intent)}
                    </Badge>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Notable facts
                    </p>
                    <div className="mt-2 space-y-2">
                      {memory.notableFacts.slice(0, 4).map((fact) => (
                        <p
                          key={fact}
                          className="rounded-xl bg-muted/45 px-3 py-2 text-xs leading-relaxed text-foreground"
                        >
                          {fact}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <HistoryIcon className="size-3.5" />
                      Recent history
                    </p>
                    <div className="mt-2 space-y-2">
                      {memory.issueHistory.slice(0, 4).map((item) => (
                        <div
                          key={`${item.at}-${item.summary}`}
                          className="rounded-xl border border-border/60 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary">
                              {formatIntent(item.intent)}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(item.at)}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground">
                            {item.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-border/70 pt-4">
                  <Badge variant="outline">
                    {memory.totalResolved} resolved
                  </Badge>
                  <Badge variant="outline">
                    {memory.totalEscalations} escalated
                  </Badge>
                  <Badge variant="ghost">
                    Last seen {formatDate(memory.lastSeenAt)}
                  </Badge>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/58 p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <BrainIcon className="size-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                No customer memory yet
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Memories will build automatically from new chat and voice
                conversations.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
