import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

const normalizeOptionalString = (value?: string) => {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
};

const getAuthContext = async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Identity not found",
        });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Organization not found",
        });
    }

    return {
        identity,
        organizationId: orgId,
    };
};

const getOwnedSavedReply = async (ctx: any, savedReplyId: any, organizationId: string) => {
    const savedReply = await ctx.db.get(savedReplyId);

    if (!savedReply) {
        throw new ConvexError({
            code: "NOT_FOUND",
            message: "Saved reply not found",
        });
    }

    if (savedReply.organizationId !== organizationId) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Invalid organization",
        });
    }

    return savedReply;
};

export const getMany = query({
    args: {
        search: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        const search = normalizeOptionalString(args.search)?.toLowerCase();
        const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

        const savedReplies = await ctx.db
            .query("savedReplies")
            .withIndex("by_organization_id_and_usage_count", (q: any) =>
                q.eq("organizationId", organizationId)
            )
            .order("desc")
            .take(200);

        const filtered = !search
            ? savedReplies
            : savedReplies.filter((savedReply: any) => {
                  const searchableText = [
                      savedReply.title,
                      savedReply.body,
                      savedReply.category,
                  ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase();

                  return searchableText.includes(search);
              });

        const ranked = filtered.sort((a: any, b: any) => {
            if (a.usageCount !== b.usageCount) {
                return b.usageCount - a.usageCount;
            }

            return b.updatedAt - a.updatedAt;
        });

        return ranked.slice(0, limit);
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        body: v.string(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { identity, organizationId } = await getAuthContext(ctx);

        const title = args.title.trim();
        const body = args.body.trim();

        if (!title || !body) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Title and body are required",
            });
        }

        const now = Date.now();

        return await ctx.db.insert("savedReplies", {
            organizationId,
            title,
            body,
            category: normalizeOptionalString(args.category),
            usageCount: 0,
            updatedAt: now,
            createdBy: identity.subject,
        });
    },
});

export const update = mutation({
    args: {
        savedReplyId: v.id("savedReplies"),
        title: v.string(),
        body: v.string(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        await getOwnedSavedReply(ctx, args.savedReplyId, organizationId);

        const title = args.title.trim();
        const body = args.body.trim();

        if (!title || !body) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Title and body are required",
            });
        }

        await ctx.db.patch(args.savedReplyId, {
            title,
            body,
            category: normalizeOptionalString(args.category),
            updatedAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: {
        savedReplyId: v.id("savedReplies"),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        await getOwnedSavedReply(ctx, args.savedReplyId, organizationId);

        await ctx.db.delete(args.savedReplyId);
    },
});

export const incrementUsage = mutation({
    args: {
        savedReplyId: v.id("savedReplies"),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        const savedReply = await getOwnedSavedReply(ctx, args.savedReplyId, organizationId);

        await ctx.db.patch(args.savedReplyId, {
            usageCount: savedReply.usageCount + 1,
            updatedAt: Date.now(),
        });
    },
});
