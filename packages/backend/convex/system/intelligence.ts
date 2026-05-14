import { generateText } from "ai"
import { v } from "convex/values"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import { internal } from "../_generated/api"
import { Id } from "../_generated/dataModel"
import { supportAgent } from "./ai/agents/supportAgent"
import { getOpenAIChatModelFromSecretValue } from "../lib/openai"

const statusValidator = v.union(
  v.literal("unresolved"),
  v.literal("escalated"),
  v.literal("resolved")
)

const channelValidator = v.union(v.literal("chat"), v.literal("voice"))

const sentimentValidator = v.union(
  v.literal("positive"),
  v.literal("neutral"),
  v.literal("negative")
)

const urgencyValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
)

const resolutionSourceValidator = v.union(
  v.literal("ai"),
  v.literal("human"),
  v.literal("voice_ai")
)

type ConversationStatus = "unresolved" | "escalated" | "resolved"
type SupportChannel = "chat" | "voice"
type SupportSentiment = "positive" | "neutral" | "negative"
type SupportUrgency = "low" | "medium" | "high"
type ResolutionSource = "ai" | "human" | "voice_ai"

type TranscriptLine = {
  role: "user" | "assistant" | "system"
  text: string
}

type Analysis = {
  intent: string
  sentiment: SupportSentiment
  urgency: SupportUrgency
  language?: string
  summary: string
  isUnanswered: boolean
  unansweredQuestion?: string
  humanSavedMinutes: number
}

const KNOWN_INTENTS = [
  "pricing",
  "billing",
  "technical_issue",
  "onboarding",
  "product_question",
  "demo_or_sales",
  "refund_or_cancellation",
  "account_access",
  "complaint",
  "other",
]

const truncate = (value: string, maxLength: number) => {
  const text = value.trim().replace(/\s+/g, " ")
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3)}...`
}

const getTextFromMessage = (message: any): string => {
  const content = message?.message?.content ?? message?.text ?? message?.content

  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part
        }

        return part?.text ?? part?.content ?? ""
      })
      .filter(Boolean)
      .join(" ")
  }

  return ""
}

const getRoleFromMessage = (message: any): TranscriptLine["role"] => {
  const role = message?.message?.role ?? message?.role

  if (role === "user" || role === "assistant") {
    return role
  }

  return "system"
}

const normalizeIntent = (value?: string) => {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, "_")

  if (!normalized) {
    return "other"
  }

  return KNOWN_INTENTS.includes(normalized) ? normalized : "other"
}

const normalizeSentiment = (value?: string): SupportSentiment => {
  if (value === "positive" || value === "negative") {
    return value
  }

  return "neutral"
}

const normalizeUrgency = (value?: string): SupportUrgency => {
  if (value === "high" || value === "medium") {
    return value
  }

  return "low"
}

const safeJsonParse = (value: string): Record<string, any> | null => {
  try {
    return JSON.parse(value)
  } catch {
    const match = value.match(/\{[\s\S]*\}/)

    if (!match) {
      return null
    }

    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

const inferLanguage = (text: string, fallback?: string) => {
  const lower = text.toLowerCase()

  if (/[а-яё]/i.test(text)) {
    return "Russian"
  }

  if (/\b(salom|rahmat|narx|tolov|to'lov|qanday|kerak)\b/.test(lower)) {
    return "Uzbek"
  }

  return fallback || "English"
}

const inferIntent = (text: string) => {
  const lower = text.toLowerCase()

  if (/\b(price|pricing|plan|cost|narx|сколько|цена)\b/.test(lower)) {
    return "pricing"
  }

  if (/\b(invoice|payment|billing|card|charged|to'lov|оплат)\b/.test(lower)) {
    return "billing"
  }

  if (/\b(error|bug|broken|not working|issue|problem|xato|ошиб)\b/.test(lower)) {
    return "technical_issue"
  }

  if (/\b(setup|install|start|onboard|integrate|connect)\b/.test(lower)) {
    return "onboarding"
  }

  if (/\b(demo|sales|call|meeting|trial)\b/.test(lower)) {
    return "demo_or_sales"
  }

  if (/\b(refund|cancel|cancellation|money back)\b/.test(lower)) {
    return "refund_or_cancellation"
  }

  if (/\b(login|password|account|access|sign in)\b/.test(lower)) {
    return "account_access"
  }

  if (/\b(angry|frustrated|terrible|bad|complaint|not happy)\b/.test(lower)) {
    return "complaint"
  }

  return "product_question"
}

const inferSentiment = (text: string): SupportSentiment => {
  const lower = text.toLowerCase()

  if (/\b(thanks|thank you|great|perfect|awesome|rahmat)\b/.test(lower)) {
    return "positive"
  }

  if (
    /\b(angry|frustrated|bad|terrible|hate|broken|complaint|not happy|urgent)\b/.test(
      lower
    )
  ) {
    return "negative"
  }

  return "neutral"
}

const inferUrgency = (text: string): SupportUrgency => {
  const lower = text.toLowerCase()

  if (/\b(urgent|asap|immediately|critical|blocked|down|now)\b/.test(lower)) {
    return "high"
  }

  if (/\b(today|soon|problem|issue|stuck)\b/.test(lower)) {
    return "medium"
  }

  return "low"
}

const createFallbackAnalysis = ({
  transcript,
  status,
  channel,
  metadataLanguage,
}: {
  transcript: TranscriptLine[]
  status: ConversationStatus
  channel: SupportChannel
  metadataLanguage?: string
}): Analysis => {
  const userText = transcript
    .filter((line) => line.role === "user")
    .map((line) => line.text)
    .join(" ")
  const assistantText = transcript
    .filter((line) => line.role === "assistant")
    .map((line) => line.text)
    .join(" ")
  const fullText = `${userText} ${assistantText}`
  const isUnanswered =
    /couldn'?t find|don't have specific|connect you with a human|knowledge base/i.test(
      assistantText
    )

  return {
    intent: inferIntent(userText || fullText),
    sentiment: inferSentiment(fullText),
    urgency: inferUrgency(fullText),
    language: inferLanguage(fullText, metadataLanguage),
    summary: truncate(
      userText || assistantText || `${channel} conversation with no transcript yet`,
      260
    ),
    isUnanswered,
    unansweredQuestion: isUnanswered
      ? truncate(userText || "Question was not answered from the knowledge base.", 180)
      : undefined,
    humanSavedMinutes:
      status === "resolved" ? (channel === "voice" ? 5 : 3) : channel === "voice" ? 2 : 1,
  }
}

const analyzeTranscript = async ({
  ctx,
  organizationId,
  transcript,
  status,
  channel,
  metadataLanguage,
}: {
  ctx: any
  organizationId: string
  transcript: TranscriptLine[]
  status: ConversationStatus
  channel: SupportChannel
  metadataLanguage?: string
}): Promise<Analysis> => {
  const fallback = createFallbackAnalysis({
    transcript,
    status,
    channel,
    metadataLanguage,
  })

  const compactTranscript = transcript
    .slice(-24)
    .map((line) => `${line.role}: ${line.text}`)
    .join("\n")

  if (!compactTranscript.trim()) {
    return fallback
  }

  try {
    const openAIPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      {
        organizationId,
        service: "openai_realtime",
      }
    )
    const result = await generateText({
      model: getOpenAIChatModelFromSecretValue(openAIPlugin?.secretValue),
      messages: [
        {
          role: "system",
          content:
            "Classify a SaaS support conversation for analytics and customer memory. Return only valid JSON with keys: intent, sentiment, urgency, language, summary, isUnanswered, unansweredQuestion, humanSavedMinutes. intent must be one of pricing, billing, technical_issue, onboarding, product_question, demo_or_sales, refund_or_cancellation, account_access, complaint, other. sentiment must be positive, neutral, or negative. urgency must be low, medium, or high. summary must be one sentence under 180 characters. unansweredQuestion should be empty unless the AI could not answer or had to offer a human because the knowledge base was missing information.",
        },
        {
          role: "user",
          content: `Channel: ${channel}\nCurrent status: ${status}\nTranscript:\n${compactTranscript}`,
        },
      ],
    })

    const parsed = safeJsonParse(result.text)

    if (!parsed) {
      return fallback
    }

    const isUnanswered = Boolean(parsed.isUnanswered)

    return {
      intent: normalizeIntent(parsed.intent),
      sentiment: normalizeSentiment(parsed.sentiment),
      urgency: normalizeUrgency(parsed.urgency),
      language: truncate(String(parsed.language || fallback.language || ""), 40),
      summary: truncate(String(parsed.summary || fallback.summary), 260),
      isUnanswered,
      unansweredQuestion: isUnanswered
        ? truncate(
            String(parsed.unansweredQuestion || fallback.unansweredQuestion || fallback.summary),
            180
          )
        : undefined,
      humanSavedMinutes: Math.max(
        0,
        Math.min(30, Number(parsed.humanSavedMinutes ?? fallback.humanSavedMinutes) || 0)
      ),
    }
  } catch {
    return fallback
  }
}

export const getChatSnapshot = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId)
    const messages = await supportAgent.listMessages(ctx, {
      threadId: conversation.threadId,
      paginationOpts: { numItems: 30, cursor: null },
    })

    return {
      conversation,
      contactSession,
      transcript: messages.page
        .slice()
        .reverse()
        .map((message) => ({
          role: getRoleFromMessage(message),
          text: truncate(getTextFromMessage(message), 800),
        }))
        .filter((line) => line.text.length > 0),
    }
  },
})

export const getVoiceSnapshot = internalQuery({
  args: {
    conversationId: v.id("aiVoiceConversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId)
    const messages = await ctx.db
      .query("aiVoiceConversationMessages")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect()

    return {
      conversation,
      contactSession,
      transcript: messages.map((message) => ({
        role: message.role,
        text: truncate(message.text, 800),
      })),
    }
  },
})

export const upsertInsight = internalMutation({
  args: {
    organizationId: v.string(),
    channel: channelValidator,
    conversationId: v.optional(v.id("conversations")),
    aiVoiceConversationId: v.optional(v.id("aiVoiceConversations")),
    contactSessionId: v.id("contactSessions"),
    status: statusValidator,
    intent: v.string(),
    sentiment: sentimentValidator,
    urgency: urgencyValidator,
    language: v.optional(v.string()),
    summary: v.string(),
    isUnanswered: v.boolean(),
    unansweredQuestion: v.optional(v.string()),
    wasEscalated: v.boolean(),
    wasResolved: v.boolean(),
    resolutionSource: v.optional(resolutionSourceValidator),
    firstHumanResponseMs: v.optional(v.number()),
    humanSavedMinutes: v.number(),
    analyzedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = args.conversationId
      ? await ctx.db
          .query("conversationInsights")
          .withIndex("by_conversation_id", (q) =>
            q.eq("conversationId", args.conversationId)
          )
          .unique()
      : args.aiVoiceConversationId
        ? await ctx.db
            .query("conversationInsights")
            .withIndex("by_ai_voice_conversation_id", (q) =>
              q.eq("aiVoiceConversationId", args.aiVoiceConversationId)
            )
            .unique()
        : null

    const insightPatch = {
      organizationId: args.organizationId,
      channel: args.channel,
      conversationId: args.conversationId,
      aiVoiceConversationId: args.aiVoiceConversationId,
      contactSessionId: args.contactSessionId,
      status: args.status,
      intent: args.intent,
      sentiment: args.sentiment,
      urgency: args.urgency,
      language: args.language,
      summary: args.summary,
      isUnanswered: args.isUnanswered,
      unansweredQuestion: args.unansweredQuestion,
      wasEscalated: args.wasEscalated,
      wasResolved: args.wasResolved,
      resolutionSource: args.resolutionSource,
      firstHumanResponseMs: args.firstHumanResponseMs,
      humanSavedMinutes: args.humanSavedMinutes,
      lastAnalyzedAt: args.analyzedAt,
      updatedAt: args.analyzedAt,
    }

    if (existing) {
      await ctx.db.patch(existing._id, insightPatch)
    } else {
      await ctx.db.insert("conversationInsights", insightPatch)
    }

    const contactSession = await ctx.db.get(args.contactSessionId)

    if (!contactSession?.email) {
      return
    }

    const email = contactSession.email.trim().toLowerCase()
    const memory = await ctx.db
      .query("customerMemories")
      .withIndex("by_organization_id_and_email", (q) =>
        q.eq("organizationId", args.organizationId).eq("email", email)
      )
      .unique()

    const recentIntents = [
      args.intent,
      ...(memory?.recentIntents ?? []).filter((intent) => intent !== args.intent),
    ].slice(0, 8)
    const notableFacts = [
      args.summary,
      ...(memory?.notableFacts ?? []).filter((fact) => fact !== args.summary),
    ].slice(0, 10)
    const issueHistory = [
      {
        channel: args.channel,
        intent: args.intent,
        status: args.status,
        summary: args.summary,
        at: args.analyzedAt,
      },
      ...(memory?.issueHistory ?? []).filter(
        (item) => item.summary !== args.summary
      ),
    ].slice(0, 12)

    const isNewInsight = !existing
    const escalationIncrement =
      args.wasEscalated && (!existing || !existing.wasEscalated) ? 1 : 0
    const resolvedIncrement =
      args.wasResolved && (!existing || !existing.wasResolved) ? 1 : 0

    const memoryPatch = {
      organizationId: args.organizationId,
      email,
      name: contactSession.name,
      summary: truncate(
        `${contactSession.name || email}: ${args.summary}`,
        420
      ),
      preferredLanguage:
        args.language || memory?.preferredLanguage || contactSession.metadata?.language,
      recentIntents,
      notableFacts,
      issueHistory,
      totalConversations: (memory?.totalConversations ?? 0) + (isNewInsight ? 1 : 0),
      totalEscalations: (memory?.totalEscalations ?? 0) + escalationIncrement,
      totalResolved: (memory?.totalResolved ?? 0) + resolvedIncrement,
      lastSeenAt: args.analyzedAt,
      lastContactSessionId: args.contactSessionId,
      updatedAt: args.analyzedAt,
    }

    if (memory) {
      await ctx.db.patch(memory._id, memoryPatch)
    } else {
      await ctx.db.insert("customerMemories", memoryPatch)
    }
  },
})

export const analyzeChatConversation = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.runQuery(
      (internal as any).system.intelligence.getChatSnapshot,
      {
        conversationId: args.conversationId,
      }
    )

    if (!snapshot?.conversation || !snapshot.contactSession) {
      return
    }

    const conversation = snapshot.conversation
    const contactSession = snapshot.contactSession
    const status = conversation.status as ConversationStatus
    const analysis = await analyzeTranscript({
      ctx,
      organizationId: conversation.organizationId,
      transcript: snapshot.transcript,
      status,
      channel: "chat",
      metadataLanguage: contactSession.metadata?.language,
    })
    const firstHumanResponseMs =
      conversation.firstCustomerMessageAt && conversation.firstHumanResponseAt
        ? Math.max(
            0,
            conversation.firstHumanResponseAt - conversation.firstCustomerMessageAt
          )
        : undefined

    await ctx.runMutation((internal as any).system.intelligence.upsertInsight, {
      organizationId: conversation.organizationId,
      channel: "chat",
      conversationId: conversation._id as Id<"conversations">,
      contactSessionId: conversation.contactSessionId,
      status,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      language: analysis.language,
      summary: analysis.summary,
      isUnanswered: analysis.isUnanswered,
      unansweredQuestion: analysis.unansweredQuestion,
      wasEscalated: status === "escalated",
      wasResolved: status === "resolved",
      resolutionSource: conversation.resolutionSource as ResolutionSource | undefined,
      firstHumanResponseMs,
      humanSavedMinutes: analysis.humanSavedMinutes,
      analyzedAt: Date.now(),
    })
  },
})

export const analyzeVoiceConversation = internalAction({
  args: {
    conversationId: v.id("aiVoiceConversations"),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.runQuery(
      (internal as any).system.intelligence.getVoiceSnapshot,
      {
        conversationId: args.conversationId,
      }
    )

    if (!snapshot?.conversation || !snapshot.contactSession) {
      return
    }

    const conversation = snapshot.conversation
    const contactSession = snapshot.contactSession
    const status = (conversation.status ?? "unresolved") as ConversationStatus
    const analysis = await analyzeTranscript({
      ctx,
      organizationId: conversation.organizationId,
      transcript: snapshot.transcript,
      status,
      channel: "voice",
      metadataLanguage: contactSession.metadata?.language,
    })

    await ctx.runMutation((internal as any).system.intelligence.upsertInsight, {
      organizationId: conversation.organizationId,
      channel: "voice",
      aiVoiceConversationId: conversation._id as Id<"aiVoiceConversations">,
      contactSessionId: conversation.contactSessionId,
      status,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      language: analysis.language,
      summary: analysis.summary,
      isUnanswered: analysis.isUnanswered,
      unansweredQuestion: analysis.unansweredQuestion,
      wasEscalated: status === "escalated",
      wasResolved: status === "resolved",
      resolutionSource: conversation.resolutionSource as ResolutionSource | undefined,
      humanSavedMinutes: analysis.humanSavedMinutes,
      analyzedAt: Date.now(),
    })
  },
})
