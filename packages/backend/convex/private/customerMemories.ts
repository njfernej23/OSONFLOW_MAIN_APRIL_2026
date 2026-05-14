import { ConvexError, v } from "convex/values"
import { query, QueryCtx } from "../_generated/server"

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

const hasActiveSubscription = async (
  ctx: QueryCtx,
  organizationId: string
) => {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_organization_id", (q) =>
      q.eq("organizationId", organizationId)
    )
    .unique()

  return subscription?.status === "active"
}

export const getMany = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx)

    if (!(await hasActiveSubscription(ctx, organizationId))) {
      return []
    }

    const limit = Math.max(1, Math.min(args.limit ?? 50, 100))

    return await ctx.db
      .query("customerMemories")
      .withIndex("by_organization_id_and_last_seen_at", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(limit)
  },
})

export const getByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx)

    if (!(await hasActiveSubscription(ctx, organizationId))) {
      return null
    }

    const email = args.email.trim().toLowerCase()

    if (!email) {
      return null
    }

    return await ctx.db
      .query("customerMemories")
      .withIndex("by_organization_id_and_email", (q) =>
        q.eq("organizationId", organizationId).eq("email", email)
      )
      .unique()
  },
})
