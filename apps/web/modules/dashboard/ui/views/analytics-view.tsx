"use client"

import { useState } from "react"
import { useConvex, useQuery } from "convex/react"
import {
  AlertCircleIcon,
  BarChart3Icon,
  BotIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DownloadIcon,
  HelpCircleIcon,
  MessageSquareIcon,
  SparklesIcon,
  TrendingUpIcon,
  UserRoundCheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@workspace/backend/_generated/api"
import { useLanguage } from "@/lib/i18n/language-provider"
import type { Doc } from "@workspace/backend/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"

const ANALYTICS_EXPORT_LIMIT = 5000

type ConversationInsight = Doc<"conversationInsights">
type CsvValue = string | number | boolean | null | undefined

const formatDuration = (ms: number | null) => {
  if (ms === null) {
    return "No human replies yet"
  }

  const minutes = Math.max(1, Math.round(ms / 60_000))

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

const formatIntent = (intent: string) =>
  intent
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const formatCsvTimestamp = (timestamp: number | null | undefined) =>
  typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : ""

const escapeCsvCell = (value: CsvValue) => {
  const raw = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw

  return `"${safe.replaceAll('"', '""')}"`
}

const stringifyCsvRows = (rows: CsvValue[][]) =>
  rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")

const insightToCsvRow = (insight: ConversationInsight) => [
  insight._id,
  insight.channel,
  insight.status,
  formatIntent(insight.intent),
  insight.sentiment,
  insight.urgency,
  insight.language,
  insight.summary,
  insight.isUnanswered,
  insight.unansweredQuestion,
  insight.wasResolved,
  insight.wasEscalated,
  insight.resolutionSource,
  insight.firstHumanResponseMs,
  insight.humanSavedMinutes,
  insight.conversationId,
  insight.aiVoiceConversationId,
  insight.contactSessionId,
  formatCsvTimestamp(insight.lastAnalyzedAt),
  formatCsvTimestamp(insight.updatedAt),
]

const MetricTile = ({
  title,
  value,
  caption,
  icon: Icon,
  detail,
  tone = "default",
}: {
  title: string
  value: string
  caption: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  detail?: React.ReactNode
  tone?: "default" | "green" | "amber" | "rose" | "blue"
}) => {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    blue: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  }[tone]

  return (
    <div className="surface-panel rounded-xl p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase sm:text-xs">
            {title}
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            toneClass
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      {detail ? <div className="mt-3">{detail}</div> : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {caption}
      </p>
    </div>
  )
}

const CountBar = ({
  label,
  count,
  max,
}: {
  label: string
  count: number
  max: number
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="truncate font-medium text-foreground">{label}</span>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {count}
      </span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-muted/80">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${max > 0 ? Math.max(6, (count / max) * 100) : 0}%` }}
      />
    </div>
  </div>
)

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

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
    {children}
  </div>
)

const RatioBar = ({
  value,
  tone = "primary",
}: {
  value: number
  tone?: "primary" | "green" | "rose" | "amber"
}) => {
  const toneClass = {
    primary: "bg-primary",
    green: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  }[tone]

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted/80">
      <div
        className={cn("h-full rounded-full", toneClass)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

const FieldPill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex min-h-7 max-w-full items-center justify-center rounded-lg border border-border/70 bg-background px-2.5 py-1 text-center text-xs leading-tight font-medium text-foreground">
    {children}
  </span>
)

export const AnalyticsView = () => {
  const { t } = useLanguage()
  const [isExporting, setIsExporting] = useState(false)
  const convex = useConvex()
  const overview = useQuery(api.private.analytics.getOverview, {
    windowDays: 30,
  })

  if (overview === undefined) {
    return (
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const maxIntentCount = Math.max(
    1,
    ...overview.topIntents.map((intent) => intent.count)
  )
  const maxQuestionCount = Math.max(
    1,
    ...overview.unansweredQuestions.map((question) => question.count)
  )
  const humanSavedHours = Math.floor(overview.humanSavedMinutes / 60)
  const humanSavedRemainder = overview.humanSavedMinutes % 60
  const savedTimeLabel = humanSavedHours
    ? `${humanSavedHours}h ${humanSavedRemainder}m`
    : `${overview.humanSavedMinutes}m`
  const answerRate = 100 - overview.unansweredRate
  const hasIssues = overview.unanswered > 0 || overview.escalated > 0

  const handleDownloadCsv = async () => {
    setIsExporting(true)

    try {
      const exportInsights = await convex.query(
        api.private.analytics.getInsightsForExport,
        {
          windowDays: overview.windowDays,
          limit: ANALYTICS_EXPORT_LIMIT,
        }
      )

      const rows: CsvValue[][] = [
        ["AI performance analytics"],
        ["Window Days", overview.windowDays],
        ["Exported At", new Date().toISOString()],
        [],
        ["Summary"],
        ["Metric", "Value"],
        ["Total Analyzed Conversations", overview.totalConversations],
        ["Resolved", overview.resolved],
        ["Escalated", overview.escalated],
        ["Unanswered", overview.unanswered],
        ["AI Resolution Rate", `${overview.resolutionRate}%`],
        ["Escalation Rate", `${overview.escalationRate}%`],
        ["Unanswered Rate", `${overview.unansweredRate}%`],
        [
          "Average Human Response",
          formatDuration(overview.averageHumanResponseMs),
        ],
        ["Average Human Response Ms", overview.averageHumanResponseMs],
        ["Human Time Saved Minutes", overview.humanSavedMinutes],
        [],
        ["Top Intents"],
        ["Intent", "Count"],
        ...overview.topIntents.map((intent) => [
          formatIntent(intent.label),
          intent.count,
        ]),
        [],
        ["Most Common Unanswered Questions"],
        ["Question", "Intent", "Count"],
        ...overview.unansweredQuestions.map((question) => [
          question.question,
          formatIntent(question.intent),
          question.count,
        ]),
        [],
        ["Voice vs Chat Resolution"],
        ["Channel", "Total", "Resolved", "Escalated", "Resolution Rate"],
        ...overview.channelMetrics.map((metric) => [
          metric.channel,
          metric.total,
          metric.resolved,
          metric.escalated,
          `${metric.resolutionRate}%`,
        ]),
        [],
        ["Recent Intelligence Export"],
        [
          "Insight ID",
          "Channel",
          "Status",
          "Intent",
          "Sentiment",
          "Urgency",
          "Language",
          "Summary",
          "Is Unanswered",
          "Unanswered Question",
          "Was Resolved",
          "Was Escalated",
          "Resolution Source",
          "First Human Response Ms",
          "Human Saved Minutes",
          "Conversation ID",
          "AI Voice Conversation ID",
          "Contact Session ID",
          "Last Analyzed At",
          "Updated At",
        ],
        ...exportInsights.map(insightToCsvRow),
      ]

      const blob = new Blob(["\uFEFF", stringifyCsvRows(rows)], {
        type: "text/csv;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = url
      link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success(`Exported analytics with ${exportInsights.length} insights`)
    } catch {
      toast.error("Failed to export analytics")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="h-full overflow-auto p-3 sm:p-5">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="surface-frosted rounded-[18px] px-3.5 py-4 sm:rounded-[22px] sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3Icon className="size-4" />
                </span>
                <span className="font-medium">
                  {t("Last")} {overview.windowDays} {t("days")}
                </span>
                <span className="hidden text-muted-foreground/50 sm:inline">
                  /
                </span>
                <span>
                  {overview.totalConversations} analyzed conversations
                </span>
              </div>
              <h1 className="mt-3 text-xl font-semibold text-foreground sm:text-3xl">
                AI performance analytics
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Track where automation is resolving customer work, where humans
                still step in, and which knowledge gaps should be fixed next.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge
                variant={hasIssues ? "destructive" : "secondary"}
                className="h-8 w-full rounded-lg px-3 sm:w-fit"
              >
                {hasIssues
                  ? `${overview.unanswered + overview.escalated} attention signals`
                  : "All clear"}
              </Badge>
              <Button
                disabled={isExporting}
                onClick={handleDownloadCsv}
                variant="outline"
                className="h-8 w-full sm:w-auto"
              >
                <DownloadIcon data-icon="inline-start" />
                {isExporting ? t("Exporting...") : t("Download CSV")}
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            title="AI resolution rate"
            value={`${overview.resolutionRate}%`}
            detail={<RatioBar tone="green" value={overview.resolutionRate} />}
            caption={
              <>
                {overview.resolved} {t("resolved by AI or voice AI")}
              </>
            }
            icon={CheckCircle2Icon}
            tone="green"
          />
          <MetricTile
            title="Escalation rate"
            value={`${overview.escalationRate}%`}
            detail={<RatioBar tone="rose" value={overview.escalationRate} />}
            caption={
              <>
                {overview.escalated} {t("conversations needed a human")}
              </>
            }
            icon={UserRoundCheckIcon}
            tone="rose"
          />
          <MetricTile
            title="Avg. human response"
            value={formatDuration(overview.averageHumanResponseMs)}
            detail={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3Icon className="size-3.5" />
                <span>
                  {overview.averageHumanResponseMs
                    ? "Response tracked"
                    : "Waiting for replies"}
                </span>
              </div>
            }
            caption={t(
              "Measured from first customer message to first operator reply"
            )}
            icon={Clock3Icon}
            tone="amber"
          />
          <MetricTile
            title="Human time saved"
            value={savedTimeLabel}
            detail={<RatioBar tone="primary" value={overview.resolutionRate} />}
            caption={t("Estimated support minutes handled by AI")}
            icon={TrendingUpIcon}
            tone="blue"
          />
        </section>

        <Tabs defaultValue="overview" className="gap-3">
          <div className="surface-panel overflow-x-auto overflow-y-hidden rounded-xl p-1.5">
            <TabsList className="flex h-auto min-w-max gap-1 bg-transparent p-0 md:grid md:w-full md:min-w-0 md:grid-cols-4">
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="overview"
              >
                <SparklesIcon data-icon="inline-start" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="questions"
              >
                <HelpCircleIcon data-icon="inline-start" />
                Questions
              </TabsTrigger>
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="channels"
              >
                <BotIcon data-icon="inline-start" />
                Channels
              </TabsTrigger>
              <TabsTrigger
                className="h-10 min-w-[8.5rem] flex-none rounded-lg md:min-w-0 md:flex-1"
                value="insights"
              >
                <AlertCircleIcon data-icon="inline-start" />
                Insights
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="surface-panel rounded-xl p-4 sm:p-5">
                <SectionHeader
                  title="Top customer intents"
                  description="The recurring jobs customers are trying to complete across chat and voice."
                  icon={MessageSquareIcon}
                />
                <div className="mt-5 space-y-4">
                  {overview.topIntents.length ? (
                    overview.topIntents.map((intent) => (
                      <CountBar
                        key={intent.label}
                        label={formatIntent(intent.label)}
                        count={intent.count}
                        max={maxIntentCount}
                      />
                    ))
                  ) : (
                    <EmptyState>No intents classified yet.</EmptyState>
                  )}
                </div>
              </div>

              <div className="surface-panel rounded-xl p-4 sm:p-5">
                <SectionHeader
                  title="Answer health"
                  description="A quick read on whether customers are getting complete answers before the team has to step in."
                  icon={CheckCircle2Icon}
                />
                <div className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">
                        Answered
                      </span>
                      <span className="text-muted-foreground">
                        {answerRate}%
                      </span>
                    </div>
                    <RatioBar tone="green" value={answerRate} />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">
                        Unanswered
                      </span>
                      <span className="text-muted-foreground">
                        {overview.unansweredRate}%
                      </span>
                    </div>
                    <RatioBar tone="amber" value={overview.unansweredRate} />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <FieldPill>{overview.resolved} resolved</FieldPill>
                    <FieldPill>{overview.escalated} escalated</FieldPill>
                    <FieldPill>{overview.unanswered} unanswered</FieldPill>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="questions">
            <section className="surface-panel rounded-xl p-4 sm:p-5">
              <SectionHeader
                title="Most common unanswered questions"
                description="Use this list as the highest-leverage queue for improving the knowledge base."
                icon={HelpCircleIcon}
              />
              <div className="mt-5 space-y-4">
                {overview.unansweredQuestions.length ? (
                  overview.unansweredQuestions.map((question) => (
                    <div
                      key={question.question}
                      className="rounded-xl border border-border/70 bg-muted/20 p-3.5 sm:p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm leading-relaxed font-medium text-foreground">
                            {question.question}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Intent: {formatIntent(question.intent)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {question.count} times
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <RatioBar
                          tone="amber"
                          value={(question.count / maxQuestionCount) * 100}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState>
                    No unanswered knowledge gaps detected yet.
                  </EmptyState>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="channels">
            <section className="grid gap-4 md:grid-cols-2">
              {overview.channelMetrics.map((metric) => {
                const Icon =
                  metric.channel === "voice" ? BotIcon : MessageSquareIcon

                return (
                  <div
                    key={metric.channel}
                    className="surface-panel rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-foreground capitalize">
                            {metric.channel}
                          </h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {metric.total} analyzed conversations
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="h-7 rounded-lg">
                        {metric.resolutionRate}% resolved
                      </Badge>
                    </div>
                    <div className="mt-5 space-y-4">
                      <RatioBar tone="green" value={metric.resolutionRate} />
                      <div className="flex flex-wrap gap-2">
                        <FieldPill>{metric.resolved} resolved</FieldPill>
                        <FieldPill>{metric.escalated} escalated</FieldPill>
                        <FieldPill>{metric.total} total</FieldPill>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          </TabsContent>

          <TabsContent value="insights">
            <section className="surface-panel rounded-xl p-4 sm:p-5">
              <SectionHeader
                title="Recent intelligence"
                description="Latest AI summaries, classifications, and unresolved signals from customer conversations."
                icon={AlertCircleIcon}
              />
              <div className="mt-4 divide-y divide-border/70">
                {overview.recentInsights.length ? (
                  overview.recentInsights.map((insight) => (
                    <div
                      key={insight._id}
                      className="grid gap-3 py-4 md:grid-cols-[11rem_1fr] lg:grid-cols-[11rem_1fr_auto] lg:items-start"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {insight.channel}
                        </Badge>
                        <Badge variant="secondary">
                          {formatIntent(insight.intent)}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {insight.summary}
                      </p>
                      <Badge
                        variant={
                          insight.isUnanswered ? "destructive" : "outline"
                        }
                        className="w-fit"
                      >
                        {insight.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState>
                    Insights will appear after new chat or voice conversations.
                  </EmptyState>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
