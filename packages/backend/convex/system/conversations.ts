import { v, ConvexError } from "convex/values"
import { internalQuery, internalMutation } from "../_generated/server"
import { internal } from "../_generated/api"

export const escalate = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique()

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    const previousStatus = conversation.status

    await ctx.db.patch(conversation._id, { status: "escalated" })

    if (previousStatus !== "escalated") {
      await ctx.runMutation(
        (internal as any).system.integrationWebhooks.dispatchEvent,
        {
          organizationId: conversation.organizationId,
          eventType: "conversation.status_changed",
          payload: {
            conversationId: conversation._id,
            threadId: args.threadId,
            previousStatus,
            status: "escalated",
            source: "ai",
          },
        }
      )
    }
  },
})

export const resolve = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique()

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    const previousStatus = conversation.status

    await ctx.db.patch(conversation._id, { status: "resolved" })

    if (previousStatus !== "resolved") {
      await ctx.runMutation(
        (internal as any).system.integrationWebhooks.dispatchEvent,
        {
          organizationId: conversation.organizationId,
          eventType: "conversation.status_changed",
          payload: {
            conversationId: conversation._id,
            threadId: args.threadId,
            previousStatus,
            status: "resolved",
            source: "ai",
          },
        }
      )
    }
  },
})

export const markContactRead = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    await ctx.db.patch(args.conversationId, {
      contactLastReadAt: args.timestamp ?? Date.now(),
      unreadForContactCount: 0,
    })
  },
})

export const markOperatorRead = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    await ctx.db.patch(args.conversationId, {
      operatorLastReadAt: args.timestamp ?? Date.now(),
      unreadForOperatorCount: 0,
    })
  },
})

export const touchCustomerMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    const timestamp = args.timestamp ?? Date.now()

    await ctx.db.patch(args.conversationId, {
      lastCustomerMessageAt: timestamp,
      contactLastReadAt: timestamp,
      unreadForContactCount: 0,
      unreadForOperatorCount: (conversation.unreadForOperatorCount ?? 0) + 1,
    })
  },
})

export const getByThreadId = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique()

    return conversation
  },
})
