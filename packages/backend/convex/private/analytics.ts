import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { query, QueryCtx } from "../_generated/server"

const ANALYTICS_EXPORT_LIMIT = 5000

const getOrganizationId = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const organizationId = identity.orgId as string | undefined

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return organizationId
}

const percentage = (value: number, total: number) => {
  if (total === 0) {
    return 0
  }

  return Math.round((value / total) * 100)
}

const average = (values: number[]) => {
  if (values.length === 0) {
    return null
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length
  )
}

const groupCounts = <T extends string>(values: T[]) => {
  const counts = new Map<T, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export const getOverview = query({
  args: {
    windowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx)
    const windowDays = Math.max(1, Math.min(args.windowDays ?? 30, 365))
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000

    const allInsights = await ctx.db
      .query("conversationInsights")
      .withIndex("by_organization_id_and_updated_at", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(1000)

    const insights = allInsights.filter(
      (insight) => insight.updatedAt >= cutoff
    )
    const total = insights.length
    const resolved = insights.filter((insight) => insight.wasResolved).length
    const escalated = insights.filter((insight) => insight.wasEscalated).length
    const unanswered = insights.filter((insight) => insight.isUnanswered)
    const responseTimes = insights
      .map((insight) => insight.firstHumanResponseMs)
      .filter((value): value is number => typeof value === "number")

    const byChannel = (channel: "chat" | "voice") => {
      const channelInsights = insights.filter(
        (insight) => insight.channel === channel
      )
      const channelTotal = channelInsights.length

      return {
        channel,
        total: channelTotal,
        resolved: channelInsights.filter((insight) => insight.wasResolved)
          .length,
        escalated: channelInsights.filter((insight) => insight.wasEscalated)
          .length,
        resolutionRate: percentage(
          channelInsights.filter((insight) => insight.wasResolved).length,
          channelTotal
        ),
      }
    }

    const unansweredCounts = new Map<
      string,
      { count: number; intent: string }
    >()

    for (const insight of unanswered) {
      const label = insight.unansweredQuestion || insight.summary
      const existing = unansweredCounts.get(label)

      unansweredCounts.set(label, {
        count: (existing?.count ?? 0) + 1,
        intent: existing?.intent ?? insight.intent,
      })
    }

    return {
      windowDays,
      totalConversations: total,
      resolved,
      escalated,
      unanswered: unanswered.length,
      resolutionRate: percentage(resolved, total),
      escalationRate: percentage(escalated, total),
      unansweredRate: percentage(unanswered.length, total),
      averageHumanResponseMs: average(responseTimes),
      humanSavedMinutes: Math.round(
        insights.reduce(
          (totalMinutes, insight) => totalMinutes + insight.humanSavedMinutes,
          0
        )
      ),
      topIntents: groupCounts(insights.map((insight) => insight.intent)).slice(
        0,
        8
      ),
      sentimentMix: groupCounts(
        insights.map((insight) => insight.sentiment)
      ).slice(0, 3),
      urgencyMix: groupCounts(insights.map((insight) => insight.urgency)).slice(
        0,
        3
      ),
      unansweredQuestions: Array.from(unansweredCounts.entries())
        .map(([question, value]) => ({
          question,
          count: value.count,
          intent: value.intent,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      channelMetrics: [byChannel("chat"), byChannel("voice")],
      recentInsights: insights.slice(0, 8),
    }
  },
})

export const getInsights = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx)

    return await ctx.db
      .query("conversationInsights")
      .withIndex("by_organization_id_and_updated_at", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .paginate(args.paginationOpts)
  },
})

export const getInsightsForExport = query({
  args: {
    windowDays: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx)
    const windowDays = Math.max(1, Math.min(args.windowDays ?? 30, 365))
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000
    const limit = Math.max(
      1,
      Math.min(args.limit ?? ANALYTICS_EXPORT_LIMIT, ANALYTICS_EXPORT_LIMIT)
    )

    const insights = await ctx.db
      .query("conversationInsights")
      .withIndex("by_organization_id_and_updated_at", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(limit)

    return insights.filter((insight) => insight.updatedAt >= cutoff)
  },
})
