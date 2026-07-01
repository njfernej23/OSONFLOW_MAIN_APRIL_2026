import { ConvexError, v } from "convex/values"
import { internalMutation } from "../_generated/server"

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export const createOAuthState = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    state: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now()

    const existingStates = await ctx.db
      .query("googleSheetsOAuthStates")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()

    for (const existingState of existingStates) {
      await ctx.db.delete(existingState._id)
    }

    await ctx.db.insert("googleSheetsOAuthStates", {
      organizationId: args.organizationId,
      actorId: args.actorId,
      state: args.state,
      expiresAt: now + OAUTH_STATE_TTL_MS,
      createdAt: now,
    })

    return null
  },
})

export const consumeOAuthState = internalMutation({
  args: {
    state: v.string(),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const oauthState = await ctx.db
      .query("googleSheetsOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique()

    if (!oauthState) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid or expired Google authorization state",
      })
    }

    if (oauthState.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Google authorization does not match this organization",
      })
    }

    if (oauthState.expiresAt < Date.now()) {
      await ctx.db.delete(oauthState._id)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Google authorization expired. Please try again.",
      })
    }

    await ctx.db.delete(oauthState._id)
    return null
  },
})

export const saveOAuthCredentials = internalMutation({
  args: {
    organizationId: v.string(),
    secretValue: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const existing = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", args.organizationId).eq("service", "google_sheets")
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        secretValue: args.secretValue,
        secretName: "Google Sheets account",
      })
      return null
    }

    await ctx.db.insert("plugins", {
      organizationId: args.organizationId,
      service: "google_sheets",
      secretName: "Google Sheets account",
      secretValue: args.secretValue,
    })

    return null
  },
})
