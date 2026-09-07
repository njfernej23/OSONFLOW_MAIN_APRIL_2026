import { saveMessage } from "@convex-dev/agent"
import { components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { supportAgent } from "../system/ai/agents/supportAgent"
import { isSelfContainedQuestion } from "../system/ai/replyCache"
import { escalateConversation } from "../system/ai/tools/escalateConversation"
import { resolveConversation } from "../system/ai/tools/resolveConversation"
import { search } from "../system/ai/tools/search"
import {
  buildChatToolsFingerprint,
  buildToolAwareSystemPrompt,
  filterAssistantToolsByIds,
  getEnabledChatTools,
  getLiveChatToolNames,
  resolveChatToolsForWidget,
} from "../system/assistantTools/getChatTools"
import {
  extractAgentMessageText,
  getLatestTextAgentMessage,
} from "./agentMessageText"
import { OPENAI_CHAT_MODEL, getOpenAIChatModelFromSecretValue } from "./openai"

export const getLatestAssistantMessage = async (
  ctx: any,
  threadId: string
) => {
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

/** Names of every tool the generation actually invoked, across all its steps. */
export const getCalledToolNames = (result: any): string[] => {
  const names: string[] = []

  const collect = (calls: any) => {
    if (!Array.isArray(calls)) {
      return
    }

    for (const call of calls) {
      const name = call?.toolName ?? call?.name

      if (typeof name === "string") {
        names.push(name)
      }
    }
  }

  collect(result?.toolCalls)

  if (Array.isArray(result?.steps)) {
    for (const step of result.steps) {
      collect(step?.toolCalls)
    }
  }

  return names
}

/**
 * Answers one inbound message on a messaging channel — WhatsApp, Telegram or
 * Instagram — which all reach the assistant the same way.
 *
 * The reply cache is consulted first, so a question the organization has
 * already answered costs nothing: no generation, and not even the queries that
 * assemble the tool set. Only answers produced without a live integration are
 * stored, so a booking or a spreadsheet lookup is always run for real.
 *
 * Returns null when the model produced nothing, leaving the caller's own
 * fallback in place.
 */
export const generateChannelReply = async (
  ctx: any,
  args: {
    organizationId: string
    threadId: string
    text: string
    systemPrompt: string
    /** Conversation status before the turn; a turn that changes it is not cached. */
    conversationStatus: string
    enabledToolIds?: Id<"assistantTools">[]
  }
): Promise<string | null> => {
  const configuredTools = await ctx.runQuery(
    internal.system.assistantTools.listEnabledForOrganization,
    {
      organizationId: args.organizationId,
      channel: "chat",
    }
  )

  const activeTools = filterAssistantToolsByIds(
    configuredTools,
    args.enabledToolIds
  )
  const toolsFingerprint = buildChatToolsFingerprint(activeTools)
  const liveToolNames = getLiveChatToolNames(activeTools)

  // A message that only means something next to the one before it is always
  // answered live, since the cache is keyed on the words alone.
  const canUseReplyCache = isSelfContainedQuestion(args.text)

  if (canUseReplyCache) {
    const cachedReply = await ctx.runQuery(
      (internal as any).system.ai.replyCache.find,
      {
        organizationId: args.organizationId,
        prompt: args.text,
        model: OPENAI_CHAT_MODEL,
        systemPrompt: args.systemPrompt,
        toolsFingerprint,
      }
    )

    if (cachedReply?.answer) {
      // The generate call below is what normally writes the visitor's message
      // into the thread, so on a hit it has to be written here instead.
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        prompt: args.text,
      })
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        message: {
          role: "assistant",
          content: cachedReply.answer,
        },
      })
      await ctx.runMutation((internal as any).system.ai.replyCache.markHit, {
        cacheId: cachedReply._id,
      })

      return cachedReply.answer
    }
  }

  const openAIPlugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId: args.organizationId,
      service: "openai_realtime",
    }
  )
  const previousAssistantMessage = await getLatestAssistantMessage(
    ctx,
    args.threadId
  )
  const dynamicTools = await getEnabledChatTools(
    ctx,
    args.organizationId,
    args.enabledToolIds
  )
  const legacyTools = {
    escalateConversationTool: escalateConversation,
    resolveConversationTool: resolveConversation,
    searchTool: search,
  }
  const chatTools = resolveChatToolsForWidget(
    dynamicTools,
    args.enabledToolIds,
    legacyTools
  )
  const toolAwareSystemPrompt = buildToolAwareSystemPrompt(
    args.systemPrompt,
    activeTools
  )

  const result = await supportAgent.generateText(
    ctx,
    { threadId: args.threadId },
    {
      model: getOpenAIChatModelFromSecretValue(openAIPlugin?.secretValue),
      system: toolAwareSystemPrompt,
      prompt: args.text,
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
    args.threadId
  )
  const replyText =
    result.text?.trim() ||
    (latestAssistantMessage &&
    latestAssistantMessage.id !== previousAssistantMessage?.id
      ? latestAssistantMessage.text
      : null)

  if (replyText && canUseReplyCache) {
    const updatedConversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: args.threadId }
    )

    // An answer that came out of a spreadsheet, a calendar or someone's API was
    // true for that one moment, and a turn that escalated or resolved the
    // conversation is not an answer to repeat either.
    const usedLiveTool = getCalledToolNames(result).some((name) =>
      liveToolNames.includes(name)
    )

    if (
      !usedLiveTool &&
      updatedConversation?.status === args.conversationStatus
    ) {
      await ctx.runMutation((internal as any).system.ai.replyCache.upsert, {
        organizationId: args.organizationId,
        prompt: args.text,
        answer: replyText,
        model: OPENAI_CHAT_MODEL,
        systemPrompt: args.systemPrompt,
        toolsFingerprint,
        sourceThreadId: args.threadId,
      })
    }
  }

  return replyText ?? null
}
