import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { ConvexError } from "convex/values"
import { query } from "../_generated/server"

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const organizationId = getOrganizationIdFromIdentity(identity)

    if (!organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique()

    return {
      isActive: subscription?.status === "active",
      status: subscription?.status ?? null,
      provider: subscription?.provider ?? null,
    }
  },
})
