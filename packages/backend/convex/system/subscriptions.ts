import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"

export const upsert = internalMutation({
  args: {
    organizationId: v.string(),
    status: v.string(),
    provider: v.optional(v.union(v.literal("clerk"), v.literal("polar"))),
    polarCustomerId: v.optional(v.string()),
    polarProductId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()

    const update = {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.provider ? { provider: args.provider } : {}),
      ...(args.polarCustomerId ? { polarCustomerId: args.polarCustomerId } : {}),
      ...(args.polarProductId ? { polarProductId: args.polarProductId } : {}),
      ...(args.polarSubscriptionId
        ? { polarSubscriptionId: args.polarSubscriptionId }
        : {}),
      ...(args.currentPeriodEnd ? { currentPeriodEnd: args.currentPeriodEnd } : {}),
    }

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, update)
    } else {
      await ctx.db.insert("subscriptions", {
        organizationId: args.organizationId,
        ...update,
      })
    }
  },
})


export const getByOrganizationId = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()
  },
})
