import { v, ConvexError } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const escalate = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found"
      });
    }

    const previousStatus = conversation.status;

    await ctx.db.patch(conversation._id, { status: 'escalated' })

    if (previousStatus !== "escalated") {
      await ctx.runMutation((internal as any).system.integrationWebhooks.dispatchEvent, {
        organizationId: conversation.organizationId,
        eventType: "conversation.status_changed",
        payload: {
          conversationId: conversation._id,
          threadId: args.threadId,
          previousStatus,
          status: "escalated",
          source: "ai",
        },
      });
    }
  },
});

export const resolve = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found"
      });
    }

    const previousStatus = conversation.status;

    await ctx.db.patch(conversation._id, { status: 'resolved' })

    if (previousStatus !== "resolved") {
      await ctx.runMutation((internal as any).system.integrationWebhooks.dispatchEvent, {
        organizationId: conversation.organizationId,
        eventType: "conversation.status_changed",
        payload: {
          conversationId: conversation._id,
          threadId: args.threadId,
          previousStatus,
          status: "resolved",
          source: "ai",
        },
      });
    }
  },
});

export const getByThreadId = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    return conversation;
  },
});