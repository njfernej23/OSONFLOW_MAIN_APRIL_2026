import { v } from "convex/values"
import { action } from "../_generated/server"
import { internal } from "../_generated/api"
import { enforceRateLimit } from "../lib/rateLimits"
import { requireContactSessionFromAction } from "../lib/widgetAuth"

export const execute = action({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    toolName: v.string(),
    args: v.any(),
    channel: v.optional(v.union(v.literal("chat"), v.literal("voice"))),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    // Assistant tools run against the organization's own credentials (Google
    // Sheets, outbound API requests, knowledge base). Without a session bound to
    // this organization, anyone who learns an organization id could drive them.
    await requireContactSessionFromAction(ctx, {
      contactSessionId: args.contactSessionId,
      organizationId: args.organizationId,
    })

    await enforceRateLimit(ctx, "assistantToolExecuteBySession", {
      key: `${args.organizationId}:${args.contactSessionId}`,
      message: "Too many tool requests. Please wait a moment.",
    })
    await enforceRateLimit(ctx, "assistantToolExecuteByOrg", {
      key: args.organizationId,
      message: "This assistant is receiving too many requests right now.",
    })

    return ctx.runAction(internal.system.assistantTools.execute.executeTool, {
      organizationId: args.organizationId,
      toolName: args.toolName,
      args: args.args,
      channel: args.channel ?? "voice",
    })
  },
})
