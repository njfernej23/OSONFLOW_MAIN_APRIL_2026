import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { query, QueryCtx } from "../_generated/server"

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

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getOrganizationIdentity(ctx)

    const conversations = await ctx.db
      .query("aiVoiceConversations")
      .withIndex("by_organization_id_and_last_activity_at", (q) =>
        q.eq("organizationId", orgId)
      )
      .order("desc")
      .paginate(args.paginationOpts)

    const page = await Promise.all(
      conversations.page.map(async (conversation) => {
        const contactSession = await ctx.db.get(conversation.contactSessionId)

        return {
          ...conversation,
          contactSession,
        }
      })
    )

    return {
      ...conversations,
      page,
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

    const contactSession = await ctx.db.get(conversation.contactSessionId)

    return {
      ...conversation,
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
