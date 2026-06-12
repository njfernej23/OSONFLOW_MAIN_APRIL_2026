import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

const serviceValidator = v.union(v.literal("vapi"), v.literal("openai_realtime"), v.literal("gemini_live"));

export const remove = mutation({
    args: {
        service: serviceValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = getOrganizationIdFromIdentity(identity) as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const existingPlugin = await ctx.db
            .query("plugins")
            .withIndex("by_organization_id_and_service", (q) =>
                q.eq("organizationId", orgId).eq("service", args.service)
            )
            .unique();

        if (!existingPlugin) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Plugin not found",
            });
        }

        await ctx.db.delete(existingPlugin._id);
    },
});

export const getOne = query({
    args: {
        service: serviceValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = getOrganizationIdFromIdentity(identity) as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        return await ctx.db
            .query("plugins")
            .withIndex("by_organization_id_and_service", (q) =>
                q.eq("organizationId", orgId).eq("service", args.service)
            )
            .unique();
    },
});
