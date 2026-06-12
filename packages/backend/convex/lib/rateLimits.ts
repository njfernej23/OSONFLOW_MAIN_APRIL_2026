import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { ConvexError } from "convex/values"
import { components } from "../_generated/api"

const rateLimits = {
  contactSessionCreateByEmail: {
    kind: "fixed window",
    rate: 5,
    period: HOUR,
  },
  contactSessionCreateByOrg: {
    kind: "fixed window",
    rate: 200,
    period: HOUR,
    shards: 4,
  },
  widgetConversationCreateBySession: {
    kind: "fixed window",
    rate: 12,
    period: HOUR,
  },
  widgetMessageBySession: {
    kind: "token bucket",
    rate: 12,
    period: MINUTE,
    capacity: 4,
  },
  widgetMessageByOrg: {
    kind: "token bucket",
    rate: 600,
    period: MINUTE,
    capacity: 120,
    shards: 8,
  },
  voiceTokenBySession: {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 3,
  },
  voiceTokenByOrg: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 20,
    shards: 4,
  },
  voiceTranscriptBySession: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 20,
  },
  telegramMessageByChat: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 8,
  },
  telegramMessageByOrg: {
    kind: "token bucket",
    rate: 300,
    period: MINUTE,
    capacity: 80,
    shards: 4,
  },
  instagramMessageBySender: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 8,
  },
  instagramMessageByOrg: {
    kind: "token bucket",
    rate: 300,
    period: MINUTE,
    capacity: 80,
    shards: 4,
  },
  whatsappMessageBySender: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 8,
  },
  whatsappMessageByOrg: {
    kind: "token bucket",
    rate: 300,
    period: MINUTE,
    capacity: 80,
    shards: 4,
  },
  fileUploadByUser: {
    kind: "fixed window",
    rate: 20,
    period: HOUR,
  },
  fileUploadByOrg: {
    kind: "fixed window",
    rate: 100,
    period: HOUR,
    shards: 4,
  },
  websiteScrapeByUser: {
    kind: "fixed window",
    rate: 20,
    period: HOUR,
  },
  websiteScrapeByOrg: {
    kind: "fixed window",
    rate: 100,
    period: HOUR,
    shards: 4,
  },
  knowledgeTestByUser: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 10,
  },
  knowledgeTestByOrg: {
    kind: "token bucket",
    rate: 240,
    period: MINUTE,
    capacity: 60,
    shards: 4,
  },
} as const

export const rateLimiter = new RateLimiter(components.rateLimiter, rateLimits)

type RateLimitName = keyof typeof rateLimits

export const enforceRateLimit = async (
  ctx: any,
  name: RateLimitName,
  {
    key,
    count,
    message = "Too many requests. Please wait a moment and try again.",
  }: {
    key?: string
    count?: number
    message?: string
  } = {}
) => {
  const status = await rateLimiter.limit(ctx, name, { key, count })

  if (!status.ok) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message,
      retryAfter: status.retryAfter,
    })
  }
}

export const checkRateLimit = async (
  ctx: any,
  name: RateLimitName,
  {
    key,
    count,
  }: {
    key?: string
    count?: number
  } = {}
) => {
  return await rateLimiter.limit(ctx, name, { key, count })
}
