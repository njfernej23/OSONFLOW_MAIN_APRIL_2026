import { ConvexError, v } from "convex/values"
import { action, query } from "../_generated/server"
import { components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { supportAgent } from "../system/ai/agents/supportAgent"
import { paginationOptsValidator } from "convex/server"
import { escalateConversation } from "../system/ai/tools/escalateConversation"
import { resolveConversation } from "../system/ai/tools/resolveConversation"
import { saveMessage } from "@convex-dev/agent"
import { search } from "../system/ai/tools/search"
import {
  buildToolAwareSystemPrompt,
  filterAssistantToolsByIds,
  getEnabledChatTools,
  requiresLiveToolExecution,
  resolveChatToolsForWidget,
} from "../system/assistantTools/getChatTools"
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constants"
import {
  OPENAI_CHAT_MODEL,
  getOpenAIChatModelFromSecretValue,
  getOpenAIKeyFromSecretValue,
} from "../lib/openai"
import { enforceRateLimit } from "../lib/rateLimits"
import { getRagForOrganization } from "../system/ai/rag"
import {
  AI_REPLY_CACHE_SEMANTIC_THRESHOLD,
  getReplyCacheDocumentText,
  getReplyCacheNamespace,
  isCacheablePrompt,
} from "../system/ai/replyCache"
import {
  extractAgentMessageText,
  getLatestTextAgentMessage,
} from "../lib/agentMessageText"
import {
  requireContactSessionConversation,
  requireContactSessionThread,
} from "../lib/widgetAuth"
import { buildModelImageParts } from "../lib/attachmentUploads"

const getAgentMessageRole = (message: any): string => {
  const role = message?.message?.role ?? message?.role

  return typeof role === "string" ? role : "assistant"
}

const getAgentMessageCreatedAt = (message: any): number | null => {
  const createdAt = message?._creationTime ?? message?.createdAt

  return typeof createdAt === "number" ? createdAt : null
}

const getAgentMessageOrder = (message: any): number | null => {
  const order = message?.order

  return typeof order === "number" ? order : null
}

const getAgentMessageId = (message: any, fallbackIndex: number): string => {
  const id = message?._id ?? message?.id ?? message?.order

  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : `message-${fallbackIndex}`
}

const getLatestAssistantMessage = async (ctx: any, threadId: string) => {
  const messages = await supportAgent.listMessages(ctx, {
    threadId,
    excludeToolMessages: true,
    paginationOpts: { numItems: 20, cursor: null },
  })
  const message = getLatestTextAgentMessage(
    messages.page.filter((item: any) => item?.message?.role === "assistant")
  )

  if (!message) {
    return null
  }

  return {
    id: String(message._id ?? message.id ?? message.order ?? ""),
    text: extractAgentMessageText(message),
  }
}

const findSemanticCachedReply = async (
  ctx: any,
  args: {
    organizationId: string
    prompt: string
    model: string
    systemPrompt: string
    openAISecretValue?: string | null
  }
) => {
  if (!isCacheablePrompt(args.prompt)) {
    return null
  }

  const rag = await getRagForOrganization(args.openAISecretValue)
  const namespace = getReplyCacheNamespace(args.organizationId)
  const existingNamespace = await rag.getNamespace(ctx, { namespace })

  if (!existingNamespace) {
    return null
  }

  const searchResult = await rag.search(ctx, {
    namespace,
    query: args.prompt,
    limit: 20,
    vectorScoreThreshold: AI_REPLY_CACHE_SEMANTIC_THRESHOLD,
  })

  const resultByEntryId = new Map(
    searchResult.results.map((result: any) => [
      String(result.entryId),
      result.score ?? 0,
    ])
  )

  const rankedEntries = [...searchResult.entries].sort(
    (a: any, b: any) =>
      (resultByEntryId.get(String(b.entryId)) ?? 0) -
      (resultByEntryId.get(String(a.entryId)) ?? 0)
  )

  for (const entry of rankedEntries) {
    const cacheKey =
      typeof entry.metadata?.cacheKey === "string"
        ? entry.metadata.cacheKey
        : null

    if (!cacheKey) {
      continue
    }

    const cachedReply = await ctx.runQuery(
      (internal as any).system.ai.replyCache.getByCacheKey,
      {
        organizationId: args.organizationId,
        cacheKey,
        model: args.model,
        systemPrompt: args.systemPrompt,
      }
    )

    if (cachedReply?.answer) {
      return cachedReply
    }
  }

  return null
}

const indexSemanticCachedReply = async (
  ctx: any,
  args: {
    organizationId: string
    prompt: string
    cacheId: string
    cacheKey: string
    model: string
    openAISecretValue?: string | null
  }
) => {
  if (!isCacheablePrompt(args.prompt)) {
    return
  }

  const rag = await getRagForOrganization(args.openAISecretValue)
  const { entryId } = await rag.add(ctx, {
    namespace: getReplyCacheNamespace(args.organizationId),
    key: args.cacheKey,
    title: args.prompt.slice(0, 80),
    text: getReplyCacheDocumentText(args.prompt),
    metadata: {
      cacheKey: args.cacheKey,
      model: args.model,
      sourceType: "aiReplyCache",
    },
  })

  await ctx.runMutation(
    (internal as any).system.ai.replyCache.markSemanticIndexed,
    {
      cacheId: args.cacheId,
      semanticEntryId: String(entryId),
    }
  )
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

const describeAttachmentsForModel = (count: number, promptText: string) => {
  const notice = `[The visitor attached ${count} image${count === 1 ? "" : "s"}. You cannot see ${count === 1 ? "it" : "them"} — ask about ${count === 1 ? "it" : "them"} in words if you need the detail.]`

  return promptText ? `${promptText}\n\n${notice}` : notice
}

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
    workflowButtonId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("chatAttachments"))),
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

    if (
      conversation.contactSessionId !== args.contactSessionId ||
      contactSession.organizationId !== conversation.organizationId
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      })
    }

    const attachmentIds = args.attachmentIds ?? []
    const promptText = args.prompt.trim()
    let attachments: Array<{
      id: Id<"chatAttachments">
      storageId: Id<"_storage">
      mediaType: string
      filename: string
      size: number
    }> = []
    let attachmentsVisibleToModel = false

    if (attachmentIds.length > 0) {
      const uploadPolicy = await ctx.runQuery(
        internal.system.chatAttachments.getUploadPolicy,
        {
          organizationId: conversation.organizationId,
          agentId: conversation.agentId,
        }
      )

      if (!uploadPolicy.enabled) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Image attachments are turned off for this widget.",
        })
      }

      if (attachmentIds.length > uploadPolicy.maxPerMessage) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: `You can attach up to ${uploadPolicy.maxPerMessage} image${uploadPolicy.maxPerMessage === 1 ? "" : "s"} per message.`,
        })
      }

      // Confirms every id belongs to this visitor and this conversation, and is
      // not already attached to an earlier message.
      attachments = await ctx.runQuery(
        internal.system.chatAttachments.resolveForSend,
        {
          conversationId: conversation._id,
          attachmentIds,
          source: "contact",
          contactSessionId: args.contactSessionId,
        }
      )
      attachmentsVisibleToModel = uploadPolicy.aiVisionEnabled
    }

    if (!promptText && attachments.length === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message is required",
      })
    }

    await enforceRateLimit(ctx, "widgetMessageBySession", {
      key: `${conversation.organizationId}:${args.contactSessionId}`,
      message: "You are sending messages too quickly. Please wait a moment.",
    })
    await enforceRateLimit(ctx, "widgetMessageByOrg", {
      key: conversation.organizationId,
      message:
        "This widget is receiving too many messages. Please try again shortly.",
    })

    // This refreshes the user's session if they are within the threshold
    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    })

    const workflowResult = await ctx.runMutation(
      (internal as any).system.workflowRuntime.handleUserMessage,
      {
        threadId: args.threadId,
        prompt: args.prompt,
        contactSessionId: args.contactSessionId,
        workflowButtonId: args.workflowButtonId,
        attachmentIds,
      }
    )

    if (workflowResult?.handled) {
      return
    }

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
      internal.system.widgetSettings.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
        agentId: conversation.agentId,
      }
    )

    const systemPrompt =
      widgetSettings?.systemPrompt?.trim() || SUPPORT_AGENT_PROMPT
    const enabledToolIds = widgetSettings?.enabledToolIds
    const chatModel =
      widgetSettings?.chatSettings?.model?.trim() || OPENAI_CHAT_MODEL

    const configuredTools = await ctx.runQuery(
      internal.system.assistantTools.listEnabledForOrganization,
      {
        organizationId: conversation.organizationId,
        channel: "chat",
      }
    )

    const activeTools = filterAssistantToolsByIds(
      configuredTools,
      enabledToolIds
    )
    // An answer keyed on text alone must never be replayed for a message that
    // also carried an image, and such an answer must not be cached either.
    const bypassReplyCache =
      requiresLiveToolExecution(activeTools) || attachments.length > 0

    // With attachments the visitor's message is written here rather than by the
    // generate call below, so the uploads can be bound to a real message id
    // before any reply exists. The images stay out of the stored message: they
    // are handed to the model for this turn only, which keeps a screenshot from
    // being re-uploaded as context on every later turn of the conversation.
    let promptMessageId: string | undefined

    if (attachments.length > 0) {
      const savedUserMessage = await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        message: {
          role: "user",
          content: promptText,
        },
      })

      promptMessageId = savedUserMessage.messageId

      await ctx.runMutation(internal.system.chatAttachments.bindToMessage, {
        conversationId: conversation._id,
        attachmentIds: attachments.map((attachment) => attachment.id),
        messageId: promptMessageId,
        source: "contact",
        contactSessionId: args.contactSessionId,
      })
    }

    let assistantReplyText: string | null = null

    if (shouldTriggerAgent) {
      let cachedReply: {
        _id: string
        answer: string
      } | null = null

      if (!bypassReplyCache) {
        cachedReply = await ctx.runQuery(
          (internal as any).system.ai.replyCache.find,
          {
            organizationId: conversation.organizationId,
            prompt: args.prompt,
            model: chatModel,
            systemPrompt,
          }
        )

        if (!cachedReply) {
          cachedReply = await findSemanticCachedReply(ctx, {
            organizationId: conversation.organizationId,
            prompt: args.prompt,
            model: chatModel,
            systemPrompt,
            openAISecretValue,
          })
        }
      }

      if (cachedReply?.answer) {
        await saveMessage(ctx, components.agent, {
          threadId: args.threadId,
          prompt: args.prompt,
        })

        await saveMessage(ctx, components.agent, {
          threadId: args.threadId,
          message: {
            role: "assistant",
            content: cachedReply.answer,
          },
        })

        assistantReplyText = cachedReply.answer

        await ctx.runMutation((internal as any).system.ai.replyCache.markHit, {
          cacheId: cachedReply._id,
        })
      } else {
        const previousAssistantMessage = await getLatestAssistantMessage(
          ctx,
          args.threadId
        )

        const dynamicTools = await getEnabledChatTools(
          ctx,
          conversation.organizationId,
          enabledToolIds
        )

        const legacyTools = {
          escalateConversationTool: escalateConversation,
          resolveConversationTool: resolveConversation,
          searchTool: search,
        }

        const chatTools = resolveChatToolsForWidget(
          dynamicTools,
          enabledToolIds,
          legacyTools
        )

        const toolAwareSystemPrompt = buildToolAwareSystemPrompt(
          systemPrompt,
          activeTools
        )

        const modelPrompt = attachments.length
          ? [
              {
                role: "user" as const,
                content: attachmentsVisibleToModel
                  ? [
                      ...(promptText
                        ? [{ type: "text" as const, text: promptText }]
                        : []),
                      ...(await buildModelImageParts(ctx, attachments)),
                    ]
                  : describeAttachmentsForModel(
                      attachments.length,
                      promptText
                    ),
              },
            ]
          : args.prompt

        const result = await supportAgent.generateText(
          ctx,
          { threadId: args.threadId },
          {
            model: getOpenAIChatModelFromSecretValue(
              openAISecretValue,
              chatModel
            ),
            system: toolAwareSystemPrompt,
            prompt: modelPrompt,
            // Anchors the reply to the message saved above so the prompt
            // override is used for this call only and never written back.
            promptMessageId,
            tools: chatTools,
          },
          {
            contextOptions: {
              excludeToolMessages: true,
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

        const updatedConversation = await ctx.runQuery(
          internal.system.conversations.getByThreadId,
          {
            threadId: args.threadId,
          }
        )

        if (
          assistantReplyText &&
          updatedConversation?.status === conversation.status &&
          !bypassReplyCache
        ) {
          const cacheResult = await ctx.runMutation(
            (internal as any).system.ai.replyCache.upsert,
            {
              organizationId: conversation.organizationId,
              prompt: args.prompt,
              answer: assistantReplyText,
              model: chatModel,
              systemPrompt,
              sourceThreadId: args.threadId,
            }
          )

          if (cacheResult) {
            await indexSemanticCachedReply(ctx, {
              organizationId: conversation.organizationId,
              prompt: args.prompt,
              cacheId: cacheResult.cacheId,
              cacheKey: cacheResult.cacheKey,
              model: chatModel,
              openAISecretValue,
            })
          }
        }
      }
    } else {
      if (!promptMessageId) {
        await saveMessage(ctx, components.agent, {
          threadId: args.threadId,
          prompt: args.prompt,
        })
      }

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

    if (assistantReplyText) {
      await ctx.runMutation(
        internal.system.conversations.touchAssistantMessage,
        {
          conversationId: conversation._id,
        }
      )
    }

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
          attachmentCount: attachments.length,
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
    // A valid session alone is not enough: the thread must belong to a
    // conversation owned by this session, or any visitor could read any
    // organization's transcripts by guessing thread ids.
    await requireContactSessionThread(ctx, {
      threadId: args.threadId,
      contactSessionId: args.contactSessionId,
    })

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      excludeToolMessages: true,
      paginationOpts: args.paginationOpts,
    })

    return paginated
  },
})

export const getConversationExport = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const { conversation } = await requireContactSessionConversation(ctx, {
      conversationId: args.conversationId,
      contactSessionId: args.contactSessionId,
    })

    const widgetSettings = await ctx.runQuery(
      internal.system.widgetSettings.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
        agentId: conversation.agentId,
      }
    )

    if (widgetSettings?.appearance?.showChatHistoryDownload === false) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Chat history downloads are disabled",
      })
    }

    const pageSize = 100
    const maxMessages = 1000
    let cursor: string | null = null
    let isDone = false
    const messages: any[] = []

    while (!isDone && messages.length < maxMessages) {
      const page = await supportAgent.listMessages(ctx, {
        threadId: conversation.threadId,
        paginationOpts: { numItems: pageSize, cursor },
      })

      messages.push(...page.page)
      isDone = page.isDone
      cursor = page.continueCursor

      if (!cursor) {
        break
      }
    }

    const exportMessages = messages.slice(0, maxMessages)
    const normalizedMessages = exportMessages
      .map((message, index) => ({
        id: getAgentMessageId(message, index),
        role: getAgentMessageRole(message),
        text: extractAgentMessageText(message),
        createdAt: getAgentMessageCreatedAt(message),
        order: getAgentMessageOrder(message),
        fetchedIndex: index,
      }))
      .filter((message) => message.text.length > 0)
      .sort((a, b) => {
        if (a.order !== null && b.order !== null) {
          return a.order - b.order
        }

        if (a.createdAt !== null && b.createdAt !== null) {
          return a.createdAt - b.createdAt
        }

        return b.fetchedIndex - a.fetchedIndex
      })
      .map(
        ({ fetchedIndex: _fetchedIndex, order: _order, ...message }) => message
      )

    return {
      conversationId: conversation._id,
      status: conversation.status,
      exportedAt: Date.now(),
      truncated: !isDone || messages.length > maxMessages,
      messages: normalizedMessages,
    }
  },
})
