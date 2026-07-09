import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { Doc } from "../_generated/dataModel"
import { isVoiceCompatibleAssistantTool } from "../lib/assistantTools"

export const listEnabledForOrganization = internalQuery({
  args: {
    organizationId: v.string(),
    channel: v.union(v.literal("chat"), v.literal("voice")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Doc<"assistantTools">[]> => {
    const tools = await ctx.db
      .query("assistantTools")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()

    return tools
      .filter((tool) => tool.isEnabled)
      .filter((tool) =>
        args.channel === "chat"
          ? tool.enabledForChat
          : tool.enabledForVoice && isVoiceCompatibleAssistantTool(tool)
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)
  },
})

export const getById = internalQuery({
  args: {
    toolId: v.id("assistantTools"),
    organizationId: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args): Promise<Doc<"assistantTools"> | null> => {
    const tool = await ctx.db.get(args.toolId)
    if (!tool || tool.organizationId !== args.organizationId) {
      return null
    }
    return tool
  },
})
