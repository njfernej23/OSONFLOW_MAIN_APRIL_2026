import {
  paginationOptsValidator,
  PaginationOptions,
  PaginationResult,
} from "convex/server"
import { ConvexError, v } from "convex/values"
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server"
import { Doc } from "../_generated/dataModel"

const getOrganizationIdentity = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const orgId = identity.orgId as string | undefined

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return { identity, orgId }
}

const getOrganizationIdentityForMutation = async (ctx: MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const orgId = identity.orgId as string | undefined

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return { identity, orgId }
}

const normalizeSearchQuery = (query: string | undefined) =>
  query?.trim().toLowerCase() ?? ""

const includesSearchQuery = (
  value: string | null | undefined,
  normalizedQuery: string
) => value?.toLowerCase().includes(normalizedQuery) ?? false

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

const withLinkedHandoffStatus = async (
  ctx: QueryCtx,
  conversation: Doc<"aiVoiceConversations">,
  orgId: string
) => {
  if (!conversation.linkedConversationId) {
    return conversation
  }

  const linkedConversation = await ctx.db.get(conversation.linkedConversationId)

  if (!linkedConversation || linkedConversation.organizationId !== orgId) {
    return conversation
  }

  return {
    ...conversation,
    status: linkedConversation.status,
    escalatedAt: linkedConversation.escalatedAt ?? conversation.escalatedAt,
    resolvedAt: linkedConversation.resolvedAt ?? conversation.resolvedAt,
    resolutionSource:
      linkedConversation.resolutionSource ?? conversation.resolutionSource,
  }
}

export const getUnreadSummary = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getOrganizationIdentity(ctx)

    const conversations = await ctx.db
      .query("aiVoiceConversations")
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

export const markAsRead = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getOrganizationIdentityForMutation(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "AI conversation not found",
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid organization",
      })
    }

    await ctx.db.patch(args.conversationId, {
      operatorLastReadAt: Date.now(),
      unreadForOperatorCount: 0,
    })
  },
})

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getOrganizationIdentityForMutation(ctx)

    const conversations = await ctx.db
      .query("aiVoiceConversations")
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

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getOrganizationIdentity(ctx)
    const normalizedSearchQuery = normalizeSearchQuery(args.searchQuery)

    const conversations = normalizedSearchQuery
      ? null
      : await ctx.db
          .query("aiVoiceConversations")
          .withIndex("by_organization_id_and_last_activity_at", (q) =>
            q.eq("organizationId", orgId)
          )
          .order("desc")
          .paginate(args.paginationOpts)

    const sourceConversations = normalizedSearchQuery
      ? await ctx.db
          .query("aiVoiceConversations")
          .withIndex("by_organization_id_and_last_activity_at", (q) =>
            q.eq("organizationId", orgId)
          )
          .order("desc")
          .collect()
      : conversations!.page

    const page = await Promise.all(
      sourceConversations.map(async (conversation) => {
        const syncedConversation = await withLinkedHandoffStatus(
          ctx,
          conversation,
          orgId
        )
        const contactSession = await ctx.db.get(conversation.contactSessionId)
        let searchMatchPreview: string | undefined

        if (normalizedSearchQuery) {
          const searchableFields = [
            contactSession?.isAnonymous ? "anonymous voice visitor" : undefined,
            contactSession?.name,
            contactSession?.email,
            contactSession?.metadata?.currentUrl,
            syncedConversation.lastMessagePreview,
            syncedConversation.provider,
            syncedConversation.endedAt ? "ended" : "live",
            syncedConversation.status,
          ]

          const fieldMatch = searchableFields.some((value) =>
            includesSearchQuery(value, normalizedSearchQuery)
          )

          if (fieldMatch) {
            searchMatchPreview = getSearchSnippet(
              syncedConversation.lastMessagePreview,
              normalizedSearchQuery
            )
          } else {
            const transcriptMessages = await ctx.db
              .query("aiVoiceConversationMessages")
              .withIndex("by_conversation_id", (q) =>
                q.eq("conversationId", conversation._id)
              )
              .order("desc")
              .collect()
            const matchedMessage = transcriptMessages.find((message) =>
              includesSearchQuery(message.text, normalizedSearchQuery)
            )

            if (!matchedMessage) {
              return null
            }

            searchMatchPreview = getSearchSnippet(
              matchedMessage.text,
              normalizedSearchQuery
            )
          }
        }

        return {
          ...syncedConversation,
          contactSession,
          searchMatchPreview,
        }
      })
    )

    const validPage = page.filter((item): item is NonNullable<typeof item> =>
      Boolean(item)
    )

    if (normalizedSearchQuery) {
      return paginateArray(validPage, args.paginationOpts)
    }

    return {
      ...conversations!,
      page: validPage,
    }
  },
})

export const getOne = query({
  args: {
    conversationId: v.id("aiVoiceConversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "AI conversation not found",
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid organization",
      })
    }

    const syncedConversation = await withLinkedHandoffStatus(
      ctx,
      conversation,
      orgId
    )
    const contactSession = await ctx.db.get(conversation.contactSessionId)

    return {
      ...syncedConversation,
      contactSession,
    }
  },
})

export const getMessages = query({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getOrganizationIdentity(ctx)

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "AI conversation not found",
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid organization",
      })
    }

    return await ctx.db
      .query("aiVoiceConversationMessages")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .paginate(args.paginationOpts)
  },
})
