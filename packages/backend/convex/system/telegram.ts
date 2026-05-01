import { saveMessage } from "@convex-dev/agent"
import { ConvexError, v } from "convex/values"
import { api, components, internal } from "../_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import { SESSION_DURATION_MS } from "../constants"
import { supportAgent } from "./ai/agents/supportAgent"
import { SUPPORT_AGENT_PROMPT } from "./ai/constants"
import { escalateConversation } from "./ai/tools/escalateConversation"
import { resolveConversation } from "./ai/tools/resolveConversation"
import { search } from "./ai/tools/search"

type TelegramIntegration = {
  _id: any
  organizationId: string
  botToken: string
  botId?: number
  botUsername?: string
  forumChatId?: string
  webhookSecret: string
  isEnabled: boolean
}

type TelegramUser = {
  id?: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

type TelegramMessage = {
  message_id?: number
  message_thread_id?: number
  text?: string
  chat?: {
    id?: number | string
    type?: string
    title?: string
  }
  from?: TelegramUser
}

type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

type TelegramSendMessageResponse = {
  ok: boolean
  description?: string
  result?: {
    message_id?: number
    message_thread_id?: number
  }
}

type TelegramCreateForumTopicResponse = {
  ok: boolean
  description?: string
  result?: {
    message_thread_id: number
    name: string
  }
}

const createWebhookSecret = () =>
  `tg_${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`

const getDisplayName = (from?: TelegramUser) => {
  const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(" ")
  return fullName || from?.username || "Telegram contact"
}

const getSyntheticEmail = (chatId: string) =>
  `telegram-${chatId}@telegram.local`

const telegramApiUrl = (botToken: string, method: string) =>
  `https://api.telegram.org/bot${botToken}/${method}`

const createTelegramSessionMetadata = ({
  userId,
  username,
  languageCode,
}: {
  userId?: string
  username?: string
  languageCode?: string
}) => ({
  platform: "Telegram",
  vendor: "Telegram",
  telegramUserId: userId,
  telegramUsername: username,
  telegramLanguageCode: languageCode,
})

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

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const normalizeForumChatId = (chatId?: string | number | null) => {
  const value = String(chatId ?? "").trim()
  return value ? value : undefined
}

const createTopicLink = (forumChatId: string, messageThreadId: number) => {
  const normalizedChatId = forumChatId.trim()

  if (!normalizedChatId.startsWith("-100")) {
    return undefined
  }

  return `https://t.me/c/${normalizedChatId.slice(4)}/${messageThreadId}`
}

const sanitizeTopicName = (name: string) =>
  name
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, "")
    .trim()
    .slice(0, 128)

const createConversationTopicName = ({
  name,
  email,
}: {
  name?: string
  email?: string
}) => {
  const displayName = name?.trim() || "Widget visitor"
  const displayEmail = email?.trim()
  return sanitizeTopicName(
    displayEmail ? `${displayName} (${displayEmail})` : displayName
  )
}

const escapeTelegramHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const formatInlineTelegramHtml = (value: string) => {
  const escaped = escapeTelegramHtml(value)

  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_\n]+)__/g, "<b>$1</b>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
}

const toTelegramHtml = (value: string) =>
  value
    .split("\n")
    .map((line) => {
      const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/)

      if (bulletMatch) {
        return `${escapeTelegramHtml(bulletMatch[1] || "")}• ${formatInlineTelegramHtml(bulletMatch[2] || "")}`
      }

      return formatInlineTelegramHtml(line)
    })
    .join("\n")

const sendTelegramMessage = async ({
  botToken,
  chatId,
  messageThreadId,
  text,
  parseMode = "HTML",
}: {
  botToken: string
  chatId: string
  messageThreadId?: number
  text: string
  parseMode?: "HTML" | null
}) => {
  const payload = {
    chat_id: chatId,
    message_thread_id: messageThreadId,
    text: parseMode === "HTML" ? toTelegramHtml(text) : text,
    parse_mode: parseMode ?? undefined,
    disable_web_page_preview: true,
  }
  const response = await fetch(telegramApiUrl(botToken, "sendMessage"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = (await response.json()) as TelegramSendMessageResponse

  if (!response.ok || !body.ok) {
    if (parseMode === "HTML") {
      return await sendTelegramMessage({
        botToken,
        chatId,
        messageThreadId,
        text,
        parseMode: null,
      })
    }

    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Telegram sendMessage failed: ${body.description || response.statusText}`,
    })
  }

  return body.result
}

const createForumTopic = async ({
  botToken,
  chatId,
  name,
}: {
  botToken: string
  chatId: string
  name: string
}) => {
  const response = await fetch(telegramApiUrl(botToken, "createForumTopic"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      name,
    }),
  })
  const body = (await response.json()) as TelegramCreateForumTopicResponse

  if (!response.ok || !body.ok || !body.result?.message_thread_id) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Telegram createForumTopic failed: ${body.description || response.statusText}`,
    })
  }

  return body.result
}

export const upsertIntegration = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    botToken: v.string(),
    botId: v.number(),
    botUsername: v.optional(v.string()),
    botFirstName: v.optional(v.string()),
    forumChatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        botToken: args.botToken,
        botId: args.botId,
        botUsername: args.botUsername,
        botFirstName: args.botFirstName,
        forumChatId:
          normalizeForumChatId(args.forumChatId) ?? existing.forumChatId,
        isEnabled: true,
        status: "needs_webhook_url",
        setupError: undefined,
        updatedAt: now,
      })

      return {
        integrationId: existing._id,
        webhookSecret: existing.webhookSecret,
      }
    }

    const webhookSecret = createWebhookSecret()
    const integrationId = await ctx.db.insert("telegramIntegrations", {
      organizationId: args.organizationId,
      botToken: args.botToken,
      botId: args.botId,
      botUsername: args.botUsername,
      botFirstName: args.botFirstName,
      forumChatId: normalizeForumChatId(args.forumChatId),
      webhookSecret,
      isEnabled: true,
      status: "needs_webhook_url",
      createdBy: args.actorId,
      createdAt: now,
      updatedAt: now,
    })

    return { integrationId, webhookSecret }
  },
})

export const markIntegrationSetup = internalMutation({
  args: {
    integrationId: v.id("telegramIntegrations"),
    organizationId: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_webhook_url"),
      v.literal("error")
    ),
    webhookUrl: v.optional(v.string()),
    setupError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || integration.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Telegram integration not found",
      })
    }

    await ctx.db.patch(args.integrationId, {
      status: args.status,
      webhookUrl: args.webhookUrl,
      setupError: args.setupError,
      isEnabled: args.status !== "error",
      updatedAt: Date.now(),
    })
  },
})

export const removeIntegration = internalMutation({
  args: {
    integrationId: v.id("telegramIntegrations"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || integration.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Telegram integration not found",
      })
    }

    await ctx.db.delete(args.integrationId)
  },
})

export const getIntegrationByOrganizationId = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()
  },
})

export const getIntegrationById = internalQuery({
  args: {
    integrationId: v.id("telegramIntegrations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.integrationId)
  },
})

export const receiveWebhook = internalMutation({
  args: {
    webhookSecret: v.string(),
    headerSecret: v.optional(v.string()),
    update: v.any(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_webhook_secret", (q) =>
        q.eq("webhookSecret", args.webhookSecret)
      )
      .unique()

    if (!integration || !integration.isEnabled) {
      return { queued: false, reason: "integration_not_found" }
    }

    if (args.headerSecret && args.headerSecret !== integration.webhookSecret) {
      return { queued: false, reason: "invalid_secret" }
    }

    await ctx.db.patch(integration._id, {
      lastWebhookAt: Date.now(),
      updatedAt: Date.now(),
    })

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.telegram.handleIncomingUpdate,
      {
        integrationId: integration._id,
        update: args.update,
      }
    )

    return { queued: true }
  },
})

export const getOrCreateTelegramConversation = internalMutation({
  args: {
    integrationId: v.id("telegramIntegrations"),
    chatId: v.string(),
    userId: v.optional(v.string()),
    username: v.optional(v.string()),
    languageCode: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || !integration.isEnabled) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Telegram integration not found",
      })
    }

    const now = Date.now()
    let telegramContact = await ctx.db
      .query("telegramContacts")
      .withIndex("by_integration_id_and_chat_id", (q) =>
        q.eq("integrationId", args.integrationId).eq("chatId", args.chatId)
      )
      .unique()

    let contactSessionId = telegramContact?.contactSessionId

    if (!telegramContact) {
      contactSessionId = await ctx.db.insert("contactSessions", {
        organizationId: integration.organizationId,
        name: getDisplayName({
          first_name: args.firstName,
          last_name: args.lastName,
          username: args.username,
        }),
        email: getSyntheticEmail(args.chatId),
        expiresAt: now + SESSION_DURATION_MS,
        metadata: createTelegramSessionMetadata({
          userId: args.userId,
          username: args.username,
          languageCode: args.languageCode,
        }),
      })

      const telegramContactId = await ctx.db.insert("telegramContacts", {
        organizationId: integration.organizationId,
        integrationId: args.integrationId,
        chatId: args.chatId,
        userId: args.userId,
        username: args.username,
        firstName: args.firstName,
        lastName: args.lastName,
        contactSessionId,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })

      telegramContact = await ctx.db.get(telegramContactId)
    } else {
      await ctx.db.patch(telegramContact._id, {
        userId: args.userId ?? telegramContact.userId,
        username: args.username ?? telegramContact.username,
        firstName: args.firstName ?? telegramContact.firstName,
        lastName: args.lastName ?? telegramContact.lastName,
        lastMessageAt: now,
        updatedAt: now,
      })

      const contactSession = await ctx.db.get(telegramContact.contactSessionId)

      if (contactSession) {
        await ctx.db.patch(contactSession._id, {
          metadata: {
            ...contactSession.metadata,
            ...createTelegramSessionMetadata({
              userId: args.userId ?? telegramContact.userId,
              username: args.username ?? telegramContact.username,
              languageCode:
                args.languageCode ??
                contactSession.metadata?.telegramLanguageCode,
            }),
          },
        })
      }
    }

    if (!telegramContact || !contactSessionId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Unable to create Telegram contact",
      })
    }

    const activeConversation = telegramContact.activeConversationId
      ? await ctx.db.get(telegramContact.activeConversationId)
      : null

    if (activeConversation && activeConversation.status !== "resolved") {
      return {
        integration,
        contactSessionId,
        conversationId: activeConversation._id,
        threadId: activeConversation.threadId,
        status: activeConversation.status,
      }
    }

    const { threadId } = await supportAgent.createThread(ctx, {
      userId: integration.organizationId,
      title: `Telegram ${args.chatId}`,
    })

    const conversationId = await ctx.db.insert("conversations", {
      contactSessionId,
      status: "unresolved",
      organizationId: integration.organizationId,
      threadId,
      assignedToId: null,
      assignedToName: null,
      assignedAt: null,
      contactLastReadAt: now,
      lastCustomerMessageAt: null,
      lastOperatorMessageAt: null,
      unreadForContactCount: 0,
      unreadForOperatorCount: 0,
    })

    await ctx.db.patch(telegramContact._id, {
      activeConversationId: conversationId,
      updatedAt: now,
    })

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: integration.organizationId,
        eventType: "conversation.created",
        payload: {
          conversationId,
          threadId,
          contactSessionId,
          status: "unresolved",
          source: "telegram",
          telegramChatId: args.chatId,
          telegramUsername: args.username,
        },
      }
    )

    return {
      integration,
      contactSessionId,
      conversationId,
      threadId,
      status: "unresolved",
    }
  },
})

export const getTelegramContactByConversationId = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    return await ctx.db
      .query("telegramContacts")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", conversation.contactSessionId)
      )
      .filter((q) => q.eq(q.field("activeConversationId"), args.conversationId))
      .unique()
  },
})

export const getTopicProvisioningContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId)
    const integration = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", conversation.organizationId)
      )
      .unique()
    const topics = await ctx.db
      .query("telegramConversationTopics")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .take(1)

    return {
      conversation,
      contactSession,
      integration,
      topic: topics[0] ?? null,
    }
  },
})

export const reserveConversationTopic = internalMutation({
  args: {
    organizationId: v.string(),
    integrationId: v.id("telegramIntegrations"),
    conversationId: v.id("conversations"),
    threadId: v.string(),
    forumChatId: v.string(),
    topicName: v.string(),
  },
  handler: async (ctx, args) => {
    const existingTopics = await ctx.db
      .query("telegramConversationTopics")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .take(1)

    if (existingTopics[0]) {
      return { reserved: false, topic: existingTopics[0] }
    }

    const now = Date.now()
    const topicId = await ctx.db.insert("telegramConversationTopics", {
      organizationId: args.organizationId,
      integrationId: args.integrationId,
      conversationId: args.conversationId,
      threadId: args.threadId,
      forumChatId: args.forumChatId,
      topicName: args.topicName,
      status: "creating",
      createdAt: now,
      updatedAt: now,
    })

    return { reserved: true, topic: await ctx.db.get(topicId) }
  },
})

export const completeConversationTopic = internalMutation({
  args: {
    topicId: v.id("telegramConversationTopics"),
    messageThreadId: v.number(),
    topicName: v.string(),
    topicLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.topicId, {
      messageThreadId: args.messageThreadId,
      topicName: args.topicName,
      topicLink: args.topicLink,
      status: "ready",
      setupError: undefined,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(args.topicId)
  },
})

export const failConversationTopic = internalMutation({
  args: {
    topicId: v.id("telegramConversationTopics"),
    setupError: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.topicId, {
      status: "error",
      setupError: args.setupError,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(args.topicId)
  },
})

export const getConversationTopicByThread = internalQuery({
  args: {
    integrationId: v.id("telegramIntegrations"),
    forumChatId: v.string(),
    messageThreadId: v.number(),
  },
  handler: async (ctx, args) => {
    const topics = await ctx.db
      .query("telegramConversationTopics")
      .withIndex("by_integration_id_and_thread", (q) =>
        q
          .eq("integrationId", args.integrationId)
          .eq("forumChatId", args.forumChatId)
          .eq("messageThreadId", args.messageThreadId)
      )
      .take(1)

    const topic = topics[0] ?? null

    if (!topic) {
      return null
    }

    const conversation = await ctx.db.get(topic.conversationId)

    return {
      ...topic,
      conversation,
    }
  },
})

export const ensureConversationTopic: any = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const context = (await ctx.runQuery(
      (internal as any).system.telegram.getTopicProvisioningContext,
      {
        conversationId: args.conversationId,
      }
    )) as any

    if (!context?.conversation || !context.contactSession) {
      return { created: false, reason: "conversation_not_found" }
    }

    const integration = context.integration as TelegramIntegration | null
    const forumChatId = normalizeForumChatId(integration?.forumChatId)

    if (!integration?.isEnabled || !forumChatId) {
      return { created: false, reason: "forum_not_configured" }
    }

    if (
      context.topic &&
      (context.topic.status === "ready" || !context.topic.status) &&
      context.topic.messageThreadId !== undefined
    ) {
      return { created: false, topic: context.topic }
    }

    const topicName = createConversationTopicName({
      name: context.contactSession.name,
      email: context.contactSession.email,
    })

    const reservation = (await ctx.runMutation(
      (internal as any).system.telegram.reserveConversationTopic,
      {
        organizationId: context.conversation.organizationId,
        integrationId: integration._id,
        conversationId: context.conversation._id,
        threadId: context.conversation.threadId,
        forumChatId,
        topicName: topicName || "Widget visitor",
      }
    )) as any

    if (!reservation.reserved) {
      const topic = reservation.topic

      if (
        topic &&
        (topic.status === "ready" || !topic.status) &&
        topic.messageThreadId !== undefined
      ) {
        return { created: false, topic }
      }

      if (topic?.status === "error") {
        return {
          created: false,
          reason: "topic_create_failed",
          setupError: topic.setupError,
        }
      }

      return { created: false, reason: "topic_creation_in_progress" }
    }

    let forumTopic: Awaited<ReturnType<typeof createForumTopic>>

    try {
      forumTopic = await createForumTopic({
        botToken: integration.botToken,
        chatId: forumChatId,
        name: topicName || "Widget visitor",
      })
    } catch (error) {
      await ctx.runMutation(
        (internal as any).system.telegram.failConversationTopic,
        {
          topicId: reservation.topic._id,
          setupError:
            error instanceof Error
              ? error.message
              : "Telegram topic creation failed",
        }
      )

      return { created: false, reason: "topic_create_failed" }
    }

    const topic = await ctx.runMutation(
      (internal as any).system.telegram.completeConversationTopic,
      {
        topicId: reservation.topic._id,
        messageThreadId: forumTopic.message_thread_id,
        topicName: forumTopic.name || topicName || "Widget visitor",
        topicLink: createTopicLink(forumChatId, forumTopic.message_thread_id),
      }
    )

    try {
      await sendTelegramMessage({
        botToken: integration.botToken,
        chatId: forumChatId,
        messageThreadId: forumTopic.message_thread_id,
        text: [
          "New widget conversation",
          `Name: ${context.contactSession.name}`,
          `Email: ${context.contactSession.email}`,
          `Conversation ID: ${context.conversation._id}`,
        ].join("\n"),
      })
    } catch {
      // The topic mapping is still useful even if the intro message fails.
    }

    return { created: true, topic }
  },
})

export const mirrorConversationTopicMessage: any = internalAction({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    role: v.union(
      v.literal("customer"),
      v.literal("assistant"),
      v.literal("operator")
    ),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim()

    if (!text) {
      return { sent: false, reason: "empty_message" }
    }

    let result = (await ctx.runAction(
      (internal as any).system.telegram.ensureConversationTopic,
      {
        conversationId: args.conversationId,
      }
    )) as any

    for (
      let attempt = 0;
      !result.topic &&
      result.reason === "topic_creation_in_progress" &&
      attempt < 6;
      attempt += 1
    ) {
      await sleep(500)
      result = (await ctx.runAction(
        (internal as any).system.telegram.ensureConversationTopic,
        {
          conversationId: args.conversationId,
        }
      )) as any
    }

    const topic = result.topic

    if (!topic) {
      return { sent: false, reason: result.reason ?? "topic_not_found" }
    }

    if (topic.messageThreadId === undefined) {
      return { sent: false, reason: "topic_not_ready" }
    }

    const integration = (await ctx.runQuery(
      (internal as any).system.telegram.getIntegrationById,
      {
        integrationId: topic.integrationId,
      }
    )) as TelegramIntegration | null

    if (!integration?.isEnabled) {
      return { sent: false, reason: "integration_disabled" }
    }

    const label =
      args.role === "customer"
        ? "Customer"
        : args.role === "assistant"
          ? "AI Assistant"
          : args.actorName?.trim() || "Operator"

    await sendTelegramMessage({
      botToken: integration.botToken,
      chatId: topic.forumChatId,
      messageThreadId: topic.messageThreadId,
      text: `${label}:\n${text}`,
    })

    return { sent: true }
  },
})

export const handleIncomingUpdate: any = internalAction({
  args: {
    integrationId: v.id("telegramIntegrations"),
    update: v.any(),
  },
  handler: async (ctx, args) => {
    const update = args.update as TelegramUpdate
    const message = update.message ?? update.edited_message
    const text = message?.text?.trim()
    const chatId = message?.chat?.id

    if (!text || chatId === undefined || text.startsWith("/start")) {
      return { handled: false }
    }

    const from = message?.from
    const integrationForUpdate = (await ctx.runQuery(
      (internal as any).system.telegram.getIntegrationById,
      {
        integrationId: args.integrationId,
      }
    )) as TelegramIntegration | null

    if (!integrationForUpdate?.isEnabled) {
      return { handled: false, reason: "integration_disabled" }
    }

    if (
      integrationForUpdate.botId !== undefined &&
      from?.id === integrationForUpdate.botId
    ) {
      return { handled: false, reason: "bot_message" }
    }

    const chatIdString = String(chatId)
    const forumChatId = normalizeForumChatId(integrationForUpdate.forumChatId)
    const messageThreadId = message?.message_thread_id

    if (forumChatId && chatIdString === forumChatId) {
      if (messageThreadId === undefined) {
        return { handled: false, reason: "forum_message_without_topic" }
      }

      const topic = (await ctx.runQuery(
        (internal as any).system.telegram.getConversationTopicByThread,
        {
          integrationId: args.integrationId,
          forumChatId,
          messageThreadId,
        }
      )) as any

      if (!topic) {
        return { handled: false, reason: "topic_not_mapped" }
      }

      if (!topic.conversation || topic.conversation.status === "resolved") {
        return { handled: false, reason: "conversation_resolved" }
      }

      const operatorName = getDisplayName(from)
      const now = Date.now()

      await saveMessage(ctx, components.agent, {
        threadId: topic.threadId,
        agentName: operatorName,
        message: {
          role: "assistant",
          content: text,
        },
      })

      await ctx.runMutation(
        (internal as any).system.conversations.touchOperatorMessage,
        {
          conversationId: topic.conversationId,
          timestamp: now,
          operatorId: from?.id === undefined ? undefined : String(from.id),
          operatorName,
        }
      )

      await ctx.runMutation(
        (internal as any).system.integrationWebhooks.dispatchEvent,
        {
          organizationId: integrationForUpdate.organizationId,
          eventType: "message.sent",
          payload: {
            conversationId: topic.conversationId,
            threadId: topic.threadId,
            prompt: text,
            operator: operatorName,
            source: "telegram_topic",
            telegramForumChatId: forumChatId,
            telegramMessageThreadId: messageThreadId,
          },
        }
      )

      await ctx.scheduler.runAfter(
        0,
        (internal as any).system.intelligence.analyzeChatConversation,
        {
          conversationId: topic.conversationId,
        }
      )

      return { handled: true, source: "telegram_topic" }
    }

    const { integration, contactSessionId, conversationId, threadId, status } =
      (await ctx.runMutation(
        (internal as any).system.telegram.getOrCreateTelegramConversation,
        {
          integrationId: args.integrationId,
          chatId: chatIdString,
          userId: from?.id === undefined ? undefined : String(from.id),
          username: from?.username,
          languageCode: from?.language_code,
          firstName: from?.first_name,
          lastName: from?.last_name,
        }
      )) as {
        integration: TelegramIntegration
        contactSessionId: any
        conversationId: any
        threadId: string
        status: "unresolved" | "escalated" | "resolved"
      }

    const now = Date.now()
    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: integration.organizationId,
      }
    )
    const widgetSettings = await ctx.runQuery(
      api.public.widgetSettings.getByOrganizationId,
      {
        organizationId: integration.organizationId,
      }
    )
    const systemPrompt =
      widgetSettings?.systemPrompt?.trim() || SUPPORT_AGENT_PROMPT

    let replyText: string | null = null
    let shouldIncrementOperatorUnread =
      status !== "unresolved" || subscription?.status !== "active"

    if (status === "unresolved" && subscription?.status === "active") {
      const previousAssistantMessage = await getLatestAssistantMessage(
        ctx,
        threadId
      )
      const result = await supportAgent.generateText(
        ctx,
        { threadId },
        {
          system: systemPrompt,
          prompt: text,
          tools: {
            escalateConversationTool: escalateConversation,
            resolveConversationTool: resolveConversation,
            searchTool: search,
          },
        }
      )

      const latestAssistantMessage = await getLatestAssistantMessage(
        ctx,
        threadId
      )
      replyText =
        result.text?.trim() ||
        (latestAssistantMessage &&
        latestAssistantMessage.id !== previousAssistantMessage?.id
          ? latestAssistantMessage.text
          : null) ||
        replyText
      const latestConversation = await ctx.runQuery(
        internal.system.conversations.getByThreadId,
        {
          threadId,
        }
      )
      shouldIncrementOperatorUnread =
        latestConversation?.status === "escalated" || !replyText
    } else {
      await saveMessage(ctx, components.agent, {
        threadId,
        prompt: text,
      })

      if (status === "unresolved") {
        replyText =
          "Rahmat, xabaringiz qabul qilindi. Operator tez orada javob beradi."
      }
    }

    await ctx.runMutation(internal.system.conversations.touchCustomerMessage, {
      conversationId,
      timestamp: now,
      incrementOperatorUnread: shouldIncrementOperatorUnread,
    })

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: integration.organizationId,
        eventType: "message.received",
        payload: {
          conversationId,
          threadId,
          contactSessionId,
          prompt: text,
          source: "telegram",
          telegramChatId: chatIdString,
          telegramUsername: from?.username,
        },
      }
    )

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.intelligence.analyzeChatConversation,
      {
        conversationId,
      }
    )

    if (replyText) {
      await sendTelegramMessage({
        botToken: integration.botToken,
        chatId: chatIdString,
        text: replyText,
      })
    }

    return { handled: true }
  },
})

export const sendConversationMessage: any = internalAction({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const telegramContact = await ctx.runQuery(
      (internal as any).system.telegram.getTelegramContactByConversationId,
      {
        conversationId: args.conversationId,
      }
    )

    if (!telegramContact) {
      return { sent: false, reason: "not_telegram_conversation" }
    }

    const integration = (await ctx.runQuery(
      (internal as any).system.telegram.getIntegrationById,
      {
        integrationId: telegramContact.integrationId,
      }
    )) as TelegramIntegration | null

    if (!integration?.isEnabled) {
      return { sent: false, reason: "integration_disabled" }
    }

    await sendTelegramMessage({
      botToken: integration.botToken,
      chatId: telegramContact.chatId,
      text: args.text,
    })

    return { sent: true }
  },
})
