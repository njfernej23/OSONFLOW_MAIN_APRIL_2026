import { ConvexError, v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { internal } from "../_generated/api"

const serviceValidator = v.union(
  v.literal("vapi"),
  v.literal("openai_realtime"),
  v.literal("gemini_live")
)

export const upsert = mutation({
  args: {
    service: serviceValidator,
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = identity.orgId as string

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    //TODO check for subscription

    await ctx.scheduler.runAfter(0, internal.system.secrets.upsert, {
      service: args.service,
      organizationId: orgId,
      value: args.value,
    })
  },
})

export const getProviderStatuses = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = identity.orgId as string

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const [openAIPlugin, geminiPlugin] = await Promise.all([
      ctx.db
        .query("plugins")
        .withIndex("by_organization_id_and_service", (q) =>
          q.eq("organizationId", orgId).eq("service", "openai_realtime")
        )
        .unique(),
      ctx.db
        .query("plugins")
        .withIndex("by_organization_id_and_service", (q) =>
          q.eq("organizationId", orgId).eq("service", "gemini_live")
        )
        .unique(),
    ])

    return {
      openaiConfigured: Boolean(openAIPlugin?.secretValue),
      openaiRealtimeConfigured: Boolean(openAIPlugin?.secretValue),
      geminiLiveConfigured: Boolean(geminiPlugin?.secretValue),
    }
  },
})

export const getVoiceProviderStatuses = getProviderStatuses
