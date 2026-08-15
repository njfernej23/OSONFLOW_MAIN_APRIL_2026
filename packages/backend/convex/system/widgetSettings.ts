import { v } from "convex/values"

import { internalQuery } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

export const resolveWidgetSettings = async (
  ctx: QueryCtx,
  { organizationId, agentId }: { organizationId: string; agentId?: string }
): Promise<Doc<"widgetSettings"> | null> => {
  const resolvedAgentId = agentId?.trim() || "default"

  const widgetSettings = await ctx.db
    .query("widgetSettings")
    .withIndex("by_organization_id_and_agent_id", (q) =>
      q.eq("organizationId", organizationId).eq("agentId", resolvedAgentId)
    )
    .unique()

  if (widgetSettings) {
    return widgetSettings
  }

  if (resolvedAgentId !== "default") {
    return null
  }

  const organizationSettings = await ctx.db
    .query("widgetSettings")
    .withIndex("by_organization_id", (q) =>
      q.eq("organizationId", organizationId)
    )
    .collect()

  return (
    organizationSettings.find((settings) => settings.isDefault) ??
    organizationSettings.find((settings) => !settings.agentId) ??
    organizationSettings[0] ??
    null
  )
}

// Full settings document, including the system prompt and unpublished draft.
// Backend-only: the widget receives the redacted projection instead.
export const getByOrganizationId = internalQuery({
  args: {
    organizationId: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await resolveWidgetSettings(ctx, args)
  },
})
