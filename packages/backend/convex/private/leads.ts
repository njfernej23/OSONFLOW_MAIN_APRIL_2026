import { paginationOptsValidator, PaginationOptions } from "convex/server"
import { v } from "convex/values"

import type { Doc, Id } from "../_generated/dataModel"
import { query, type QueryCtx } from "../_generated/server"
import { requireOrganizationIdentity } from "../lib/organizationIdentity"

const ANONYMOUS_EMAIL_DOMAIN = "anonymous.osonflow.local"
export const LEADS_EXPORT_LIMIT = 5000
const LEADS_LIST_SCAN_LIMIT = 2000
const NEWCOMER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const leadRecordValidator = v.object({
  contactSessionId: v.id("contactSessions"),
  name: v.string(),
  email: v.string(),
  channel: v.string(),
  phone: v.optional(v.string()),
  socialHandle: v.optional(v.string()),
  referrer: v.optional(v.string()),
  currentUrl: v.optional(v.string()),
  timezone: v.optional(v.string()),
  language: v.optional(v.string()),
  firstSeenAt: v.number(),
  conversationCount: v.number(),
  latestConversationId: v.optional(v.id("conversations")),
  isNewcomer: v.boolean(),
})

export type LeadRecord = {
  contactSessionId: Id<"contactSessions">
  name: string
  email: string
  channel: string
  phone?: string
  socialHandle?: string
  referrer?: string
  currentUrl?: string
  timezone?: string
  language?: string
  firstSeenAt: number
  conversationCount: number
  latestConversationId?: Id<"conversations">
  isNewcomer: boolean
}

const paginateArray = <T>(items: T[], paginationOpts: PaginationOptions) => {
  const start = paginationOpts.cursor
    ? Number.parseInt(paginationOpts.cursor, 10)
    : 0
  const safeStart = Number.isFinite(start) ? start : 0
  const end = safeStart + paginationOpts.numItems
  const isDone = end >= items.length

  return {
    page: items.slice(safeStart, end),
    isDone,
    continueCursor: isDone ? "" : String(end),
  }
}

const isRealLead = (session: Doc<"contactSessions">) => {
  if (session.isAnonymous === true) {
    return false
  }

  if (session.email.toLowerCase().endsWith(`@${ANONYMOUS_EMAIL_DOMAIN}`)) {
    return false
  }

  return true
}

const getLeadChannel = (metadata?: Doc<"contactSessions">["metadata"]) => {
  if (metadata?.whatsappPhoneNumber) {
    return "WhatsApp"
  }

  if (metadata?.telegramUserId) {
    return "Telegram"
  }

  if (metadata?.instagramUserId || metadata?.platform === "Instagram") {
    return "Instagram"
  }

  if (metadata?.source === "workflow_widget") {
    return "Widget"
  }

  if (metadata?.source === "voice_widget") {
    return "Voice"
  }

  if (metadata?.platform === "WhatsApp") {
    return "WhatsApp"
  }

  if (metadata?.platform === "Telegram") {
    return "Telegram"
  }

  return "Web"
}

const getSocialHandle = (metadata?: Doc<"contactSessions">["metadata"]) => {
  if (metadata?.instagramUsername) {
    return `@${metadata.instagramUsername}`
  }

  if (metadata?.telegramUsername) {
    return `@${metadata.telegramUsername}`
  }

  return undefined
}

const buildConversationIndex = (conversations: Doc<"conversations">[]) => {
  const byContactSession = new Map<
    Id<"contactSessions">,
    Doc<"conversations">[]
  >()

  for (const conversation of conversations) {
    const existing = byContactSession.get(conversation.contactSessionId) ?? []
    existing.push(conversation)
    byContactSession.set(conversation.contactSessionId, existing)
  }

  return byContactSession
}

const toLeadRecord = (
  session: Doc<"contactSessions">,
  conversations: Doc<"conversations">[],
  newcomerCutoff: number
): LeadRecord => {
  const metadata = session.metadata
  const latestConversation = [...conversations].sort(
    (left, right) => right._creationTime - left._creationTime
  )[0]

  return {
    contactSessionId: session._id,
    name: session.name,
    email: session.email,
    channel: getLeadChannel(metadata),
    phone: metadata?.whatsappPhoneNumber,
    socialHandle: getSocialHandle(metadata),
    referrer: metadata?.referrer,
    currentUrl: metadata?.currentUrl,
    timezone: metadata?.timezone,
    language: metadata?.language,
    firstSeenAt: session._creationTime,
    conversationCount: conversations.length,
    latestConversationId: latestConversation?._id,
    isNewcomer: session._creationTime >= newcomerCutoff,
  }
}

const matchesSearchQuery = (lead: LeadRecord, normalizedQuery: string) => {
  if (!normalizedQuery) {
    return true
  }

  const haystack = [
    lead.name,
    lead.email,
    lead.channel,
    lead.phone,
    lead.socialHandle,
    lead.referrer,
    lead.currentUrl,
    lead.timezone,
    lead.language,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

const loadLeads = async (
  ctx: QueryCtx,
  organizationId: string,
  options: {
    scanLimit: number
    newcomersOnly?: boolean
    withChatsOnly?: boolean
    searchQuery?: string
  }
) => {
  const newcomerCutoff = Date.now() - NEWCOMER_WINDOW_MS
  const normalizedSearch = options.searchQuery?.trim().toLowerCase() ?? ""

  const [sessions, conversations] = await Promise.all([
    ctx.db
      .query("contactSessions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(options.scanLimit),
    ctx.db
      .query("conversations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect(),
  ])

  const conversationsByContactSession = buildConversationIndex(conversations)

  return sessions
    .filter(isRealLead)
    .map((session) =>
      toLeadRecord(
        session,
        conversationsByContactSession.get(session._id) ?? [],
        newcomerCutoff
      )
    )
    .filter((lead) => {
      if (options.newcomersOnly && !lead.isNewcomer) {
        return false
      }

      if (options.withChatsOnly && lead.conversationCount === 0) {
        return false
      }

      return matchesSearchQuery(lead, normalizedSearch)
    })
}

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
    newcomersOnly: v.optional(v.boolean()),
    withChatsOnly: v.optional(v.boolean()),
  },
  returns: v.object({
    page: v.array(leadRecordValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const leads = await loadLeads(ctx, orgId, {
      scanLimit: LEADS_LIST_SCAN_LIMIT,
      newcomersOnly: args.newcomersOnly,
      withChatsOnly: args.withChatsOnly,
      searchQuery: args.searchQuery,
    })

    return paginateArray(leads, args.paginationOpts)
  },
})

export const getForExport = query({
  args: {
    searchQuery: v.optional(v.string()),
    newcomersOnly: v.optional(v.boolean()),
    withChatsOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leadRecordValidator),
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)
    const limit = Math.max(
      1,
      Math.min(args.limit ?? LEADS_EXPORT_LIMIT, LEADS_EXPORT_LIMIT)
    )

    const leads = await loadLeads(ctx, orgId, {
      scanLimit: LEADS_EXPORT_LIMIT,
      newcomersOnly: args.newcomersOnly,
      withChatsOnly: args.withChatsOnly,
      searchQuery: args.searchQuery,
    })

    return leads.slice(0, limit)
  },
})

export const getSummary = query({
  args: {},
  returns: v.object({
    totalLeads: v.number(),
    newcomerCount: v.number(),
    withConversationsCount: v.number(),
    channelCounts: v.object({
      widget: v.number(),
      voice: v.number(),
      telegram: v.number(),
      whatsapp: v.number(),
      instagram: v.number(),
      web: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    const leads = await loadLeads(ctx, orgId, {
      scanLimit: LEADS_LIST_SCAN_LIMIT,
    })

    const channelCounts = {
      widget: 0,
      voice: 0,
      telegram: 0,
      whatsapp: 0,
      instagram: 0,
      web: 0,
    }

    for (const lead of leads) {
      switch (lead.channel) {
        case "Widget":
          channelCounts.widget += 1
          break
        case "Voice":
          channelCounts.voice += 1
          break
        case "Telegram":
          channelCounts.telegram += 1
          break
        case "WhatsApp":
          channelCounts.whatsapp += 1
          break
        case "Instagram":
          channelCounts.instagram += 1
          break
        default:
          channelCounts.web += 1
          break
      }
    }

    return {
      totalLeads: leads.length,
      newcomerCount: leads.filter((lead) => lead.isNewcomer).length,
      withConversationsCount: leads.filter(
        (lead) => lead.conversationCount > 0
      ).length,
      channelCounts,
    }
  },
})
