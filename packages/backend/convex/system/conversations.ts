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

    await ctx.db.patch(conversation._id, {
      status: "escalated",
      escalatedAt: conversation.escalatedAt ?? Date.now(),
    })

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

    await ctx.db.patch(conversation._id, {
      status: "resolved",
      resolvedAt: conversation.resolvedAt ?? Date.now(),
      resolutionSource: "ai",
    })

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
    incrementOperatorUnread: v.optional(v.boolean()),
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
    const incrementOperatorUnread = args.incrementOperatorUnread ?? true

    await ctx.db.patch(args.conversationId, {
      lastCustomerMessageAt: timestamp,
      firstCustomerMessageAt: conversation.firstCustomerMessageAt ?? timestamp,
      contactLastReadAt: timestamp,
      unreadForContactCount: 0,
      operatorLastReadAt: incrementOperatorUnread
        ? conversation.operatorLastReadAt
        : timestamp,
      unreadForOperatorCount: incrementOperatorUnread
        ? (conversation.unreadForOperatorCount ?? 0) + 1
        : 0,
    })
  },
})

export const touchOperatorMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    timestamp: v.optional(v.number()),
    operatorId: v.optional(v.string()),
    operatorName: v.optional(v.string()),
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
    const operatorName =
      args.operatorName?.trim() ||
      conversation.assignedToName ||
      "Telegram operator"

    await ctx.db.patch(args.conversationId, {
      status:
        conversation.status === "unresolved"
          ? "escalated"
          : conversation.status,
      assignedToId: conversation.assignedToId ?? args.operatorId ?? null,
      assignedToName: conversation.assignedToName ?? operatorName,
      assignedAt: conversation.assignedAt ?? timestamp,
      escalatedAt:
        conversation.status === "unresolved"
          ? (conversation.escalatedAt ?? timestamp)
          : conversation.escalatedAt,
      operatorLastReadAt: timestamp,
      firstHumanResponseAt: conversation.firstHumanResponseAt ?? timestamp,
      lastOperatorMessageAt: timestamp,
      unreadForContactCount: (conversation.unreadForContactCount ?? 0) + 1,
      unreadForOperatorCount: 0,
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
