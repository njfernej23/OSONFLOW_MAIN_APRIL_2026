import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

/**
 * Records which organization a stored blob belongs to.
 *
 * Convex storage ids carry no tenant information, so any code path that hands a
 * storage id back to a user has to consult this table instead of trusting the
 * id. Every `ctx.storage.store` call should claim its blob here, otherwise the
 * blob looks unowned and an unrelated organization can claim it later.
 */
export const claim = internalMutation({
  args: {
    storageId: v.id("_storage"),
    organizationId: v.string(),
    purpose: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("storageObjects")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()

    if (existing) {
      return null
    }

    await ctx.db.insert("storageObjects", {
      storageId: args.storageId,
      organizationId: args.organizationId,
      uploadedBy: args.uploadedBy,
      purpose: args.purpose,
      createdAt: Date.now(),
    })

    return null
  },
})

export const release = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("storageObjects")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    return null
  },
})
