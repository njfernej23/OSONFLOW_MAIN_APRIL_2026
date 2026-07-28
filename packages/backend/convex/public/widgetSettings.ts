import { v } from "convex/values";
import { query } from "../_generated/server";

export const getByOrganizationId = query({
  args: {
    organizationId: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agentId = args.agentId?.trim() || "default"
    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id_and_agent_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("agentId", agentId),
      )
      .unique();

    if (widgetSettings) {
      return widgetSettings;
    }

    if (agentId !== "default") {
      return null;
    }

    const organizationSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    return (
      organizationSettings.find((settings) => settings.isDefault) ??
      organizationSettings.find((settings) => !settings.agentId) ??
      organizationSettings[0] ??
      null
    );
  },
});
