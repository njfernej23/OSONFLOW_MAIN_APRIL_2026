import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values"


export const upsert = internalMutation({
    args: {
        service: v.union(v.literal("vapi"), v.literal("openai_realtime"), v.literal("gemini_live")),
        secretName: v.string(),
        secretValue: v.optional(v.string()),
        organizationId: v.string(),
    },
    handler: async (ctx, args) => {
        const existingPlugin = await ctx.db
            .query("plugins")
            .withIndex("by_organization_id_and_service", (q) =>
                q.eq("organizationId", args.organizationId).eq("service", args.service),
            )
            .unique();

        if (existingPlugin) {
            await ctx.db.patch(existingPlugin._id, {
                service: args.service,
                secretName: args.secretName,
                secretValue: args.secretValue,
            });
        } else {
            await ctx.db.insert("plugins", {
                organizationId: args.organizationId,
                service: args.service,
                secretName: args.secretName,
                secretValue: args.secretValue,
            });
        }
    },
});

export const getByOrganizationIdAndService = internalQuery({
    args: {
        organizationId: v.string(),
        service: v.union(v.literal("vapi"), v.literal("openai_realtime"), v.literal("gemini_live")),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("plugins")
            .withIndex("by_organization_id_and_service", (q) =>
                q.eq("organizationId", args.organizationId).eq("service", args.service),
            )
            .unique();
    },
});
