import { generateText } from "ai"
import { internal } from "../_generated/api"
import {
  KNOWLEDGE_BASE_MAX_OUTPUT_TOKENS,
  SEARCH_INTERPRETER_PROMPT,
} from "../system/ai/constants"
import { getRagForOrganization } from "../system/ai/rag"
import { OPENAI_CHAT_MODEL, getOpenAIChatModelFromSecretValue } from "./openai"

export const KNOWLEDGE_BASE_NO_RESULTS =
  "I couldn't find specific information about that in our knowledge base."

/**
 * Ceiling on how much retrieved source text is handed to the interpreter. Five
 * chunks are usually well under this; the cap only stops one very long document
 * from turning a routine question into a large prompt.
 */
const MAX_CONTEXT_CHARS = 8000

const RAG_RESULT_LIMIT = 5

const truncate = (value: string, limit: number) =>
  value.length <= limit ? value : `${value.slice(0, limit)}\n\n[…truncated]`

/**
 * Answers a question from the organization's knowledge base.
 *
 * Both the retrieval and the interpretation are billed API calls — an embedding
 * for the query plus a full generation over the retrieved chunks — and the same
 * handful of questions come up over and over. The answer is therefore cached
 * per organization, per query and per model in `aiReplyCache`, under the
 * interpreter prompt as its key so these entries never collide with the
 * top-level reply cache. Uploading, re-crawling or deleting a source already
 * clears that table for the organization, which is exactly the moment a stored
 * knowledge-base answer stops being true.
 */
export const answerFromKnowledgeBase = async (
  ctx: any,
  args: {
    organizationId: string
    query: string
    /** Resolved model name, used as part of the cache key. */
    model?: string | null
    openAISecretValue?: string | null
  }
): Promise<string> => {
  const model = args.model?.trim() || OPENAI_CHAT_MODEL

  const cached = await ctx.runQuery(
    (internal as any).system.ai.replyCache.find,
    {
      organizationId: args.organizationId,
      prompt: args.query,
      model,
      systemPrompt: SEARCH_INTERPRETER_PROMPT,
    }
  )

  if (cached?.answer) {
    await ctx.runMutation((internal as any).system.ai.replyCache.markHit, {
      cacheId: cached._id,
    })

    return cached.answer
  }

  const rag = await getRagForOrganization(args.openAISecretValue)
  const searchResult = await rag.search(ctx, {
    namespace: args.organizationId,
    query: args.query,
    limit: RAG_RESULT_LIMIT,
  })

  if (!searchResult.entries.length) {
    return KNOWLEDGE_BASE_NO_RESULTS
  }

  const titles = searchResult.entries
    .map((entry: any) => entry.title || null)
    .filter((title: any) => title !== null)
    .join(", ")

  const contextText = `Found results in ${titles}. Here is the context:\n\n${truncate(
    searchResult.text,
    MAX_CONTEXT_CHARS
  )}`

  const response: any = await generateText({
    system: SEARCH_INTERPRETER_PROMPT,
    messages: [
      {
        role: "user",
        content: `User asked: "${args.query}"\n\nSearch results: ${contextText}`,
      },
    ],
    model: getOpenAIChatModelFromSecretValue(args.openAISecretValue, model),
    maxOutputTokens: KNOWLEDGE_BASE_MAX_OUTPUT_TOKENS,
  })

  const answer = response.text?.trim() ?? ""

  if (answer) {
    // Stored without a semantic index entry on purpose: only top-level replies
    // are searched by meaning, so these never surface as a reply-cache hit.
    await ctx.runMutation((internal as any).system.ai.replyCache.upsert, {
      organizationId: args.organizationId,
      prompt: args.query,
      answer,
      model,
      systemPrompt: SEARCH_INTERPRETER_PROMPT,
    })
  }

  return answer || response.text
}
