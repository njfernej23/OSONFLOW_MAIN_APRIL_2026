import { supportAgent } from "../system/ai/agents/supportAgent"
import { query, mutation } from "../_generated/server"
import { v, ConvexError } from "convex/values"
import { MessageDoc } from "@convex-dev/agent"
import {
  paginationOptsValidator,
  PaginationOptions,
  PaginationResult,
} from "convex/server"
import { Doc } from "../_generated/dataModel"
import { components, internal } from "../_generated/api"
import { requireOrganizationIdentity } from "../lib/organizationIdentity"
import {
  extractAgentMessageText,
  getLatestTextAgentMessage,
} from "../lib/agentMessageText"

const assignmentFilterValidator = v.union(
  v.literal("all"),
  v.literal("assigned_to_me"),
  v.literal("unassigned")
)

const normalizeSearchQuery = (query: string | undefined) =>
  query?.trim().toLowerCase() ?? ""

const includesSearchQuery = (
  value: string | null | undefined,
  normalizedQuery: string
) => value?.toLowerCase().includes(normalizedQuery) ?? false

const getRoleFromMessage = (message: any): "user" | "assistant" | "system" => {
  const role = message?.message?.role ?? message?.role

  if (role === "user" || role === "assistant") {
    return role
  }

  return "system"
}

const getSearchSnippet = (
  value: string | undefined,
  normalizedQuery: string
) => {
  if (!value) {
    return undefined
  }

  const matchIndex = value.toLowerCase().indexOf(normalizedQuery)

  if (matchIndex === -1) {
    return value
  }

  const contextLength = 72
  const start = Math.max(0, matchIndex - contextLength)
  const end = Math.min(
    value.length,
    matchIndex + normalizedQuery.length + contextLength
  )
  const prefix = start > 0 ? "... " : ""
  const suffix = end < value.length ? " ..." : ""

  return `${prefix}${value.slice(start, end)}${suffix}`
}

const paginateArray = <T>(
  items: T[],
  paginationOpts: PaginationOptions
): PaginationResult<T> => {
  const start = paginationOpts.cursor
    ? Number.parseInt(paginationOpts.cursor, 10)
    : 0
  const safeStart = Number.isFinite(start) ? start : 0
  const end = safeStart + paginationOpts.numItems
  const isDone = end >= items.length

  return {
    page: items.slice(safeStart, end),
    isDone,
    continueCursor: isDone ? "" : String(end),
    splitCursor: null,
  }
}

export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      return null
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORZIED",
        message: "Invalid Organization ID",
      })
    }

    const previousStatus = conversation.status
    const now = Date.now()

    await ctx.db.patch(args.conversationId, {
      status: args.status,
      escalatedAt:
        args.status === "escalated"
          ? (conversation.escalatedAt ?? now)
          : conversation.escalatedAt,
      resolvedAt:
        args.status === "resolved"
          ? (conversation.resolvedAt ?? now)
          : conversation.resolvedAt,
      resolutionSource:
        args.status === "resolved" ? "human" : conversation.resolutionSource,
    })

    const linkedAiVoiceConversation = await ctx.db
      .query("aiVoiceConversations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .filter((q) => q.eq(q.field("linkedConversationId"), args.conversationId))
      .first()

    if (linkedAiVoiceConversation) {
      await ctx.db.patch(linkedAiVoiceConversation._id, {
        status: args.status,
        lastActivityAt: now,
        endedAt:
          args.status === "resolved"
            ? (linkedAiVoiceConversation.endedAt ?? now)
            : linkedAiVoiceConversation.endedAt,
        escalatedAt:
          args.status === "escalated"
            ? (linkedAiVoiceConversation.escalatedAt ?? now)
            : linkedAiVoiceConversation.escalatedAt,
        resolvedAt:
          args.status === "resolved"
            ? (linkedAiVoiceConversation.resolvedAt ?? now)
            : linkedAiVoiceConversation.resolvedAt,
        resolutionSource:
          args.status === "resolved"
            ? "human"
            : linkedAiVoiceConversation.resolutionSource,
      })
    }

    if (previousStatus !== args.status) {
      await ctx.runMutation(
        (internal as any).system.integrationWebhooks.dispatchEvent,
        {
          organizationId: orgId,
          eventType: "conversation.status_changed",
          payload: {
            conversationId: args.conversationId,
            threadId: conversation.threadId,
            previousStatus,
            status: args.status,
            source: "operator",
          },
        }
      )
    }

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.intelligence.analyzeChatConversation,
      {
        conversationId: args.conversationId,
      }
    )

    if (
      linkedAiVoiceConversation &&
      (linkedAiVoiceConversation.status ?? "unresolved") !== args.status
    ) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).system.intelligence.analyzeVoiceConversation,
        {
          conversationId: linkedAiVoiceConversation._id,
        }
      )
    }
  },
})

export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      return null
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORZIED",
        message: "Invalid Organization Id",
      })
    }
    const contactSession = await ctx.db.get(conversation.contactSessionId)
    if (!contactSession) {
      return null
    }

    return {
      ...conversation,
      contactSession,
    }
  },
})

export const exportOne = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      })
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId)
    const messages = await supportAgent.listMessages(ctx, {
      threadId: conversation.threadId,
      paginationOpts: { numItems: 1000, cursor: null },
    })

    return {
      exportedAt: new Date().toISOString(),
      type: "conversation",
      conversation: {
        id: conversation._id,
        createdAt: new Date(conversation._creationTime).toISOString(),
        threadId: conversation.threadId,
        status: conversation.status,
        assignedToId: conversation.assignedToId ?? null,
        assignedToName: conversation.assignedToName ?? null,
        assignedAt: conversation.assignedAt
          ? new Date(conversation.assignedAt).toISOString()
          : null,
        firstCustomerMessageAt: conversation.firstCustomerMessageAt
          ? new Date(conversation.firstCustomerMessageAt).toISOString()
          : null,
        firstHumanResponseAt: conversation.firstHumanResponseAt
          ? new Date(conversation.firstHumanResponseAt).toISOString()
          : null,
        escalatedAt: conversation.escalatedAt
          ? new Date(conversation.escalatedAt).toISOString()
          : null,
        resolvedAt: conversation.resolvedAt
          ? new Date(conversation.resolvedAt).toISOString()
          : null,
        resolutionSource: conversation.resolutionSource ?? null,
      },
      contactSession: contactSession
        ? {
            id: contactSession._id,
            name: contactSession.name,
            email: contactSession.email,
            isAnonymous: contactSession.isAnonymous ?? false,
            metadata: contactSession.metadata ?? null,
          }
        : null,
      messages: messages.page
        .slice()
        .reverse()
        .map((message) => ({
          id: message._id,
          createdAt:
            typeof (message as any)._creationTime === "number"
              ? new Date((message as any)._creationTime).toISOString()
              : null,
          role: getRoleFromMessage(message),
            text: extractAgentMessageText(message),
        }))
        .filter((message) => message.text.length > 0),
    }
  },
})

export const remove = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      })
    }

    const workflowSessions = await ctx.db
      .query("workflowSessions")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect()

    const insights = await ctx.db
      .query("conversationInsights")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect()

    const linkedVoiceConversations = await ctx.db
      .query("aiVoiceConversations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .filter((q) => q.eq(q.field("linkedConversationId"), args.conversationId))
      .collect()

    const telegramContacts = await ctx.db
      .query("telegramContacts")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .filter((q) => q.eq(q.field("activeConversationId"), args.conversationId))
      .collect()

    const instagramContacts = await ctx.db
      .query("instagramContacts")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .filter((q) => q.eq(q.field("activeConversationId"), args.conversationId))
      .collect()

    await Promise.all([
      ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
        threadId: conversation.threadId,
        limit: 100,
      }),
      ...workflowSessions.map((session) => ctx.db.delete(session._id)),
      ...insights.map((insight) => ctx.db.delete(insight._id)),
      ...linkedVoiceConversations.map((voiceConversation) =>
        ctx.db.patch(voiceConversation._id, {
          linkedConversationId: undefined,
        })
      ),
      ...telegramContacts.map((contact) =>
        ctx.db.patch(contact._id, {
          activeConversationId: undefined,
        })
      ),
      ...instagramContacts.map((contact) =>
        ctx.db.patch(contact._id, {
          activeConversationId: undefined,
        })
      ),
    ])

    await ctx.db.delete(args.conversationId)
  },
})

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      })
    }

    await ctx.runMutation(internal.system.conversations.markOperatorRead, {
      conversationId: args.conversationId,
    })
  },
})

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect()

    const timestamp = Date.now()
    await Promise.all(
      conversations
        .filter(
          (conversation) => (conversation.unreadForOperatorCount ?? 0) > 0
        )
        .map((conversation) =>
          ctx.db.patch(conversation._id, {
            operatorLastReadAt: timestamp,
            unreadForOperatorCount: 0,
          })
        )
    )
  },
})

export const getUnreadSummary = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect()

    const unreadConversations = conversations.filter(
      (conversation) => (conversation.unreadForOperatorCount ?? 0) > 0
    )

    return {
      unreadConversationCount: unreadConversations.length,
      unreadMessageCount: unreadConversations.reduce(
        (total, conversation) =>
          total + (conversation.unreadForOperatorCount ?? 0),
        0
      ),
    }
  },
})

export const updateAssignment = mutation({
  args: {
    conversationId: v.id("conversations"),
    action: v.union(
      v.literal("assign_to_me"),
      v.literal("take_over"),
      v.literal("unassign")
    ),
  },
  handler: async (ctx, args) => {
    const { identity, orgId } = await requireOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORZIED",
        message: "Invalid Organization ID",
      })
    }

    if (args.action === "unassign") {
      await ctx.db.patch(args.conversationId, {
        assignedToId: null,
        assignedToName: null,
        assignedAt: null,
      })
      return
    }

    const operatorName =
      identity.name?.trim() || `Operator ${identity.subject.slice(0, 8)}`

    await ctx.db.patch(args.conversationId, {
      assignedToId: identity.subject,
      assignedToName: operatorName,
      assignedAt: Date.now(),
    })
  },
})

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("unresolved"),
        v.literal("escalated"),
        v.literal("resolved")
      )
    ),
    assignmentFilter: v.optional(assignmentFilterValidator),
  },
  handler: async (ctx, args) => {
    const { identity, orgId } = await requireOrganizationIdentity(ctx)

    const assignmentFilter = args.assignmentFilter ?? "all"
    const normalizedSearchQuery = normalizeSearchQuery(args.searchQuery)

    let conversations: PaginationResult<Doc<"conversations">> | null = null
    let sourceConversations: Doc<"conversations">[]

    if (normalizedSearchQuery) {
      sourceConversations = await ctx.db
        .query("conversations")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
        .order("desc")
        .collect()
    } else {
      if (assignmentFilter === "assigned_to_me") {
        if (args.status) {
          conversations = await ctx.db
            .query("conversations")
            .withIndex("by_status_and_organization_id_and_assigned_to", (q) =>
              q
                .eq("status", args.status as Doc<"conversations">["status"])
                .eq("organizationId", orgId)
                .eq("assignedToId", identity.subject)
            )
            .order("desc")
            .paginate(args.paginationOpts)
        } else {
          conversations = await ctx.db
            .query("conversations")
            .withIndex("by_organization_id_and_assigned_to", (q) =>
              q.eq("organizationId", orgId).eq("assignedToId", identity.subject)
            )
            .order("desc")
            .paginate(args.paginationOpts)
        }
      } else if (args.status) {
        conversations = await ctx.db
          .query("conversations")
          .withIndex("by_status_and_organization_id", (q) =>
            q
              .eq("status", args.status as Doc<"conversations">["status"])
              .eq("organizationId", orgId)
          )
          .order("desc")
          .paginate(args.paginationOpts)
      } else {
        conversations = await ctx.db
          .query("conversations")
          .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
          .order("desc")
          .paginate(args.paginationOpts)
      }

      sourceConversations = conversations.page
    }

    const conversationsWithAdditionalData = await Promise.all(
      sourceConversations.map(async (conversation) => {
        let lastMessage: MessageDoc | null = null
        let searchMatchPreview: string | undefined

        const contactSession = await ctx.db.get(conversation.contactSessionId)

        if (!contactSession) {
          return null
        }

        const messages = await supportAgent.listMessages(ctx, {
          threadId: conversation.threadId,
          excludeToolMessages: true,
          paginationOpts: { numItems: 20, cursor: null },
        })

        lastMessage = getLatestTextAgentMessage(messages.page)

        if (normalizedSearchQuery) {
          const searchableFields = [
            contactSession.name,
            contactSession.email,
            lastMessage?.text,
            conversation.assignedToName,
            conversation.assignedToId === identity.subject
              ? "assigned to me"
              : undefined,
            conversation.status,
          ]

          const fieldMatch = searchableFields.some((value) =>
            includesSearchQuery(value, normalizedSearchQuery)
          )

          if (fieldMatch) {
            searchMatchPreview = getSearchSnippet(
              lastMessage?.text,
              normalizedSearchQuery
            )
          } else {
            const matchedMessages = await ctx.runQuery(
              components.agent.messages.textSearch,
              {
                threadId: conversation.threadId,
                text: args.searchQuery!.trim(),
                limit: 1,
              }
            )

            const matchedMessageText = matchedMessages[0]?.text

            if (!matchedMessageText) {
              return null
            }

            searchMatchPreview = getSearchSnippet(
              matchedMessageText,
              normalizedSearchQuery
            )
          }
        }

        return {
          ...conversation,
          contactSession,
          lastMessage,
          searchMatchPreview,
        }
      })
    )

    const validConversations = conversationsWithAdditionalData.filter(
      (conv): conv is NonNullable<typeof conv> => conv !== null
    )

    const filteredConversations = validConversations.filter((conversation) => {
      if (assignmentFilter === "unassigned" && conversation.assignedToId) {
        return false
      }

      if (
        normalizedSearchQuery &&
        args.status &&
        conversation.status !== args.status
      ) {
        return false
      }

      if (
        normalizedSearchQuery &&
        assignmentFilter === "assigned_to_me" &&
        conversation.assignedToId !== identity.subject
      ) {
        return false
      }

      return true
    })

    if (normalizedSearchQuery) {
      return paginateArray(filteredConversations, args.paginationOpts)
    }

    return {
      ...conversations!,
      page: filteredConversations,
    }
  },
})
