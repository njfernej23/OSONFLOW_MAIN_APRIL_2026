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
import {
  buildToolAwareSystemPrompt,
  filterAssistantToolsByIds,
  getEnabledChatTools,
} from "./assistantTools/getChatTools"
import { getOpenAIChatModelFromSecretValue } from "../lib/openai"
import { checkRateLimit } from "../lib/rateLimits"
import {
  extractAgentMessageText,
  getLatestTextAgentMessage,
} from "../lib/agentMessageText"

type TelegramIntegration = {
  _id: any
  organizationId: string
  botToken: string
  botId?: number
  botUsername?: string
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
  text,
  parseMode = "HTML",
}: {
  botToken: string
  chatId: string
  text: string
  parseMode?: "HTML" | null
}) => {
  const payload = {
    chat_id: chatId,
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
export const upsertIntegration = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    botToken: v.string(),
    botId: v.number(),
    botUsername: v.optional(v.string()),
    botFirstName: v.optional(v.string()),
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

    if (chatId === undefined || !text) {
      return { handled: false }
    }

    const integrationForUpdate = (await ctx.runQuery(
      (internal as any).system.telegram.getIntegrationById,
      {
        integrationId: args.integrationId,
      }
    )) as TelegramIntegration | null

    if (!integrationForUpdate?.isEnabled) {
      return { handled: false, reason: "integration_disabled" }
    }

    const chatIdString = String(chatId)

    if (text.startsWith("/start")) {
      const widgetSettings = await ctx.runQuery(
        api.public.widgetSettings.getByOrganizationId,
        {
          organizationId: integrationForUpdate.organizationId,
        }
      )
      const greetMessage =
        widgetSettings?.greetMessage?.trim() ||
        "Hi! Send me a message and I'll help you out."

      await sendTelegramMessage({
        botToken: integrationForUpdate.botToken,
        chatId: chatIdString,
        text: greetMessage,
      })

      return { handled: true }
    }

    const from = message?.from

    if (
      integrationForUpdate.botId !== undefined &&
      from?.id === integrationForUpdate.botId
    ) {
      return { handled: false, reason: "bot_message" }
    }
    const chatLimit = await checkRateLimit(ctx, "telegramMessageByChat", {
      key: `${integrationForUpdate.organizationId}:${chatIdString}`,
    })
    const orgLimit = await checkRateLimit(ctx, "telegramMessageByOrg", {
      key: integrationForUpdate.organizationId,
    })

    if (!chatLimit.ok || !orgLimit.ok) {
      return { handled: false, reason: "rate_limited" }
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
    const enabledToolIds = widgetSettings?.enabledToolIds

    let replyText: string | null = null

    if (status === "unresolved" && subscription?.status === "active") {
      const openAIPlugin = await ctx.runQuery(
        internal.system.plugins.getByOrganizationIdAndService,
        {
          organizationId: integration.organizationId,
          service: "openai_realtime",
        }
      )
      const previousAssistantMessage = await getLatestAssistantMessage(
        ctx,
        threadId
      )
      const configuredTools = await ctx.runQuery(
        internal.system.assistantTools.listEnabledForOrganization,
        {
          organizationId: integration.organizationId,
          channel: "chat",
        }
      )
      const activeTools = filterAssistantToolsByIds(
        configuredTools,
        enabledToolIds
      )
      const dynamicTools = await getEnabledChatTools(
        ctx,
        integration.organizationId,
        enabledToolIds
      )
      const chatTools =
        Object.keys(dynamicTools).length > 0
          ? dynamicTools
          : {
              escalateConversationTool: escalateConversation,
              resolveConversationTool: resolveConversation,
              searchTool: search,
            }
      const toolAwareSystemPrompt = buildToolAwareSystemPrompt(
        systemPrompt,
        activeTools
      )
      const result = await supportAgent.generateText(
        ctx,
        { threadId },
        {
          model: getOpenAIChatModelFromSecretValue(openAIPlugin?.secretValue),
          system: toolAwareSystemPrompt,
          prompt: text,
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
        threadId
      )
      replyText =
        result.text?.trim() ||
        (latestAssistantMessage &&
        latestAssistantMessage.id !== previousAssistantMessage?.id
          ? latestAssistantMessage.text
          : null) ||
        replyText
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
