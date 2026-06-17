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

type InstagramIntegration = {
  _id: any
  organizationId: string
  accessToken: string
  instagramUserId: string
  username?: string
  webhookSecret: string
  verifyToken: string
  isEnabled: boolean
}

type InstagramMessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    is_self?: boolean
    is_deleted?: boolean
    attachments?: Array<{ type?: string }>
  }
}

type InstagramWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    time?: number
    messaging?: InstagramMessagingEvent[]
    changes?: Array<{
      field?: string
      value?: {
        messaging?: InstagramMessagingEvent[]
        sender?: { id?: string }
        recipient?: { id?: string }
        timestamp?: number
        message?: InstagramMessagingEvent["message"]
      }
    }>
  }>
}

type InstagramSenderProfile = {
  name?: string
  username?: string
  profile_pic?: string
  follower_count?: number
}

type NormalizedInstagramSenderProfile = {
  fullName?: string
  username?: string
  profilePicUrl?: string
  followerCount?: number
}

type InstagramSendMessageResponse = {
  recipient_id?: string
  message_id?: string
  error?: {
    message?: string
  }
}

const INSTAGRAM_GRAPH_API_VERSION =
  process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0"

const createWebhookSecret = () =>
  `ig_${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`

const createVerifyToken = () =>
  `igv_${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`

const getSyntheticEmail = (senderId: string) =>
  `instagram-${senderId}@instagram.local`

const createInstagramSessionMetadata = ({
  senderId,
  username,
  fullName,
  profilePicUrl,
  followerCount,
  accountId,
}: {
  senderId?: string
  username?: string
  fullName?: string
  profilePicUrl?: string
  followerCount?: number
  accountId?: string
}) => ({
  platform: "Instagram",
  vendor: "Meta",
  instagramUserId: senderId,
  instagramUsername: username,
  instagramFullName: fullName,
  instagramProfilePic: profilePicUrl,
  instagramFollowerCount: followerCount,
  instagramAccountId: accountId,
})

const instagramMessagesApiUrl = () =>
  `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}/me/messages`

const instagramProfileApiUrl = (
  scopedUserId: string,
  fields: string,
  accessToken: string
) => {
  const url = new URL(
    `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}/${scopedUserId}`
  )
  url.searchParams.set("fields", fields)
  url.searchParams.set("access_token", accessToken)
  return url.toString()
}

const normalizeInstagramProfile = (
  profile: InstagramSenderProfile | null
): NormalizedInstagramSenderProfile | undefined => {
  if (!profile) {
    return undefined
  }

  const fullName = profile.name?.trim()
  const username = profile.username?.trim()
  const profilePicUrl = profile.profile_pic?.trim()
  const followerCount =
    typeof profile.follower_count === "number"
      ? profile.follower_count
      : undefined

  if (!fullName && !username && !profilePicUrl && followerCount === undefined) {
    return undefined
  }

  return {
    fullName: fullName || undefined,
    username: username || undefined,
    profilePicUrl: profilePicUrl || undefined,
    followerCount,
  }
}

const fetchInstagramSenderProfile = async ({
  accessToken,
  senderId,
}: {
  accessToken: string
  senderId: string
}): Promise<NormalizedInstagramSenderProfile | undefined> => {
  const fieldSets = [
    "name,username,profile_pic,follower_count",
    "name,username,profile_pic",
    "username",
  ]

  for (const fields of fieldSets) {
    try {
      const response = await fetch(
        instagramProfileApiUrl(senderId, fields, accessToken)
      )
      const body = (await response.json()) as InstagramSenderProfile & {
        error?: { message?: string }
      }

      if (!response.ok || body.error) {
        continue
      }

      const profile = normalizeInstagramProfile(body)

      if (profile) {
        return profile
      }
    } catch (error) {
      console.error("Instagram sender profile lookup failed", error)
      return undefined
    }
  }

  return undefined
}

const getInstagramContactName = ({
  fullName,
  username,
}: {
  fullName?: string
  username?: string
}) =>
  fullName?.trim() ||
  (username?.trim() ? `@${username.trim()}` : "Instagram contact")

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

const toInstagramPlainText = (value: string) => {
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

const sendInstagramMessage = async ({
  accessToken,
  recipientId,
  text,
}: {
  accessToken: string
  instagramUserId: string
  recipientId: string
  text: string
}) => {
  const formattedText = toInstagramPlainText(text) || text
  const response = await fetch(instagramMessagesApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: formattedText },
    }),
  })
  const body = (await response.json()) as InstagramSendMessageResponse

  if (!response.ok || body.error) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Instagram send message failed: ${
        body.error?.message || response.statusText
      }`,
    })
  }

  return body
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export const createOAuthState = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const existingStates = await ctx.db
      .query("instagramOAuthStates")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()

    for (const existingState of existingStates) {
      await ctx.db.delete(existingState._id)
    }

    await ctx.db.insert("instagramOAuthStates", {
      organizationId: args.organizationId,
      actorId: args.actorId,
      state: args.state,
      expiresAt: now + OAUTH_STATE_TTL_MS,
      createdAt: now,
    })
  },
})

export const consumeOAuthState = internalMutation({
  args: {
    state: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const oauthState = await ctx.db
      .query("instagramOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique()

    if (!oauthState) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid or expired Instagram authorization state",
      })
    }

    if (oauthState.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Instagram authorization state does not match this organization",
      })
    }

    if (oauthState.expiresAt < Date.now()) {
      await ctx.db.delete(oauthState._id)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Instagram authorization expired. Please try again.",
      })
    }

    await ctx.db.delete(oauthState._id)

    return {
      actorId: oauthState.actorId,
    }
  },
})

export const upsertIntegration = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    accessToken: v.string(),
    instagramUserId: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("instagramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        instagramUserId: args.instagramUserId,
        username: args.username,
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
    const integrationId = await ctx.db.insert("instagramIntegrations", {
      organizationId: args.organizationId,
      accessToken: args.accessToken,
      instagramUserId: args.instagramUserId,
      username: args.username,
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
    integrationId: v.id("instagramIntegrations"),
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
        message: "Instagram integration not found",
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
    integrationId: v.id("instagramIntegrations"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || integration.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Instagram integration not found",
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
      .query("instagramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()
  },
})

export const getIntegrationById = internalQuery({
  args: {
    integrationId: v.id("instagramIntegrations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.integrationId)
  },
})

export const getIntegrationByInstagramUserId = internalQuery({
  args: {
    instagramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("instagramIntegrations")
      .withIndex("by_instagram_user_id", (q) =>
        q.eq("instagramUserId", args.instagramUserId)
      )
      .unique()
  },
})

const extractInstagramAccountIds = (payload: InstagramWebhookPayload) => {
  const accountIds = new Set<string>()

  for (const entry of payload.entry ?? []) {
    if (entry.id) {
      accountIds.add(entry.id)
    }

    for (const event of entry.messaging ?? []) {
      if (event.recipient?.id) {
        accountIds.add(event.recipient.id)
      }
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        continue
      }

      const value = change.value

      if (!value) {
        continue
      }

      if (value.recipient?.id) {
        accountIds.add(value.recipient.id)
      }

      for (const event of value.messaging ?? []) {
        if (event.recipient?.id) {
          accountIds.add(event.recipient.id)
        }
      }
    }
  }

  return [...accountIds]
}

const resolveIntegrationForWebhook = async (
  ctx: { db: any },
  payload: InstagramWebhookPayload
) => {
  const accountIds = extractInstagramAccountIds(payload)

  for (const accountId of accountIds) {
    const integration = await ctx.db
      .query("instagramIntegrations")
      .withIndex("by_instagram_user_id", (q: any) =>
        q.eq("instagramUserId", accountId)
      )
      .unique()

    if (integration?.isEnabled) {
      return integration
    }
  }

  const enabledIntegrations = (
    await ctx.db.query("instagramIntegrations").collect()
  ).filter((integration: { isEnabled: boolean }) => integration.isEnabled)

  if (enabledIntegrations.length === 0) {
    return null
  }

  if (payload.object === "instagram" && enabledIntegrations.length === 1) {
    return enabledIntegrations[0]
  }

  for (const integration of enabledIntegrations) {
    if (accountIds.includes(integration.instagramUserId)) {
      return integration
    }
  }

  const messagingEvents = extractMessagingEventsFromPayload(payload)

  for (const integration of enabledIntegrations) {
    const matchesRecipient = messagingEvents.some(
      (event) => event.recipient?.id === integration.instagramUserId
    )

    if (matchesRecipient) {
      return integration
    }
  }

  return null
}

export const extractMessagingEventsFromPayload = (
  payload: InstagramWebhookPayload
): InstagramMessagingEvent[] => {
  const events: InstagramMessagingEvent[] = []

  for (const entry of payload.entry ?? []) {
    events.push(...(entry.messaging ?? []))

    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        continue
      }

      const value = change.value

      if (!value) {
        continue
      }

      if (Array.isArray(value.messaging)) {
        events.push(...value.messaging)
        continue
      }

      if (value.sender?.id || value.message) {
        events.push({
          sender: value.sender,
          recipient: value.recipient,
          timestamp: value.timestamp,
          message: value.message,
        })
      }
    }
  }

  return events
}

export const verifyWebhook = internalQuery({
  args: {
    webhookSecret: v.string(),
    verifyToken: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("instagramIntegrations")
      .withIndex("by_webhook_secret", (q) =>
        q.eq("webhookSecret", args.webhookSecret)
      )
      .unique()

    return Boolean(
      integration?.isEnabled && integration.verifyToken === args.verifyToken
    )
  },
})

export const verifyWebhookToken = internalQuery({
  args: {
    verifyToken: v.string(),
  },
  handler: async (ctx, args) => {
    const configuredVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim()

    if (
      configuredVerifyToken &&
      configuredVerifyToken === args.verifyToken
    ) {
      return true
    }

    const integrations = await ctx.db.query("instagramIntegrations").collect()

    return integrations.some(
      (integration) =>
        integration.isEnabled && integration.verifyToken === args.verifyToken
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
      .query("instagramIntegrations")
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
      (internal as any).system.instagram.handleIncomingWebhook,
      {
        integrationId: integration._id,
        payload: args.payload,
      }
    )

    return { queued: true }
  },
})

export const receiveWebhookByPayload = internalMutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as InstagramWebhookPayload
    const integration = await resolveIntegrationForWebhook(ctx, payload)

    if (!integration) {
      console.warn("Instagram webhook could not be matched to an integration", {
        object: payload.object,
        accountIds: extractInstagramAccountIds(payload),
        entryCount: payload.entry?.length ?? 0,
      })
      return { queued: false, reason: "integration_not_found" }
    }

    await ctx.db.patch(integration._id, {
      lastWebhookAt: Date.now(),
      updatedAt: Date.now(),
    })

    await ctx.scheduler.runAfter(
      0,
      (internal as any).system.instagram.handleIncomingWebhook,
      {
        integrationId: integration._id,
        payload: args.payload,
      }
    )

    return { queued: true, integrationId: integration._id }
  },
})

export const getOrCreateInstagramConversation = internalMutation({
  args: {
    integrationId: v.id("instagramIntegrations"),
    senderId: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    profilePicUrl: v.optional(v.string()),
    followerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || !integration.isEnabled) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Instagram integration not found",
      })
    }

    const now = Date.now()
    let instagramContact = await ctx.db
      .query("instagramContacts")
      .withIndex("by_integration_id_and_sender_id", (q) =>
        q.eq("integrationId", args.integrationId).eq("senderId", args.senderId)
      )
      .unique()

    let contactSessionId = instagramContact?.contactSessionId
    const username = args.username ?? instagramContact?.username
    const fullName = args.fullName ?? instagramContact?.fullName
    const profilePicUrl =
      args.profilePicUrl ?? instagramContact?.profilePicUrl
    const followerCount =
      args.followerCount ?? instagramContact?.followerCount
    const displayName = getInstagramContactName({ fullName, username })

    if (!instagramContact) {
      contactSessionId = await ctx.db.insert("contactSessions", {
        organizationId: integration.organizationId,
        name: displayName,
        email: getSyntheticEmail(args.senderId),
        expiresAt: now + SESSION_DURATION_MS,
        metadata: createInstagramSessionMetadata({
          senderId: args.senderId,
          username,
          fullName,
          profilePicUrl,
          followerCount,
          accountId: integration.instagramUserId,
        }),
      })

      const instagramContactId = await ctx.db.insert("instagramContacts", {
        organizationId: integration.organizationId,
        integrationId: args.integrationId,
        senderId: args.senderId,
        username,
        fullName,
        profilePicUrl,
        followerCount,
        contactSessionId,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })

      instagramContact = await ctx.db.get(instagramContactId)
    } else {
      await ctx.db.patch(instagramContact._id, {
        username,
        fullName,
        profilePicUrl,
        followerCount,
        lastMessageAt: now,
        updatedAt: now,
      })

      const contactSession = await ctx.db.get(instagramContact.contactSessionId)

      if (contactSession) {
        const shouldRenameContact =
          contactSession.name === "Instagram contact" ||
          contactSession.name.startsWith("@") ||
          Boolean(args.fullName)

        await ctx.db.patch(contactSession._id, {
          name: shouldRenameContact ? displayName : contactSession.name,
          metadata: {
            ...contactSession.metadata,
            ...createInstagramSessionMetadata({
              senderId: args.senderId,
              username,
              fullName,
              profilePicUrl,
              followerCount,
              accountId: integration.instagramUserId,
            }),
          },
        })
      }
    }

    if (!instagramContact || !contactSessionId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Unable to create Instagram contact",
      })
    }

    const activeConversation = instagramContact.activeConversationId
      ? await ctx.db.get(instagramContact.activeConversationId)
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
      title: `Instagram ${args.senderId}`,
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

    await ctx.db.patch(instagramContact._id, {
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
          source: "instagram",
          instagramSenderId: args.senderId,
          instagramUsername: username,
          instagramFullName: fullName,
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

export const getInstagramContactByConversationId = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    return await ctx.db
      .query("instagramContacts")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", conversation.contactSessionId)
      )
      .filter((q) => q.eq(q.field("activeConversationId"), args.conversationId))
      .unique()
  },
})

export const getInstagramContactRefreshContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation || conversation.organizationId !== args.organizationId) {
      return null
    }

    const instagramContact = await ctx.db
      .query("instagramContacts")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", conversation.contactSessionId)
      )
      .filter((q) => q.eq(q.field("activeConversationId"), args.conversationId))
      .unique()

    if (!instagramContact) {
      return null
    }

    const integration = await ctx.db.get(instagramContact.integrationId)

    if (!integration || integration.organizationId !== args.organizationId) {
      return null
    }

    return {
      contact: instagramContact,
      integration,
    }
  },
})

export const updateInstagramContactProfile = internalMutation({
  args: {
    contactId: v.id("instagramContacts"),
    organizationId: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    profilePicUrl: v.optional(v.string()),
    followerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId)

    if (!contact || contact.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Instagram contact not found",
      })
    }

    const contactSession = await ctx.db.get(contact.contactSessionId)
    const username = args.username ?? contact.username
    const fullName = args.fullName ?? contact.fullName
    const profilePicUrl = args.profilePicUrl ?? contact.profilePicUrl
    const followerCount = args.followerCount ?? contact.followerCount
    const displayName = getInstagramContactName({ fullName, username })

    await ctx.db.patch(contact._id, {
      username,
      fullName,
      profilePicUrl,
      followerCount,
      updatedAt: Date.now(),
    })

    if (contactSession) {
      const shouldRenameContact =
        contactSession.name === "Instagram contact" ||
        contactSession.name.startsWith("@") ||
        Boolean(args.fullName)

      await ctx.db.patch(contactSession._id, {
        name: shouldRenameContact ? displayName : contactSession.name,
        metadata: {
          ...contactSession.metadata,
          ...createInstagramSessionMetadata({
            senderId: contact.senderId,
            username,
            fullName,
            profilePicUrl,
            followerCount,
            accountId: contactSession.metadata?.instagramAccountId,
          }),
        },
      })
    }
  },
})

const getIncomingMessageText = (event: InstagramMessagingEvent) => {
  const message = event.message

  if (!message || message.is_deleted) {
    return undefined
  }

  const text = message.text?.trim()

  if (text) {
    return text
  }

  if ((message.attachments?.length ?? 0) > 0) {
    return "[Instagram attachment]"
  }

  return undefined
}

const handleIncomingMessage = async ({
  ctx,
  integrationId,
  event,
}: {
  ctx: any
  integrationId: any
  event: InstagramMessagingEvent
}) => {
  const text = getIncomingMessageText(event)
  const senderId = event.sender?.id

  if (!text || !senderId || event.message?.is_echo) {
    return { handled: false }
  }

  const integrationForUpdate = (await ctx.runQuery(
    (internal as any).system.instagram.getIntegrationById,
    {
      integrationId,
    }
  )) as InstagramIntegration | null

  if (!integrationForUpdate?.isEnabled) {
    return { handled: false, reason: "integration_disabled" }
  }

  if (senderId === integrationForUpdate.instagramUserId) {
    return { handled: false, reason: "account_message" }
  }

  const senderLimit = await checkRateLimit(ctx, "instagramMessageBySender", {
    key: `${integrationForUpdate.organizationId}:${senderId}`,
  })
  const orgLimit = await checkRateLimit(ctx, "instagramMessageByOrg", {
    key: integrationForUpdate.organizationId,
  })

  if (!senderLimit.ok || !orgLimit.ok) {
    return { handled: false, reason: "rate_limited" }
  }

  const senderProfile = await fetchInstagramSenderProfile({
    accessToken: integrationForUpdate.accessToken,
    senderId,
  })

  const { integration, contactSessionId, conversationId, threadId, status } =
    (await ctx.runMutation(
      (internal as any).system.instagram.getOrCreateInstagramConversation,
      {
        integrationId,
        senderId,
        username: senderProfile?.username,
        fullName: senderProfile?.fullName,
        profilePicUrl: senderProfile?.profilePicUrl,
        followerCount: senderProfile?.followerCount,
      }
    )) as {
      integration: InstagramIntegration
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
    const result = await supportAgent.generateText(
      ctx,
      { threadId },
      {
        model: getOpenAIChatModelFromSecretValue(openAIPlugin?.secretValue),
        system: systemPrompt,
        prompt: text,
        tools: {
          escalateConversationTool: escalateConversation,
          resolveConversationTool: resolveConversation,
          searchTool: search,
        },
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
        source: "instagram",
        instagramSenderId: senderId,
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
      await sendInstagramMessage({
        accessToken: integration.accessToken,
        instagramUserId: integration.instagramUserId,
        recipientId: senderId,
        text: replyText,
      })
    } catch (error) {
      console.error("Instagram automatic reply failed", error)
    }
  }

  return { handled: true }
}

export const handleIncomingWebhook: any = internalAction({
  args: {
    integrationId: v.id("instagramIntegrations"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as InstagramWebhookPayload
    const events = extractMessagingEventsFromPayload(payload)
    let handledCount = 0

    if (events.length === 0) {
      console.warn("Instagram webhook received with no messaging events", {
        integrationId: args.integrationId,
        object: payload.object,
        entryCount: payload.entry?.length ?? 0,
      })
    }

    for (const event of events) {
      const result = await handleIncomingMessage({
        ctx,
        integrationId: args.integrationId,
        event,
      })

      if (result.handled) {
        handledCount += 1
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
    const instagramContact = await ctx.runQuery(
      (internal as any).system.instagram.getInstagramContactByConversationId,
      {
        conversationId: args.conversationId,
      }
    )

    if (!instagramContact) {
      return { sent: false, reason: "not_instagram_conversation" }
    }

    const integration = (await ctx.runQuery(
      (internal as any).system.instagram.getIntegrationById,
      {
        integrationId: instagramContact.integrationId,
      }
    )) as InstagramIntegration | null

    if (!integration?.isEnabled) {
      return { sent: false, reason: "integration_disabled" }
    }

    try {
      await sendInstagramMessage({
        accessToken: integration.accessToken,
        instagramUserId: integration.instagramUserId,
        recipientId: instagramContact.senderId,
        text: args.text,
      })
    } catch (error) {
      console.error("Instagram operator reply failed", error)
      return { sent: false, reason: "send_failed" }
    }

    return { sent: true }
  },
})
