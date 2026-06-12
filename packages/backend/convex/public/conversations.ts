import { mutation } from "../_generated/server"
import { ConvexError, v } from "convex/values"
import { query } from "../_generated/server"
import { supportAgent } from "../system/ai/agents/supportAgent"
import { MessageDoc, saveMessage } from "@convex-dev/agent"
import { components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { paginationOptsValidator } from "convex/server"
import { enforceRateLimit } from "../lib/rateLimits"
import { getLatestTextAgentMessage } from "../lib/agentMessageText"

const contactSessionMetadataValidator = v.optional(
  v.object({
    userAgent: v.optional(v.string()),
    language: v.optional(v.string()),
    languages: v.optional(v.string()),
    platform: v.optional(v.string()),
    vendor: v.optional(v.string()),
    telegramUserId: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    telegramLanguageCode: v.optional(v.string()),
    instagramUserId: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
    instagramAccountId: v.optional(v.string()),
    screenResolution: v.optional(v.string()),
    viewportSize: v.optional(v.string()),
    timezone: v.optional(v.string()),
    timezoneOffset: v.optional(v.number()),
    cookieEnabled: v.optional(v.boolean()),
    referrer: v.optional(v.string()),
    currentUrl: v.optional(v.string()),
    source: v.optional(v.string()),
    visitorId: v.optional(v.string()),
  })
)

export const getMany = query({
  args: {
    contactSessionId: v.id("contactSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId)

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", args.contactSessionId)
      )
      .order("desc")
      .paginate(args.paginationOpts)

    const conversationsWithLastMessage = await Promise.all(
      conversations.page.map(async (conversation) => {
        let lastMessage: MessageDoc | null = null

        const messages = await supportAgent.listMessages(ctx, {
          threadId: conversation.threadId,
          excludeToolMessages: true,
          paginationOpts: { numItems: 20, cursor: null },
        })

        lastMessage = getLatestTextAgentMessage(messages.page)

        return {
          _id: conversation._id,
          _creationTime: conversation._creationTime,
          status: conversation.status,
          organizationId: conversation.organizationId,
          threadId: conversation.threadId,
          contactLastReadAt: conversation.contactLastReadAt ?? null,
          operatorLastReadAt: conversation.operatorLastReadAt ?? null,
          lastCustomerMessageAt: conversation.lastCustomerMessageAt ?? null,
          lastOperatorMessageAt: conversation.lastOperatorMessageAt ?? null,
          unreadForContactCount: conversation.unreadForContactCount ?? 0,
          unreadForOperatorCount: conversation.unreadForOperatorCount ?? 0,
          lastMessage,
        }
      })
    )

    return {
      ...conversations,
      page: conversationsWithLastMessage,
    }
  },
})

export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId)

    if (!session || session.expiresAt < Date.now()) {
      return {
        unreadConversationCount: 0,
        unreadMessageCount: 0,
      }
    }

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }
    if (conversation.contactSessionId !== session._id) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Incorrect session",
      })
    }

    return {
      _id: conversation._id,
      status: conversation.status,
      threadId: conversation.threadId,
      contactLastReadAt: conversation.contactLastReadAt ?? null,
      operatorLastReadAt: conversation.operatorLastReadAt ?? null,
      lastCustomerMessageAt: conversation.lastCustomerMessageAt ?? null,
      lastOperatorMessageAt: conversation.lastOperatorMessageAt ?? null,
      unreadForContactCount: conversation.unreadForContactCount ?? 0,
      unreadForOperatorCount: conversation.unreadForOperatorCount ?? 0,
    }
  },
})

export const getUnreadSummary = query({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId)

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", args.contactSessionId)
      )
      .collect()

    const unreadConversations = conversations.filter(
      (conversation) => (conversation.unreadForContactCount ?? 0) > 0
    )

    return {
      unreadConversationCount: unreadConversations.length,
      unreadMessageCount: unreadConversations.reduce(
        (total, conversation) =>
          total + (conversation.unreadForContactCount ?? 0),
        0
      ),
    }
  },
})

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId)

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    if (conversation.contactSessionId !== session._id) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Incorrect session",
      })
    }

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    await ctx.runMutation(internal.system.conversations.markContactRead, {
      conversationId: args.conversationId,
    })
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.optional(v.id("contactSessions")),
    metadata: contactSessionMetadataValidator,
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    conversationId: Id<"conversations">
    contactSessionId: Id<"contactSessions">
    source: "workflow" | "widget"
  }> => {
    const activeWorkflow = await ctx.db
      .query("workflows")
      .withIndex("by_organization_id_and_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true)
      )
      .first()
    const hasActiveWorkflow = Boolean(activeWorkflow?.publishedDefinition)
    const contactSessionId: Id<"contactSessions"> | null =
      args.contactSessionId ??
      (hasActiveWorkflow
        ? await ctx.runMutation(
            (internal as any).public.contactSessions.createAnonymousRecord,
            {
              organizationId: args.organizationId,
              metadata: {
                ...args.metadata,
                source: args.metadata?.source ?? "workflow_widget",
              },
            }
          )
        : null)

    if (!contactSessionId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Contact details required",
      })
    }

    const session = await ctx.db.get(contactSessionId)

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    if (session.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid organization",
      })
    }

    await enforceRateLimit(ctx, "widgetConversationCreateBySession", {
      key: `${args.organizationId}:${contactSessionId}`,
      message:
        "Too many conversations started. Please wait before starting another chat.",
    })

    // This refreshes the user's session if they are within the threshold
    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId,
    })

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()

    const { threadId } = await supportAgent.createThread(ctx, {
      userId: args.organizationId,
    })

    if (!hasActiveWorkflow) {
      await saveMessage(ctx, components.agent, {
        threadId,
        message: {
          role: "assistant",
          content:
            widgetSettings?.greetMessage || "Hello, how can I help you today?",
        },
      })
    }

    const conversationId: Id<"conversations"> = await ctx.db.insert(
      "conversations",
      {
        contactSessionId: session._id,
        status: "unresolved",
        organizationId: args.organizationId,
        threadId,
        assignedToId: null,
        assignedToName: null,
        assignedAt: null,
        contactLastReadAt: Date.now(),
        lastCustomerMessageAt: null,
        lastOperatorMessageAt: null,
        unreadForContactCount: 0,
        unreadForOperatorCount: 0,
      }
    )

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: args.organizationId,
        eventType: "conversation.created",
        payload: {
          conversationId,
          threadId,
          contactSessionId: session._id,
          status: "unresolved",
          source: hasActiveWorkflow ? "workflow" : "widget",
          workflowId: hasActiveWorkflow ? activeWorkflow?._id : undefined,
        },
      }
    )

    if (hasActiveWorkflow) {
      await ctx.runMutation(
        (internal as any).system.workflowRuntime.startForConversation,
        {
          conversationId,
        }
      )
    }

    return {
      conversationId,
      contactSessionId: session._id,
      source: hasActiveWorkflow ? "workflow" : "widget",
    }
  },
})
