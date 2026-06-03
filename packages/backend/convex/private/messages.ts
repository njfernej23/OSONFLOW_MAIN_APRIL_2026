import { ConvexError, v } from "convex/values"
import { mutation, query, action } from "../_generated/server"
import { components, internal } from "../_generated/api"
import { supportAgent } from "../system/ai/agents/supportAgent"
import { paginationOptsValidator } from "convex/server"
import { saveMessage } from "@convex-dev/agent"
import { generateText } from "ai"
import { getOpenAIChatModelFromSecretValue } from "../lib/openai"

export const enhanceResponse = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = identity.orgId as string

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: orgId,
      }
    )

    if (subscription?.status !== "active") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Missing subscription",
      })
    }

    const openAIPlugin: any = await ctx.runQuery(
      (internal as any).system.plugins.getByOrganizationIdAndService,
      {
        organizationId: orgId,
        service: "openai_realtime",
      }
    )

    const response: any = await generateText({
      model: getOpenAIChatModelFromSecretValue(openAIPlugin?.secretValue),
      messages: [
        {
          role: "system",
          content:
            "Enhance the operator's message to be more professional, clear, and helpful while maintaining their intent and key information.",
        },
        {
          role: "user",
          content: args.prompt,
        },
      ],
    })

    return response.text
  },
})

export const create = mutation({
  args: {
    prompt: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = identity.orgId as string

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

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

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      })
    }

    const now = Date.now()

    await saveMessage(ctx, components.agent, {
      threadId: conversation.threadId,
      agentName: identity.familyName,
      message: {
        role: "assistant",
        content: args.prompt,
      },
    })

    await ctx.db.patch(args.conversationId, {
      status:
        conversation.status === "unresolved"
          ? "escalated"
          : conversation.status,
      assignedToId: conversation.assignedToId ?? identity.subject,
      assignedToName:
        conversation.assignedToName ??
        identity.name?.trim() ??
        `Operator ${identity.subject.slice(0, 8)}`,
      assignedAt: conversation.assignedAt ?? now,
      escalatedAt:
        conversation.status === "unresolved"
          ? (conversation.escalatedAt ?? now)
          : conversation.escalatedAt,
      operatorLastReadAt: now,
      firstHumanResponseAt: conversation.firstHumanResponseAt ?? now,
      lastOperatorMessageAt: now,
      unreadForContactCount: (conversation.unreadForContactCount ?? 0) + 1,
      unreadForOperatorCount: 0,
    })

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: orgId,
        eventType: "message.sent",
        payload: {
          conversationId: args.conversationId,
          threadId: conversation.threadId,
          prompt: args.prompt,
          operator: identity.familyName,
        },
      }
    )

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.telegram.sendConversationMessage,
      {
        conversationId: args.conversationId,
        text: args.prompt,
      }
    )

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.intelligence.analyzeChatConversation,
      {
        conversationId: args.conversationId,
      }
    )
  },
})

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = identity.orgId as string

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique()

    if (!conversation) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        splitCursor: null,
      }
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      })
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    })

    return paginated
  },
})
