import { ConvexError, v } from "convex/values"
import { action, query } from "../_generated/server"
import { api, components, internal } from "../_generated/api"
import { supportAgent } from "../system/ai/agents/supportAgent"
import { paginationOptsValidator } from "convex/server"
import { escalateConversation } from "../system/ai/tools/escalateConversation"
import { resolveConversation } from "../system/ai/tools/resolveConversation"
import { saveMessage } from "@convex-dev/agent"
import { search } from "../system/ai/tools/search"
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constants"
import {
  getOpenAIChatModelFromSecretValue,
  getOpenAIKeyFromSecretValue,
} from "../lib/openai"

const extractAgentMessageText = (message: any) => {
  const content = message?.text ?? message?.message?.content

  if (typeof content === "string") {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part
        }

        if (typeof part?.text === "string") {
          return part.text
        }

        return ""
      })
      .filter(Boolean)
      .join("\n")
      .trim()
  }

  return ""
}

const getLatestAssistantMessage = async (ctx: any, threadId: string) => {
  const messages = await supportAgent.listMessages(ctx, {
    threadId,
    paginationOpts: { numItems: 20, cursor: null },
  })
  const message = messages.page.find(
    (item: any) => item?.message?.role === "assistant"
  )

  if (!message) {
    return null
  }

  return {
    id: String(message._id ?? message.id ?? message.order ?? ""),
    text: extractAgentMessageText(message),
  }
}

const getAmountValue = (value: any): number => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === "object") {
    return Math.max(
      getAmountValue(value.amount),
      getAmountValue(value.value),
      getAmountValue(value.cents)
    )
  }

  return 0
}

const hasPaidPlanSignal = (item: any): boolean => {
  const planText = [
    item?.plan?.slug,
    item?.plan?.key,
    item?.plan?.name,
    item?.planId,
    item?.plan_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (/\b(free|default)\b/.test(planText)) {
    return false
  }

  return /\b(pro|premium|paid|plus|business|team|growth)\b/.test(planText)
}

const isPaidActiveSubscriptionItem = (item: any): boolean => {
  if (item?.status !== "active") {
    return false
  }

  return (
    getAmountValue(item?.amount) > 0 ||
    getAmountValue(item?.nextPayment?.amount ?? item?.next_payment?.amount) >
      0 ||
    getAmountValue(item?.lifetimePaid ?? item?.lifetime_paid) > 0 ||
    hasPaidPlanSignal(item)
  )
}

const hasPaidOrganizationSubscription = async (
  organizationId: string
): Promise<boolean> => {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY

  if (!clerkSecretKey) {
    return false
  }

  const response = await fetch(
    `https://api.clerk.com/v1/organizations/${organizationId}/billing/subscription`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    }
  )

  if (!response.ok) {
    return false
  }

  const subscription = await response.json().catch(() => null)
  const subscriptionItems =
    subscription?.subscriptionItems ??
    subscription?.subscription_items ??
    subscription?.items ??
    []

  return Array.isArray(subscriptionItems)
    ? subscriptionItems.some(isPaidActiveSubscriptionItem)
    : false
}

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      {
        contactSessionId: args.contactSessionId,
      }
    )

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      {
        threadId: args.threadId,
      }
    )

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      })
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      })
    }

    // This refreshes the user's session if they are within the threshold
    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    const now = Date.now()

    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
      }
    )

    let subscriptionStatus = subscription?.status ?? null

    if (subscriptionStatus !== "active") {
      const hasPaidSubscription = await hasPaidOrganizationSubscription(
        conversation.organizationId
      )

      if (hasPaidSubscription) {
        subscriptionStatus = "active"
        await ctx.runMutation(internal.system.subscriptions.upsert, {
          organizationId: conversation.organizationId,
          status: "active",
        })
      }
    }

    const openAIPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      {
        organizationId: conversation.organizationId,
        service: "openai_realtime",
      }
    )

    const openAISecretValue = openAIPlugin?.secretValue ?? null
    const hasOrganizationOpenAICredentials = Boolean(
      getOpenAIKeyFromSecretValue(openAISecretValue)
    )
    const hasOpenAICredentials = Boolean(
      hasOrganizationOpenAICredentials || process.env.OPENAI_API_KEY
    )

    const shouldTriggerAgent =
      conversation.status === "unresolved" &&
      subscriptionStatus === "active" &&
      hasOpenAICredentials

    const widgetSettings = await ctx.runQuery(
      api.public.widgetSettings.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
      }
    )

    const systemPrompt =
      widgetSettings?.systemPrompt?.trim() || SUPPORT_AGENT_PROMPT

    let assistantReplyText: string | null = null

    if (shouldTriggerAgent) {
      const previousAssistantMessage = await getLatestAssistantMessage(
        ctx,
        args.threadId
      )
      const result = await supportAgent.generateText(
        ctx,
        { threadId: args.threadId },
        {
          model: getOpenAIChatModelFromSecretValue(openAISecretValue),
          system: systemPrompt,
          prompt: args.prompt,
          tools: {
            escalateConversationTool: escalateConversation,
            resolveConversationTool: resolveConversation,
            searchTool: search,
          },
        }
      )
      const latestAssistantMessage = await getLatestAssistantMessage(
        ctx,
        args.threadId
      )
      assistantReplyText =
        result.text?.trim() ||
        (latestAssistantMessage &&
        latestAssistantMessage.id !== previousAssistantMessage?.id
          ? latestAssistantMessage.text
          : null)
    } else {
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        prompt: args.prompt,
      })

      if (conversation.status === "unresolved" && !shouldTriggerAgent) {
        assistantReplyText =
          "Thanks, your message was received. A human operator will reply soon."

        await saveMessage(ctx, components.agent, {
          threadId: args.threadId,
          message: {
            role: "assistant",
            content: assistantReplyText,
          },
        })
      }
    }

    await ctx.runMutation(internal.system.conversations.touchCustomerMessage, {
      conversationId: conversation._id,
      timestamp: now,
    })

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.intelligence.analyzeChatConversation,
      {
        conversationId: conversation._id,
      }
    )

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: conversation.organizationId,
        eventType: "message.received",
        payload: {
          conversationId: conversation._id,
          threadId: args.threadId,
          contactSessionId: args.contactSessionId,
          prompt: args.prompt,
        },
      }
    )
  },
})

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId)
    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    })

    return paginated
  },
})
