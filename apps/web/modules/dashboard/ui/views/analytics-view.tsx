"use client"

import { useState } from "react"
import { useConvex, useQuery } from "convex/react"
import {
  AlertCircleIcon,
  BotIcon,
  CheckCircle2Icon,
  ChartColumnBigIcon,
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
import { GettingStartedCallout } from "@/modules/onboarding/ui/components/getting-started-callout"
import type { Doc } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatCsvTimestamp,
  stringifyCsvRows,
  type CsvValue,
} from "../lib/conversation-export"
import {
  ConsoleHeader,
  ConsoleMeta,
  ConsolePage,
  ConsoleSkeleton,
  consoleTabsListClass,
  consoleTabsTriggerClass,
  EmptyState,
  Meter,
  Panel,
  PanelBody,
  PanelHeader,
  Pill,
  Stat,
  StatGrid,
} from "../components/console"

const ANALYTICS_EXPORT_LIMIT = 5000

type ConversationInsight = Doc<"conversationInsights">

const formatDuration = (ms: number | null) => {
  if (ms === null) {
    return "—"
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

/**
 * Ranked magnitude bar. One hue for the whole set — the bars encode size, not
 * identity, so a categorical palette here would be noise.
 */
const RankedBar = ({
  label,
  count,
  max,
  rank,
}: {
  label: string
  count: number
  max: number
  rank: number
}) => (
  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3">
    <span className="console-numeral text-xs text-muted-foreground/70">
      {String(rank).padStart(2, "0")}
    </span>
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-foreground">{label}</span>
      </div>
      <Meter
        className="mt-2"
        tone="accent"
        value={max > 0 ? Math.max(4, (count / max) * 100) : 0}
      />
    </div>
    <span className="console-numeral text-sm">{count}</span>
  </div>
)

export const AnalyticsView = () => {
  const { t } = useLanguage()
  const [isExporting, setIsExporting] = useState(false)
  const convex = useConvex()
  const overview = useQuery(api.private.analytics.getOverview, {
    windowDays: 30,
  })

  if (overview === undefined) {
    return <ConsoleSkeleton rows={2} />
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
  const attentionSignals = overview.unanswered + overview.escalated

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

      const blob = new Blob(["﻿", stringifyCsvRows(rows)], {
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
    <ConsolePage>
      <GettingStartedCallout />

      <ConsoleHeader
        actions={
          <Button
            disabled={isExporting}
            onClick={handleDownloadCsv}
            variant="outline"
          >
            <DownloadIcon data-icon="inline-start" />
            {isExporting ? t("Exporting...") : t("Download CSV")}
          </Button>
        }
        description="How much of your customer support the assistant handled by itself, where someone still had to step in, and which questions it could not answer yet."
        eyebrow="Overview"
        icon={ChartColumnBigIcon}
        meta={
          <>
            <ConsoleMeta
              label={`${t("Last")} ${overview.windowDays} ${t("days")}`}
              value={`${overview.totalConversations} analyzed`}
            />
            <ConsoleMeta
              dot
              label={attentionSignals ? "Attention signals" : "Status"}
              tone={attentionSignals ? "warning" : "positive"}
              value={attentionSignals ? attentionSignals : "All clear"}
            />
          </>
        }
        title="AI performance"
      />

      <StatGrid>
        <Stat
          hint={`${overview.resolved} ${t("resolved by AI or voice AI")}`}
          icon={CheckCircle2Icon}
          label="AI resolution rate"
          progress={overview.resolutionRate}
          tone="positive"
          value={`${overview.resolutionRate}%`}
        />
        <Stat
          hint={`${overview.escalated} ${t("conversations needed a human")}`}
          icon={UserRoundCheckIcon}
          label="Escalation rate"
          progress={overview.escalationRate}
          tone="critical"
          value={`${overview.escalationRate}%`}
        />
        <Stat
          hint={t(
            "Measured from first customer message to first operator reply"
          )}
          icon={Clock3Icon}
          label="Avg. human response"
          tone="warning"
          value={formatDuration(overview.averageHumanResponseMs)}
        />
        <Stat
          hint={t("Estimated support minutes handled by AI")}
          icon={TrendingUpIcon}
          label="Human time saved"
          tone="info"
          value={savedTimeLabel}
        />
      </StatGrid>

      <Tabs defaultValue="overview">
        <TabsList className={consoleTabsListClass}>
          <TabsTrigger className={consoleTabsTriggerClass} value="overview">
            <SparklesIcon />
            Overview
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="questions">
            <HelpCircleIcon />
            Questions
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="channels">
            <BotIcon />
            Channels
          </TabsTrigger>
          <TabsTrigger className={consoleTabsTriggerClass} value="insights">
            <AlertCircleIcon />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-1" value="overview">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Panel>
              <PanelHeader
                description="The recurring jobs customers are trying to complete across chat and voice."
                icon={MessageSquareIcon}
                title="Top customer intents"
              />
              <PanelBody>
                {overview.topIntents.length ? (
                  <div className="space-y-4">
                    {overview.topIntents.map((intent, index) => (
                      <RankedBar
                        count={intent.count}
                        key={intent.label}
                        label={formatIntent(intent.label)}
                        max={maxIntentCount}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    className="min-h-[12rem]"
                    description="Intents are classified automatically once conversations start coming in."
                    icon={MessageSquareIcon}
                    title="Nothing classified yet"
                  />
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                description="Whether customers get a complete answer before the team has to step in."
                icon={CheckCircle2Icon}
                title="Answer health"
              />
              <PanelBody className="space-y-5">
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2Icon className="console-tone-positive size-3.5" />
                      Answered
                    </span>
                    <span className="console-numeral text-sm">
                      {answerRate}%
                    </span>
                  </div>
                  <Meter tone="positive" value={answerRate} />
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <HelpCircleIcon className="console-tone-warning size-3.5" />
                      Unanswered
                    </span>
                    <span className="console-numeral text-sm">
                      {overview.unansweredRate}%
                    </span>
                  </div>
                  <Meter tone="warning" value={overview.unansweredRate} />
                </div>

                <div className="console-rule" />

                <div className="grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["Resolved", overview.resolved, "positive"],
                      ["Escalated", overview.escalated, "critical"],
                      ["Unanswered", overview.unanswered, "warning"],
                    ] as const
                  ).map(([label, value, tone]) => (
                    <div className="console-inset px-2 py-2.5" key={label}>
                      <p
                        className={cn(
                          "console-numeral text-base",
                          `console-tone-${tone}`
                        )}
                      >
                        {value}
                      </p>
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </PanelBody>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent className="mt-1" value="questions">
          <Panel>
            <PanelHeader
              description="The highest-leverage queue for improving the knowledge base."
              icon={HelpCircleIcon}
              title="Most common unanswered questions"
            />
            {overview.unansweredQuestions.length ? (
              <div>
                {overview.unansweredQuestions.map((question) => (
                  <div
                    className="console-row border-b border-[var(--console-hairline-soft)] px-4 py-4 last:border-b-0 sm:px-5"
                    key={question.question}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm leading-relaxed text-foreground">
                          {question.question}
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {formatIntent(question.intent)}
                        </p>
                      </div>
                      <Pill tone="warning">{question.count} asked</Pill>
                    </div>
                    <Meter
                      className="mt-3"
                      tone="warning"
                      value={(question.count / maxQuestionCount) * 100}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="No knowledge gaps have been detected in this window."
                icon={CheckCircle2Icon}
                title="Nothing unanswered"
              />
            )}
          </Panel>
        </TabsContent>

        <TabsContent className="mt-1" value="channels">
          <div className="grid gap-4 md:grid-cols-2">
            {overview.channelMetrics.map((metric) => {
              const Icon =
                metric.channel === "voice" ? BotIcon : MessageSquareIcon

              return (
                <Panel key={metric.channel}>
                  <PanelHeader
                    actions={
                      <Pill tone="positive">
                        {metric.resolutionRate}% resolved
                      </Pill>
                    }
                    description={`${metric.total} analyzed conversations`}
                    icon={Icon}
                    title={
                      <span className="capitalize">{metric.channel}</span>
                    }
                  />
                  <PanelBody className="space-y-4">
                    <Meter tone="positive" value={metric.resolutionRate} />
                    <div className="flex flex-wrap gap-2">
                      <Pill tone="positive">{metric.resolved} resolved</Pill>
                      <Pill tone="critical">{metric.escalated} escalated</Pill>
                      <Pill>{metric.total} total</Pill>
                    </div>
                  </PanelBody>
                </Panel>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent className="mt-1" value="insights">
          <Panel>
            <PanelHeader
              description="Latest AI summaries, classifications, and unresolved signals."
              icon={AlertCircleIcon}
              title="Recent intelligence"
            />
            {overview.recentInsights.length ? (
              <div>
                {overview.recentInsights.map((insight) => (
                  <div
                    className="console-row grid gap-3 border-b border-[var(--console-hairline-soft)] px-4 py-4 last:border-b-0 sm:px-5 lg:grid-cols-[13rem_minmax(0,1fr)_auto] lg:items-start"
                    key={insight._id}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill className="capitalize">{insight.channel}</Pill>
                      <Pill tone="info">{formatIntent(insight.intent)}</Pill>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {insight.summary}
                    </p>
                    <Pill tone={insight.isUnanswered ? "critical" : "neutral"}>
                      {insight.status}
                    </Pill>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Insights appear after new chat or voice conversations are analyzed."
                icon={SparklesIcon}
                title="No insights yet"
              />
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </ConsolePage>
  )
}
