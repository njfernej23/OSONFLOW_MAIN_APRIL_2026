import { saveMessage } from "@convex-dev/agent"
import { ConvexError, v } from "convex/values"
import { api, components, internal } from "../_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import { SESSION_DURATION_MS } from "../constants"
import { checkRateLimit } from "../lib/rateLimits"
import { getOpenAIChatModelFromSecretValue } from "../lib/openai"
import {
  extractAgentMessageText,
  getLatestTextAgentMessage,
} from "../lib/agentMessageText"
import { supportAgent } from "./ai/agents/supportAgent"
import { SUPPORT_AGENT_PROMPT } from "./ai/constants"
import { escalateConversation } from "./ai/tools/escalateConversation"
import { resolveConversation } from "./ai/tools/resolveConversation"
import { search } from "./ai/tools/search"
import {
  buildToolAwareSystemPrompt,
  getEnabledChatTools,
} from "./assistantTools/getChatTools"

type WhatsAppIntegration = {
  _id: any
  organizationId: string
  accessToken: string
  phoneNumberId: string
  businessAccountId?: string
  displayPhoneNumber?: string
  verifiedName?: string
  webhookSecret: string
  verifyToken: string
  isEnabled: boolean
}

type WhatsAppMessage = {
  from?: string
  id?: string
  type?: string
  timestamp?: string
  text?: {
    body?: string
  }
}

type WhatsAppContact = {
  wa_id?: string
  profile?: {
    name?: string
  }
}

type WhatsAppWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        messaging_product?: string
        metadata?: {
          phone_number_id?: string
          display_phone_number?: string
        }
        contacts?: WhatsAppContact[]
        messages?: WhatsAppMessage[]
      }
    }>
  }>
}

type WhatsAppSendMessageResponse = {
  messaging_product?: string
  contacts?: Array<{ input?: string; wa_id?: string }>
  messages?: Array<{ id?: string }>
  error?: {
    message?: string
  }
}

const WHATSAPP_GRAPH_API_VERSION =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0"

const createWebhookSecret = () =>
  `wa_${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`

const createVerifyToken = () =>
  `wav_${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`

const getSyntheticEmail = (waId: string) => `whatsapp-${waId}@whatsapp.local`

const getWhatsAppContactName = ({
  profileName,
  waId,
}: {
  profileName?: string
  waId: string
}) => profileName?.trim() || `WhatsApp ${waId}`

const createWhatsAppSessionMetadata = ({
  waId,
  profileName,
  phoneNumberId,
  businessAccountId,
}: {
  waId?: string
  profileName?: string
  phoneNumberId?: string
  businessAccountId?: string
}) => ({
  platform: "WhatsApp",
  vendor: "Meta",
  whatsappPhoneNumber: waId,
  whatsappProfileName: profileName,
  whatsappPhoneNumberId: phoneNumberId,
  whatsappBusinessAccountId: businessAccountId,
})

const whatsappMessagesApiUrl = (phoneNumberId: string) =>
  `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${phoneNumberId}/messages`

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

const toWhatsAppPlainText = (value: string) => {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^```[^\n]*\n?/gm, "")
    .replace(/```/g, "")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1 $2")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/~~([^~\n]+)~~/g, "$1")
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^(\s*)[-*]\s+/, "$1• ")
        .replace(/^>\s+/, "")
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const sendWhatsAppMessage = async ({
  accessToken,
  phoneNumberId,
  recipientPhone,
  text,
}: {
  accessToken: string
  phoneNumberId: string
  recipientPhone: string
  text: string
}) => {
  const formattedText = toWhatsAppPlainText(text) || text
  const response = await fetch(whatsappMessagesApiUrl(phoneNumberId), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "text",
      text: {
        preview_url: false,
        body: formattedText.slice(0, 4096),
      },
    }),
  })
  const body = (await response.json()) as WhatsAppSendMessageResponse

  if (!response.ok || body.error) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `WhatsApp send message failed: ${
        body.error?.message || response.statusText
      }`,
    })
  }

  return body
}

export const upsertIntegration = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    accessToken: v.string(),
    phoneNumberId: v.string(),
    businessAccountId: v.optional(v.string()),
    displayPhoneNumber: v.optional(v.string()),
    verifiedName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        phoneNumberId: args.phoneNumberId,
        businessAccountId: args.businessAccountId,
        displayPhoneNumber: args.displayPhoneNumber,
        verifiedName: args.verifiedName,
        isEnabled: true,
        status: "needs_webhook_url",
        setupError: undefined,
        updatedAt: now,
      })

      return {
        integrationId: existing._id,
        webhookSecret: existing.webhookSecret,
        verifyToken: existing.verifyToken,
      }
    }

    const webhookSecret = createWebhookSecret()
    const verifyToken = createVerifyToken()
    const integrationId = await ctx.db.insert("whatsappIntegrations", {
      organizationId: args.organizationId,
      accessToken: args.accessToken,
      phoneNumberId: args.phoneNumberId,
      businessAccountId: args.businessAccountId,
      displayPhoneNumber: args.displayPhoneNumber,
      verifiedName: args.verifiedName,
      webhookSecret,
      verifyToken,
      isEnabled: true,
      status: "needs_webhook_url",
      createdBy: args.actorId,
      createdAt: now,
      updatedAt: now,
    })

    return { integrationId, webhookSecret, verifyToken }
  },
})

export const markIntegrationSetup = internalMutation({
  args: {
    integrationId: v.id("whatsappIntegrations"),
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
        message: "WhatsApp integration not found",
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
    integrationId: v.id("whatsappIntegrations"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || integration.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "WhatsApp integration not found",
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
      .query("whatsappIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()
  },
})

export const getIntegrationById = internalQuery({
  args: {
    integrationId: v.id("whatsappIntegrations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.integrationId)
  },
})

export const verifyWebhook = internalQuery({
  args: {
    webhookSecret: v.string(),
    verifyToken: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_webhook_secret", (q) =>
        q.eq("webhookSecret", args.webhookSecret)
      )
      .unique()

    return Boolean(
      integration?.isEnabled && integration.verifyToken === args.verifyToken
    )
  },
})

export const receiveWebhook = internalMutation({
  args: {
    webhookSecret: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_webhook_secret", (q) =>
        q.eq("webhookSecret", args.webhookSecret)
      )
      .unique()

    if (!integration || !integration.isEnabled) {
      return { queued: false, reason: "integration_not_found" }
    }

    await ctx.db.patch(integration._id, {
      lastWebhookAt: Date.now(),
      updatedAt: Date.now(),
    })

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.whatsapp.handleIncomingWebhook,
      {
        integrationId: integration._id,
        payload: args.payload,
      }
    )

    return { queued: true }
  },
})

export const getOrCreateWhatsAppConversation = internalMutation({
  args: {
    integrationId: v.id("whatsappIntegrations"),
    waId: v.string(),
    profileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || !integration.isEnabled) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "WhatsApp integration not found",
      })
    }

    const now = Date.now()
    let whatsappContact = await ctx.db
      .query("whatsappContacts")
      .withIndex("by_integration_id_and_wa_id", (q) =>
        q.eq("integrationId", args.integrationId).eq("waId", args.waId)
      )
      .unique()

    let contactSessionId = whatsappContact?.contactSessionId
    const profileName = args.profileName ?? whatsappContact?.profileName
    const displayName = getWhatsAppContactName({
      profileName,
      waId: args.waId,
    })

    if (!whatsappContact) {
      contactSessionId = await ctx.db.insert("contactSessions", {
        organizationId: integration.organizationId,
        name: displayName,
        email: getSyntheticEmail(args.waId),
        expiresAt: now + SESSION_DURATION_MS,
        metadata: createWhatsAppSessionMetadata({
          waId: args.waId,
          profileName,
          phoneNumberId: integration.phoneNumberId,
          businessAccountId: integration.businessAccountId,
        }),
      })

      const whatsappContactId = await ctx.db.insert("whatsappContacts", {
        organizationId: integration.organizationId,
        integrationId: args.integrationId,
        waId: args.waId,
        profileName,
        contactSessionId,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })

      whatsappContact = await ctx.db.get(whatsappContactId)
    } else {
      await ctx.db.patch(whatsappContact._id, {
        profileName,
        lastMessageAt: now,
        updatedAt: now,
      })

      const contactSession = await ctx.db.get(whatsappContact.contactSessionId)

      if (contactSession) {
        await ctx.db.patch(contactSession._id, {
          name:
            contactSession.name.startsWith("WhatsApp ") && profileName
              ? displayName
              : contactSession.name,
          metadata: {
            ...contactSession.metadata,
            ...createWhatsAppSessionMetadata({
              waId: args.waId,
              profileName,
              phoneNumberId: integration.phoneNumberId,
              businessAccountId: integration.businessAccountId,
            }),
          },
        })
      }
    }

    if (!whatsappContact || !contactSessionId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Unable to create WhatsApp contact",
      })
    }

    const activeConversation = whatsappContact.activeConversationId
      ? await ctx.db.get(whatsappContact.activeConversationId)
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
      title: `WhatsApp ${args.waId}`,
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

    await ctx.db.patch(whatsappContact._id, {
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
          source: "whatsapp",
          whatsappPhoneNumber: args.waId,
          whatsappProfileName: profileName,
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

export const getWhatsAppContactByConversationId = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    return await ctx.db
      .query("whatsappContacts")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", conversation.contactSessionId)
      )
      .filter((q) => q.eq(q.field("activeConversationId"), args.conversationId))
      .unique()
  },
})

const handleIncomingMessage = async ({
  ctx,
  integrationId,
  message,
  contact,
}: {
  ctx: any
  integrationId: any
  message: WhatsAppMessage
  contact?: WhatsAppContact
}) => {
  const text = message.text?.body?.trim()
  const waId = contact?.wa_id || message.from
  const profileName = contact?.profile?.name?.trim()

  if (!text || !waId || message.type !== "text") {
    return { handled: false }
  }

  const integrationForUpdate = (await ctx.runQuery(
    (internal as any).system.whatsapp.getIntegrationById,
    {
      integrationId,
    }
  )) as WhatsAppIntegration | null

  if (!integrationForUpdate?.isEnabled) {
    return { handled: false, reason: "integration_disabled" }
  }

  const senderLimit = await checkRateLimit(ctx, "whatsappMessageBySender", {
    key: `${integrationForUpdate.organizationId}:${waId}`,
  })
  const orgLimit = await checkRateLimit(ctx, "whatsappMessageByOrg", {
    key: integrationForUpdate.organizationId,
  })

  if (!senderLimit.ok || !orgLimit.ok) {
    return { handled: false, reason: "rate_limited" }
  }

  const { integration, contactSessionId, conversationId, threadId, status } =
    (await ctx.runMutation(
      (internal as any).system.whatsapp.getOrCreateWhatsAppConversation,
      {
        integrationId,
        waId,
        profileName,
      }
    )) as {
      integration: WhatsAppIntegration
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
    const dynamicTools = await getEnabledChatTools(
      ctx,
      integration.organizationId
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
      configuredTools
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
        source: "whatsapp",
        whatsappPhoneNumber: waId,
        whatsappProfileName: profileName,
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
    try {
      await sendWhatsAppMessage({
        accessToken: integration.accessToken,
        phoneNumberId: integration.phoneNumberId,
        recipientPhone: waId,
        text: replyText,
      })
    } catch (error) {
      console.error("WhatsApp automatic reply failed", error)
    }
  }

  return { handled: true }
}

export const handleIncomingWebhook: any = internalAction({
  args: {
    integrationId: v.id("whatsappIntegrations"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as WhatsAppWebhookPayload
    let handledCount = 0

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const contacts = change.value?.contacts ?? []

        for (const message of change.value?.messages ?? []) {
          const contact =
            contacts.find(
              (item) => item.wa_id && item.wa_id === message.from
            ) ?? contacts[0]
          const result = await handleIncomingMessage({
            ctx,
            integrationId: args.integrationId,
            message,
            contact,
          })

          if (result.handled) {
            handledCount += 1
          }
        }
      }
    }

    return { handled: handledCount > 0, handledCount }
  },
})

export const sendConversationMessage: any = internalAction({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const whatsappContact = await ctx.runQuery(
      (internal as any).system.whatsapp.getWhatsAppContactByConversationId,
      {
        conversationId: args.conversationId,
      }
    )

    if (!whatsappContact) {
      return { sent: false, reason: "not_whatsapp_conversation" }
    }

    const integration = (await ctx.runQuery(
      (internal as any).system.whatsapp.getIntegrationById,
      {
        integrationId: whatsappContact.integrationId,
      }
    )) as WhatsAppIntegration | null

    if (!integration?.isEnabled) {
      return { sent: false, reason: "integration_disabled" }
    }

    try {
      await sendWhatsAppMessage({
        accessToken: integration.accessToken,
        phoneNumberId: integration.phoneNumberId,
        recipientPhone: whatsappContact.waId,
        text: args.text,
      })
    } catch (error) {
      console.error("WhatsApp operator reply failed", error)
      return { sent: false, reason: "send_failed" }
    }

    return { sent: true }
  },
})
