import { ConvexError, v } from "convex/values"
import { mutation, MutationCtx } from "../_generated/server"
import { components, internal } from "../_generated/api"
import { Doc, Id } from "../_generated/dataModel"
import { saveMessage } from "@convex-dev/agent"
import { supportAgent } from "../system/ai/agents/supportAgent"

const providerValidator = v.union(
  v.literal("openai_realtime"),
  v.literal("gemini_live")
)

const roleValidator = v.union(v.literal("user"), v.literal("assistant"))

const getValidatedContactSession = async (
  ctx: MutationCtx,
  {
    contactSessionId,
    organizationId,
  }: {
    contactSessionId: Id<"contactSessions">
    organizationId: string
  }
) => {
  const contactSession = await ctx.db.get(contactSessionId)

  if (!contactSession || contactSession.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid session",
    })
  }

  if (contactSession.organizationId !== organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid organization",
    })
  }

  return contactSession
}

const getValidatedConversation = async (
  ctx: MutationCtx,
  {
    conversationId,
    contactSessionId,
  }: {
    conversationId: Id<"aiVoiceConversations">
    contactSessionId: Id<"contactSessions">
  }
) => {
  const conversation = await ctx.db.get(conversationId)

  if (!conversation) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "AI conversation not found",
    })
  }

  await getValidatedContactSession(ctx, {
    contactSessionId,
    organizationId: conversation.organizationId,
  })

  if (conversation.contactSessionId !== contactSessionId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid session",
    })
  }

  return conversation
}

const ensureEscalatedConversation = async (
  ctx: MutationCtx,
  conversation: Doc<"aiVoiceConversations">
) => {
  const existingConversation = conversation.linkedConversationId
    ? await ctx.db.get(conversation.linkedConversationId)
    : null

  if (existingConversation) {
    return {
      conversationId: existingConversation._id,
      wasCreated: false,
      previousStatus: existingConversation.status,
      threadId: existingConversation.threadId,
    }
  }

  const { threadId } = await supportAgent.createThread(ctx, {
    userId: conversation.organizationId,
  })

  const transcriptMessages = await ctx.db
    .query("aiVoiceConversationMessages")
    .withIndex("by_conversation_id", (q) =>
      q.eq("conversationId", conversation._id)
    )
    .collect()

  for (const message of transcriptMessages) {
    await saveMessage(ctx, components.agent, {
      threadId,
      message: {
        role: message.role,
        content: message.text,
      },
    })
  }

  const linkedConversationId = await ctx.db.insert("conversations", {
    contactSessionId: conversation.contactSessionId,
    status: "escalated",
    organizationId: conversation.organizationId,
    threadId,
    assignedToId: null,
    assignedToName: null,
    assignedAt: null,
    contactLastReadAt: Date.now(),
    lastCustomerMessageAt: null,
    lastOperatorMessageAt: null,
    unreadForContactCount: 0,
    unreadForOperatorCount: 0,
  })

  await ctx.runMutation(
    (internal as any).system.integrationWebhooks.dispatchEvent,
    {
      organizationId: conversation.organizationId,
      eventType: "conversation.created",
      payload: {
        conversationId: linkedConversationId,
        threadId,
        contactSessionId: conversation.contactSessionId,
        status: "escalated",
        source: "ai_voice",
      },
    }
  )

  return {
    conversationId: linkedConversationId,
    wasCreated: true,
    previousStatus: "unresolved" as const,
    threadId,
  }
}

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    await getValidatedContactSession(ctx, {
      contactSessionId: args.contactSessionId,
      organizationId: args.organizationId,
    })

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    const now = Date.now()

    return await ctx.db.insert("aiVoiceConversations", {
      organizationId: args.organizationId,
      contactSessionId: args.contactSessionId,
      provider: args.provider,
      status: "unresolved",
      lastActivityAt: now,
    })
  },
})

export const appendMessage = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    contactSessionId: v.id("contactSessions"),
    role: roleValidator,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim()

    if (!text) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message text is required",
      })
    }

    const conversation = await getValidatedConversation(ctx, {
      conversationId: args.conversationId,
      contactSessionId: args.contactSessionId,
    })

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    const now = Date.now()

    const messageId = await ctx.db.insert("aiVoiceConversationMessages", {
      conversationId: args.conversationId,
      role: args.role,
      text,
    })

    await ctx.db.patch(args.conversationId, {
      lastActivityAt: now,
      lastMessagePreview: text.slice(0, 240),
      lastMessageRole: args.role,
    })

    return messageId
  },
})

export const escalateToHuman = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const conversation = await getValidatedConversation(ctx, args)

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    const now = Date.now()
    const previousVoiceStatus = conversation.status ?? "unresolved"
    const linkedConversation = await ensureEscalatedConversation(
      ctx,
      conversation
    )

    if (
      !linkedConversation.wasCreated &&
      linkedConversation.previousStatus === "unresolved"
    ) {
      await ctx.db.patch(linkedConversation.conversationId, {
        status: "escalated",
      })
    }

    await ctx.db.patch(args.conversationId, {
      status: "escalated",
      linkedConversationId: linkedConversation.conversationId,
      lastActivityAt: now,
      endedAt: conversation.endedAt ?? now,
      lastMessagePreview:
        conversation.lastMessagePreview ??
        "Escalated to a human operator from realtime voice.",
    })

    if (
      linkedConversation.wasCreated ||
      linkedConversation.previousStatus === "unresolved"
    ) {
      await ctx.runMutation(
        (internal as any).system.integrationWebhooks.dispatchEvent,
        {
          organizationId: conversation.organizationId,
          eventType: "conversation.status_changed",
          payload: {
            conversationId: linkedConversation.conversationId,
            threadId: linkedConversation.threadId,
            previousStatus: linkedConversation.previousStatus,
            status: "escalated",
            source: "ai_voice",
          },
        }
      )
    }

    return {
      conversationId: linkedConversation.conversationId,
      previousStatus: previousVoiceStatus,
      status: "escalated" as const,
    }
  },
})

export const resolve = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const conversation = await getValidatedConversation(ctx, args)

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    const now = Date.now()
    const previousStatus = conversation.status ?? "unresolved"

    await ctx.db.patch(args.conversationId, {
      status: "resolved",
      lastActivityAt: now,
      endedAt: conversation.endedAt ?? now,
      lastMessagePreview:
        conversation.lastMessagePreview ?? "Conversation resolved.",
    })

    return {
      previousStatus,
      status: "resolved" as const,
    }
  },
})

export const finish = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const conversation = await getValidatedConversation(ctx, {
      conversationId: args.conversationId,
      contactSessionId: args.contactSessionId,
    })

    const now = Date.now()

    await ctx.db.patch(args.conversationId, {
      lastActivityAt: now,
      endedAt: conversation.endedAt ?? now,
    })
  },
})
