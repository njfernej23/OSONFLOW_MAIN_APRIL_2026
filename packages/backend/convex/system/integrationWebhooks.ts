import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"

const webhookEventTypeValidator = v.union(
  v.literal("contact_session.created"),
  v.literal("conversation.created"),
  v.literal("conversation.status_changed"),
  v.literal("message.received"),
  v.literal("message.sent")
)

type WebhookEventType =
  | "contact_session.created"
  | "conversation.created"
  | "conversation.status_changed"
  | "message.received"
  | "message.sent"

type WebhookProvider = "webhook" | "discord" | "telegram" | "whatsapp"

type WebhookProviderConfig = {
  telegramBotToken?: string
  telegramChatId?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
  whatsappRecipientPhone?: string
}

type CanonicalEventPayload = {
  id: string
  type: WebhookEventType
  attempt: number
  occurredAt: string
  organizationId: string
  payload: unknown
}

type ProviderRequest = {
  url: string
  targetUrlForLog: string
  headers: Record<string, string>
  body: string
}

const MAX_DELIVERY_ATTEMPTS = 4
const RETRY_DELAY_MS_BY_ATTEMPT: Record<number, number> = {
  1: 15_000,
  2: 60_000,
  3: 5 * 60_000,
}
const MAX_RESPONSE_BODY_LENGTH = 1_000

const webhookEventTypeLabels: Record<WebhookEventType, string> = {
  "contact_session.created": "Contact Session Created",
  "conversation.created": "Conversation Created",
  "conversation.status_changed": "Conversation Status Changed",
  "message.received": "Message Received",
  "message.sent": "Message Sent",
}

const getNextDelayMs = (attempt: number) => {
  return RETRY_DELAY_MS_BY_ATTEMPT[attempt] ?? 10 * 60_000
}

const normalizeResponseBody = (value?: string) => {
  if (!value) {
    return undefined
  }

  return value.slice(0, MAX_RESPONSE_BODY_LENGTH)
}

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
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

const safeJsonStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{\n  "error": "Unable to serialize payload"\n}'
  }
}

const inferProviderFromUrl = (url?: string): WebhookProvider => {
  if (!url) {
    return "webhook"
  }

  const lower = url.toLowerCase()

  if (lower.includes("discord.com/api/webhooks")) {
    return "discord"
  }

  if (lower.includes("api.telegram.org")) {
    return "telegram"
  }

  if (lower.includes("graph.facebook.com")) {
    return "whatsapp"
  }

  return "webhook"
}

const getProvider = (provider?: string, url?: string): WebhookProvider => {
  // Legacy Slack destinations now fall back to the generic webhook payload.
  if (provider === "slack") {
    return "webhook"
  }

  if (
    provider === "discord" ||
    provider === "telegram" ||
    provider === "webhook" ||
    provider === "whatsapp"
  ) {
    return provider
  }

  return inferProviderFromUrl(url)
}

const formatEventTypeLabel = (eventType: WebhookEventType) => {
  return webhookEventTypeLabels[eventType] ?? eventType
}

const createChannelMessage = (payload: CanonicalEventPayload) => {
  const payloadPreview = truncateText(safeJsonStringify(payload.payload), 1200)

  return truncateText(
    [
      `Osonflow ${formatEventTypeLabel(payload.type)}`,
      `Organization: ${payload.organizationId}`,
      `Event ID: ${payload.id}`,
      `Attempt: ${payload.attempt}`,
      `Occurred At: ${payload.occurredAt}`,
      `Payload: ${payloadPreview}`,
    ].join("\n"),
    3500
  )
}

const createEventId = () => `evt_${crypto.randomUUID()}`

const createSigningSecret = async (secret: string, payload: string) => {
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  )

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  )

  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

const createProviderRequest = ({
  webhook,
  payload,
  signature,
}: {
  webhook: {
    url: string
    provider?: string
    providerConfig?: WebhookProviderConfig
  }
  payload: CanonicalEventPayload
  signature: string
}): ProviderRequest => {
  const provider = getProvider(webhook.provider, webhook.url)
  const providerConfig = webhook.providerConfig
  const baseHeaders = {
    "content-type": "application/json",
    "x-osonflow-event-id": payload.id,
    "x-osonflow-event-type": payload.type,
    "x-osonflow-attempt": String(payload.attempt),
    "x-osonflow-signature": `sha256=${signature}`,
  }

  if (provider === "discord") {
    const payloadPreview = truncateText(safeJsonStringify(payload.payload), 860)

    return {
      url: webhook.url,
      targetUrlForLog: webhook.url,
      headers: baseHeaders,
      body: JSON.stringify({
        content: `Osonflow event: ${formatEventTypeLabel(payload.type)}`,
        embeds: [
          {
            title: formatEventTypeLabel(payload.type),
            description: truncateText(
              [
                `Organization: ${payload.organizationId}`,
                `Event ID: ${payload.id}`,
                `Attempt: ${payload.attempt}`,
              ].join("\n"),
              3000
            ),
            timestamp: payload.occurredAt,
            fields: [
              {
                name: "Payload",
                value: `\`\`\`json\n${payloadPreview}\n\`\`\``,
              },
            ],
          },
        ],
      }),
    }
  }

  if (provider === "telegram") {
    if (!providerConfig?.telegramBotToken || !providerConfig.telegramChatId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Telegram destination is missing bot token or chat ID",
      })
    }

    return {
      url: `https://api.telegram.org/bot${providerConfig.telegramBotToken}/sendMessage`,
      targetUrlForLog: webhook.url,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: providerConfig.telegramChatId,
        text: toTelegramHtml(createChannelMessage(payload)),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  }

  if (provider === "whatsapp") {
    if (
      !providerConfig?.whatsappAccessToken ||
      !providerConfig.whatsappPhoneNumberId ||
      !providerConfig.whatsappRecipientPhone
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          "WhatsApp destination is missing access token, phone number ID, or recipient",
      })
    }

    return {
      url: `https://graph.facebook.com/v19.0/${providerConfig.whatsappPhoneNumberId}/messages`,
      targetUrlForLog: webhook.url,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${providerConfig.whatsappAccessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: providerConfig.whatsappRecipientPhone,
        type: "text",
        text: {
          body: createChannelMessage(payload),
        },
      }),
    }
  }

  return {
    url: webhook.url,
    targetUrlForLog: webhook.url,
    headers: baseHeaders,
    body: JSON.stringify(payload),
  }
}

const shouldRetryDelivery = ({
  status,
  attempt,
  responseStatus,
}: {
  status: "success" | "failed"
  attempt: number
  responseStatus?: number
}) => {
  if (status === "success") {
    return false
  }

  if (attempt >= MAX_DELIVERY_ATTEMPTS) {
    return false
  }

  if (
    responseStatus !== undefined &&
    responseStatus >= 400 &&
    responseStatus < 500 &&
    responseStatus !== 408 &&
    responseStatus !== 429
  ) {
    return false
  }

  return true
}

export const getWebhookForDelivery = internalQuery({
  args: {
    webhookId: v.id("integrationWebhooks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.webhookId)
  },
})

export const dispatchEvent = internalMutation({
  args: {
    organizationId: v.string(),
    eventType: webhookEventTypeValidator,
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const eventId = createEventId()

    const enabledWebhooks = await ctx.db
      .query("integrationWebhooks")
      .withIndex("by_organization_id_and_enabled", (q) =>
        q.eq("organizationId", args.organizationId).eq("isEnabled", true)
      )
      .collect()

    const matchingWebhooks = enabledWebhooks.filter((webhook) =>
      webhook.eventTypes.includes(args.eventType)
    )

    for (const webhook of matchingWebhooks) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).system.integrationWebhooks.deliverEventAttempt,
        {
          webhookId: webhook._id,
          organizationId: args.organizationId,
          eventId,
          eventType: args.eventType,
          payload: args.payload,
          attempt: 1,
        }
      )
    }

    return {
      eventId,
      deliveriesQueued: matchingWebhooks.length,
    }
  },
})

export const recordDeliveryResult = internalMutation({
  args: {
    webhookId: v.id("integrationWebhooks"),
    organizationId: v.string(),
    eventId: v.string(),
    eventType: webhookEventTypeValidator,
    payload: v.any(),
    attempt: v.number(),
    status: v.union(v.literal("success"), v.literal("failed")),
    targetUrl: v.string(),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhookDeliveries", {
      organizationId: args.organizationId,
      webhookId: args.webhookId,
      eventId: args.eventId,
      eventType: args.eventType,
      targetUrl: args.targetUrl,
      status: args.status,
      attempt: args.attempt,
      responseStatus: args.responseStatus,
      responseBody: args.responseBody,
      error: args.error,
      payload: args.payload,
      durationMs: args.durationMs,
    })

    if (
      !shouldRetryDelivery({
        status: args.status,
        attempt: args.attempt,
        responseStatus: args.responseStatus,
      })
    ) {
      return
    }

    const delayMs = getNextDelayMs(args.attempt)

    await ctx.scheduler.runAfter(
      delayMs,
      (internal as any).system.integrationWebhooks.deliverEventAttempt,
      {
        webhookId: args.webhookId,
        organizationId: args.organizationId,
        eventId: args.eventId,
        eventType: args.eventType,
        payload: args.payload,
        attempt: args.attempt + 1,
      }
    )
  },
})

export const deliverEventAttempt: any = internalAction({
  args: {
    webhookId: v.id("integrationWebhooks"),
    organizationId: v.string(),
    eventId: v.string(),
    eventType: webhookEventTypeValidator,
    payload: v.any(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const webhook = (await ctx.runQuery(
      (internal as any).system.integrationWebhooks.getWebhookForDelivery,
      {
        webhookId: args.webhookId,
      }
    )) as {
      _id: string
      organizationId: string
      signingSecret: string
      url: string
      provider?: string
      providerConfig?: WebhookProviderConfig
      isEnabled: boolean
      eventTypes: WebhookEventType[]
    } | null

    if (!webhook) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Webhook destination not found",
      })
    }

    if (!webhook.isEnabled || webhook.organizationId !== args.organizationId) {
      return {
        skipped: true,
        reason: "disabled_or_wrong_organization",
      }
    }

    if (!webhook.eventTypes.includes(args.eventType)) {
      return {
        skipped: true,
        reason: "event_type_not_subscribed",
      }
    }

    const canonicalPayload: CanonicalEventPayload = {
      id: args.eventId,
      type: args.eventType,
      attempt: args.attempt,
      occurredAt: new Date().toISOString(),
      organizationId: args.organizationId,
      payload: args.payload,
    }

    const canonicalBody = JSON.stringify(canonicalPayload)

    const request = createProviderRequest({
      webhook,
      payload: canonicalPayload,
      signature: await createSigningSecret(
        webhook.signingSecret,
        canonicalBody
      ),
    })

    let responseStatus: number | undefined
    let responseBody: string | undefined
    let errorMessage: string | undefined
    let status: "success" | "failed" = "failed"

    const startedAt = Date.now()

    try {
      const response: Response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
      })

      responseStatus = response.status
      responseBody = normalizeResponseBody(await response.text())

      if (response.ok) {
        status = "success"
      } else {
        status = "failed"
        if (!responseBody) {
          responseBody = normalizeResponseBody(response.statusText)
        }
      }
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Webhook delivery request failed"
    }

    const durationMs = Date.now() - startedAt

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.recordDeliveryResult,
      {
        webhookId: args.webhookId,
        organizationId: args.organizationId,
        eventId: args.eventId,
        eventType: args.eventType,
        payload: args.payload,
        attempt: args.attempt,
        status,
        targetUrl: request.targetUrlForLog,
        responseStatus,
        responseBody,
        error: errorMessage,
        durationMs,
      }
    )

    return {
      status,
      attempt: args.attempt,
      responseStatus,
    }
  },
})
