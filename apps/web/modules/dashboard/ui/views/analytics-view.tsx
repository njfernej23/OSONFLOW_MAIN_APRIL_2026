"use client"

import { useQuery } from "convex/react"
import {
  AlertCircleIcon,
  BarChart3Icon,
  BotIcon,
  CheckCircle2Icon,
  Clock3Icon,
  HelpCircleIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  UserRoundCheckIcon,
} from "lucide-react"

import { api } from "@workspace/backend/_generated/api"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

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

const MetricTile = ({
  title,
  value,
  caption,
  icon: Icon,
  tone = "default",
}: {
  title: string
  value: string
  caption: string
  icon: React.ComponentType<{ className?: string }>
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
    <div className="rounded-2xl border border-border/70 bg-background/82 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
        </div>
        <div className={cn("flex size-9 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="size-4" />
        </div>
      </div>
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
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="truncate font-medium text-foreground">{label}</span>
      <span className="shrink-0 text-muted-foreground">{count}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${max > 0 ? Math.max(6, (count / max) * 100) : 0}%` }}
      />
    </div>
  </div>
)

export const AnalyticsView = () => {
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

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-2xl border border-border/70 bg-background/78 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3Icon className="size-4" />
                <span>Last {overview.windowDays} days</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
                AI performance analytics
              </h1>
            </div>
            <Badge variant="secondary" className="w-fit">
              {overview.totalConversations} analyzed conversations
            </Badge>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            title="AI resolution rate"
            value={`${overview.resolutionRate}%`}
            caption={`${overview.resolved} resolved by AI or voice AI`}
            icon={CheckCircle2Icon}
            tone="green"
          />
          <MetricTile
            title="Escalation rate"
            value={`${overview.escalationRate}%`}
            caption={`${overview.escalated} conversations needed a human`}
            icon={UserRoundCheckIcon}
            tone="rose"
          />
          <MetricTile
            title="Avg. human response"
            value={formatDuration(overview.averageHumanResponseMs)}
            caption="Measured from first customer message to first operator reply"
            icon={Clock3Icon}
            tone="amber"
          />
          <MetricTile
            title="Human time saved"
            value={`${overview.humanSavedMinutes}m`}
            caption="Estimated support minutes handled by AI"
            icon={TrendingUpIcon}
            tone="blue"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border/70 bg-background/82 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Top intents
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  What customers are asking for most often.
                </p>
              </div>
              <MessageSquareIcon className="size-4 text-muted-foreground" />
            </div>
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
                <p className="text-sm text-muted-foreground">
                  No intents classified yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/82 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Most common unanswered questions
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use these to improve your knowledge base.
                </p>
              </div>
              <HelpCircleIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-5 space-y-4">
              {overview.unansweredQuestions.length ? (
                overview.unansweredQuestions.map((question) => (
                  <CountBar
                    key={question.question}
                    label={question.question}
                    count={question.count}
                    max={maxQuestionCount}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No unanswered knowledge gaps detected yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-border/70 bg-background/82 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">
              Voice vs chat resolution
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {overview.channelMetrics.map((metric) => {
                const Icon = metric.channel === "voice" ? BotIcon : MessageSquareIcon

                return (
                  <div
                    key={metric.channel}
                    className="rounded-xl border border-border/70 bg-muted/25 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium capitalize text-foreground">
                          {metric.channel}
                        </p>
                      </div>
                      <Badge variant="outline">{metric.resolutionRate}%</Badge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {metric.resolved} resolved, {metric.escalated} escalated,
                      {" "}
                      {metric.total} total
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/82 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Recent intelligence
              </h2>
              <AlertCircleIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-4 divide-y divide-border/70">
              {overview.recentInsights.length ? (
                overview.recentInsights.map((insight) => (
                  <div
                    key={insight._id}
                    className="grid gap-2 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-center"
                  >
                    <div className="flex items-center gap-2">
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
                      variant={insight.isUnanswered ? "destructive" : "outline"}
                      className="w-fit"
                    >
                      {insight.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="py-8 text-sm text-muted-foreground">
                  Insights will appear after new chat or voice conversations.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
