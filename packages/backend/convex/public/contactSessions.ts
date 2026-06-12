import { v } from "convex/values"

import { action, internalMutation, mutation } from "../_generated/server"
import { SESSION_DURATION_MS } from "../constants"
import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { enforceRateLimit } from "../lib/rateLimits"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ANONYMOUS_EMAIL_DOMAIN = "anonymous.osonflow.local"
const DNS_QUERY_URL = "https://cloudflare-dns.com/dns-query"
const DNS_TYPE_A = 1
const DNS_TYPE_AAAA = 28
const DNS_TYPE_MX = 15
const DNS_STATUS_NOERROR = 0
const DNS_STATUS_NXDOMAIN = 3

type DnsAnswer = {
  type: number
  data: string
}

type DnsResponse = {
  Status: number
  Answer?: DnsAnswer[]
}

const contactSessionMetadataValidator = v.optional(
  v.object({
    userAgent: v.optional(v.string()),
    language: v.optional(v.string()),
    languages: v.optional(v.string()),
    platform: v.optional(v.string()),
    vendor: v.optional(v.string()),
    telegramUserId: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    telegramLanguageCode: v.optional(v.string()),
    instagramUserId: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
    instagramAccountId: v.optional(v.string()),
    whatsappPhoneNumber: v.optional(v.string()),
    whatsappProfileName: v.optional(v.string()),
    whatsappPhoneNumberId: v.optional(v.string()),
    whatsappBusinessAccountId: v.optional(v.string()),
    screenResolution: v.optional(v.string()),
    viewportSize: v.optional(v.string()),
    timezone: v.optional(v.string()),
    timezoneOffset: v.optional(v.number()),
    cookieEnabled: v.optional(v.boolean()),
    referrer: v.optional(v.string()),
    currentUrl: v.optional(v.string()),
    source: v.optional(v.string()),
    visitorId: v.optional(v.string()),
  })
)

const normalizeContactDetails = ({
  email,
  name,
}: {
  email: string
  name: string
}) => {
  return {
    email: email.trim().toLowerCase(),
    name: name.trim(),
  }
}

const getEmailDomain = (email: string) => {
  const [, domain] = email.split("@")
  return domain?.trim().toLowerCase() || ""
}

const queryDns = async (domain: string, type: number) => {
  const params = new URLSearchParams({
    name: domain,
    type: String(type),
  })
  const response = await fetch(`${DNS_QUERY_URL}?${params.toString()}`, {
    headers: {
      accept: "application/dns-json",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to validate email domain")
  }

  return (await response.json()) as DnsResponse
}

const getMxHost = (answer: DnsAnswer) => {
  const [, host = ""] = answer.data.trim().split(/\s+/)
  return host.toLowerCase().replace(/\.$/, "")
}

const isNullMxHost = (host: string) => {
  return host === "" || host === "." || host === "localhost"
}

const domainAcceptsEmail = async (domain: string) => {
  const mxResponse = await queryDns(domain, DNS_TYPE_MX)

  if (mxResponse.Status === DNS_STATUS_NXDOMAIN) {
    return false
  }

  if (mxResponse.Status !== DNS_STATUS_NOERROR) {
    throw new Error("Failed to validate email domain")
  }

  const mxAnswers =
    mxResponse.Answer?.filter((answer) => answer.type === DNS_TYPE_MX) ?? []

  if (mxAnswers.length > 0) {
    return mxAnswers.some((answer) => !isNullMxHost(getMxHost(answer)))
  }

  const [aResponse, aaaaResponse] = await Promise.all([
    queryDns(domain, DNS_TYPE_A),
    queryDns(domain, DNS_TYPE_AAAA),
  ])

  if (
    aResponse.Status === DNS_STATUS_NXDOMAIN ||
    aaaaResponse.Status === DNS_STATUS_NXDOMAIN
  ) {
    return false
  }

  return Boolean(
    aResponse.Answer?.some((answer) => answer.type === DNS_TYPE_A) ||
    aaaaResponse.Answer?.some((answer) => answer.type === DNS_TYPE_AAAA)
  )
}

export const create = action({
  args: {
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    metadata: contactSessionMetadataValidator,
  },
  handler: async (ctx, args): Promise<Id<"contactSessions">> => {
    const { email, name } = normalizeContactDetails(args)
    const domain = getEmailDomain(email)

    if (!name || !domain || !EMAIL_PATTERN.test(email)) {
      throw new Error("Invalid contact details")
    }

    await enforceRateLimit(ctx, "contactSessionCreateByEmail", {
      key: `${args.organizationId}:${email}`,
      message:
        "Too many contact sessions for this email. Please wait before trying again.",
    })
    await enforceRateLimit(ctx, "contactSessionCreateByOrg", {
      key: args.organizationId,
      message:
        "This widget is receiving too many contact sessions. Please try again shortly.",
    })

    const acceptsEmail = await domainAcceptsEmail(domain)

    if (!acceptsEmail) {
      throw new Error("Email domain does not accept mail")
    }

    return await ctx.runMutation(
      (internal as any).public.contactSessions.createRecord,
      {
        ...args,
        name,
        email,
      }
    )
  },
})

export const createAnonymous = action({
  args: {
    organizationId: v.string(),
    metadata: contactSessionMetadataValidator,
  },
  handler: async (ctx, args): Promise<Id<"contactSessions">> => {
    await enforceRateLimit(ctx, "contactSessionCreateByOrg", {
      key: args.organizationId,
      message:
        "This widget is receiving too many contact sessions. Please try again shortly.",
    })

    return await ctx.runMutation(
      (internal as any).public.contactSessions.createAnonymousRecord,
      {
        organizationId: args.organizationId,
        metadata: {
          ...args.metadata,
          source: args.metadata?.source ?? "voice_widget",
        },
      }
    )
  },
})

export const createRecord = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    metadata: contactSessionMetadataValidator,
  },
  handler: async (ctx, args) => {
    const { email, name } = normalizeContactDetails(args)

    if (!name || !EMAIL_PATTERN.test(email)) {
      throw new Error("Invalid contact details")
    }

    const now = Date.now()
    const expiresAt = now + SESSION_DURATION_MS
    const contactSessionId = await ctx.db.insert("contactSessions", {
      name,
      email,
      organizationId: args.organizationId,
      expiresAt,
      metadata: args.metadata,
    })

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: args.organizationId,
        eventType: "contact_session.created",
        payload: {
          contactSessionId,
          name,
          email,
          expiresAt,
          metadata: args.metadata,
        },
      }
    )

    return contactSessionId
  },
})

export const createAnonymousRecord = internalMutation({
  args: {
    organizationId: v.string(),
    metadata: contactSessionMetadataValidator,
  },
  handler: async (ctx, args): Promise<Id<"contactSessions">> => {
    const now = Date.now()
    const expiresAt = now + SESSION_DURATION_MS
    const visitorId =
      args.metadata?.visitorId?.trim() || `visitor_${now.toString(36)}`
    const suffix = visitorId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-8) || "guest"
    const contactSessionId = await ctx.db.insert("contactSessions", {
      name: `Visitor ${suffix.toUpperCase()}`,
      email: `${suffix.toLowerCase()}@${ANONYMOUS_EMAIL_DOMAIN}`,
      organizationId: args.organizationId,
      expiresAt,
      isAnonymous: true,
      metadata: {
        ...args.metadata,
        source: args.metadata?.source ?? "workflow_widget",
        visitorId,
      },
    })

    await ctx.runMutation(
      (internal as any).system.integrationWebhooks.dispatchEvent,
      {
        organizationId: args.organizationId,
        eventType: "contact_session.created",
        payload: {
          contactSessionId,
          name: `Visitor ${suffix.toUpperCase()}`,
          email: `${suffix.toLowerCase()}@${ANONYMOUS_EMAIL_DOMAIN}`,
          expiresAt,
          isAnonymous: true,
          metadata: {
            ...args.metadata,
            source: args.metadata?.source ?? "workflow_widget",
            visitorId,
          },
        },
      }
    )

    return contactSessionId
  },
})

export const validate = mutation({
  args: {
    contactSessionId: v.id("contactSessions"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId)
    if (!contactSession) {
      return { valid: false, reason: "not_found" }
    }

    if (contactSession.expiresAt < Date.now()) {
      return { valid: false, reason: "expired" }
    }

    if (contactSession.organizationId !== args.organizationId) {
      return { valid: false, reason: "organization_mismatch" }
    }

    return { valid: true, contactSession }
  },
})
