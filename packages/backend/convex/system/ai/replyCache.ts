import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../_generated/server"

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30
const MAX_CACHEABLE_PROMPT_LENGTH = 280
const MIN_CACHEABLE_PROMPT_LENGTH = 8
const MAX_CACHEABLE_ANSWER_LENGTH = 2500
export const AI_REPLY_CACHE_SEMANTIC_THRESHOLD = 0.89

const privateSignalPattern =
  /(?:https?:\/\/|www\.|[\w.%+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d|\b\d{4,}\b)/i

const accountSpecificPattern =
  /\b(?:my account|my order|order id|order number|invoice|receipt|refund status|tracking number|payment failed|card|password is|address|phone number)\b/i

export const normalizeForCache = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")

const systemPromptKey = (systemPrompt: string) =>
  normalizeForCache(systemPrompt).slice(0, 600)

export const getReplyCacheNamespace = (organizationId: string) =>
  `reply-cache:${organizationId}`

export const getReplyCacheDocumentText = (prompt: string) =>
  `Question: ${prompt.trim()}`

export const isCacheablePrompt = (prompt: string) => {
  const normalized = normalizeForCache(prompt)

  return (
    normalized.length >= MIN_CACHEABLE_PROMPT_LENGTH &&
    normalized.length <= MAX_CACHEABLE_PROMPT_LENGTH &&
    !privateSignalPattern.test(prompt) &&
    !accountSpecificPattern.test(prompt)
  )
}

const isCacheableAnswer = (answer: string) =>
  answer.trim().length > 0 && answer.length <= MAX_CACHEABLE_ANSWER_LENGTH

/**
 * A message that only means something next to the one before it — "yes please",
 * "and the second one", "tell me more" — has an answer that depends on the
 * thread, not on the words. The cache is keyed on the words alone, so those
 * messages are always answered live.
 *
 * The length floor does most of the work and is language-neutral, which matters
 * because visitors write in Uzbek and Russian as well as English; the phrase
 * list catches the longer English follow-ups that clear it.
 */
const MIN_SELF_CONTAINED_LENGTH = 20

const followUpPattern =
  /^(?:ok(?:ay)?|yes|yeah|yep|sure|no|nope|nah|thanks|thank you|great|perfect|please|more|continue|go on|what about|how about|tell me more|and (?:the|what|how)|the (?:first|second|third|last|other) one)\b/i

export const isSelfContainedQuestion = (prompt: string) => {
  const normalized = normalizeForCache(prompt)

  return (
    normalized.length >= MIN_SELF_CONTAINED_LENGTH &&
    !followUpPattern.test(prompt.trim())
  )
}

/**
 * An entry is only served under the tool roster it was produced with. Entries
 * stored before fingerprints existed carry none, and are treated as matching
 * only when no tools are configured now either.
 */
const matchesToolsFingerprint = (
  entry: { toolsFingerprint?: string },
  toolsFingerprint?: string
) => (entry.toolsFingerprint ?? "") === (toolsFingerprint ?? "")

export const find = internalQuery({
  args: {
    organizationId: v.string(),
    prompt: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    toolsFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isCacheablePrompt(args.prompt)) {
      return null
    }

    const cacheKey = normalizeForCache(args.prompt)
    const promptKey = systemPromptKey(args.systemPrompt)
    const minUpdatedAt = Date.now() - CACHE_TTL_MS

    const matches = await ctx.db
      .query("aiReplyCache")
      .withIndex("by_organization_id_and_cache_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("cacheKey", cacheKey)
      )
      .collect()

    return (
      matches.find(
        (entry) =>
          entry.model === args.model &&
          entry.systemPromptKey === promptKey &&
          matchesToolsFingerprint(entry, args.toolsFingerprint) &&
          entry.updatedAt >= minUpdatedAt
      ) ?? null
    )
  },
})

export const getByCacheKey = internalQuery({
  args: {
    organizationId: v.string(),
    cacheKey: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    toolsFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const promptKey = systemPromptKey(args.systemPrompt)
    const minUpdatedAt = Date.now() - CACHE_TTL_MS

    const matches = await ctx.db
      .query("aiReplyCache")
      .withIndex("by_organization_id_and_cache_key", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("cacheKey", args.cacheKey)
      )
      .collect()

    return (
      matches.find(
        (entry) =>
          entry.model === args.model &&
          entry.systemPromptKey === promptKey &&
          matchesToolsFingerprint(entry, args.toolsFingerprint) &&
          entry.updatedAt >= minUpdatedAt
      ) ?? null
    )
  },
})

export const markHit = internalMutation({
  args: {
    cacheId: v.id("aiReplyCache"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.cacheId)

    if (!entry) {
      return
    }

    await ctx.db.patch(args.cacheId, {
      hitCount: entry.hitCount + 1,
      lastUsedAt: Date.now(),
    })
  },
})

export const upsert = internalMutation({
  args: {
    organizationId: v.string(),
    prompt: v.string(),
    answer: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    toolsFingerprint: v.optional(v.string()),
    sourceThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isCacheablePrompt(args.prompt) || !isCacheableAnswer(args.answer)) {
      return null
    }

    const now = Date.now()
    const cacheKey = normalizeForCache(args.prompt)
    const promptKey = systemPromptKey(args.systemPrompt)
    const matches = await ctx.db
      .query("aiReplyCache")
      .withIndex("by_organization_id_and_cache_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("cacheKey", cacheKey)
      )
      .collect()

    const existing = matches.find(
      (entry) =>
        entry.model === args.model &&
        entry.systemPromptKey === promptKey &&
        matchesToolsFingerprint(entry, args.toolsFingerprint)
    )

    if (existing) {
      await ctx.db.patch(existing._id, {
        sourcePrompt: args.prompt,
        answer: args.answer.trim(),
        toolsFingerprint: args.toolsFingerprint,
        sourceThreadId: args.sourceThreadId,
        updatedAt: now,
        lastUsedAt: now,
      })

      return { cacheId: existing._id, cacheKey }
    }

    const cacheId = await ctx.db.insert("aiReplyCache", {
      organizationId: args.organizationId,
      cacheKey,
      systemPromptKey: promptKey,
      model: args.model,
      sourcePrompt: args.prompt,
      answer: args.answer.trim(),
      toolsFingerprint: args.toolsFingerprint,
      sourceThreadId: args.sourceThreadId,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    })

    return { cacheId, cacheKey }
  },
})

export const markSemanticIndexed = internalMutation({
  args: {
    cacheId: v.id("aiReplyCache"),
    semanticEntryId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.cacheId)

    if (!entry) {
      return
    }

    await ctx.db.patch(args.cacheId, {
      semanticEntryId: args.semanticEntryId,
      semanticIndexedAt: Date.now(),
    })
  },
})

export const clearForOrganization = internalMutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("aiReplyCache")
      .withIndex("by_organization_id_and_last_used_at", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()

    await Promise.all(entries.map((entry) => ctx.db.delete(entry._id)))

    return entries.length
  },
})
