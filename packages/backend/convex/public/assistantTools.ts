import { v } from "convex/values"
import { action } from "../_generated/server"
import { internal } from "../_generated/api"

export const execute = action({
  args: {
    organizationId: v.string(),
    toolName: v.string(),
    args: v.any(),
    channel: v.optional(v.union(v.literal("chat"), v.literal("voice"))),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    return ctx.runAction(internal.system.assistantTools.execute.executeTool, {
      organizationId: args.organizationId,
      toolName: args.toolName,
      args: args.args,
      channel: args.channel ?? "voice",
    })
  },
})
