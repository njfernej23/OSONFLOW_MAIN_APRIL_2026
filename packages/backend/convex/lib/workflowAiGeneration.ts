/**
 * Generation used by workflow AI steps.
 *
 * Extracted from system/workflowAiSteps so the builder's Run panel can preview
 * a step through the exact code path a published run takes. Callers pass the
 * organization's OpenAI secret in rather than fetching it here, which keeps
 * this module free of _generated/api imports.
 */
import { generateText } from "ai"

import { getRagForOrganization } from "../system/ai/rag"
import { SEARCH_INTERPRETER_PROMPT } from "../system/ai/constants"
import {
  OPENAI_CHAT_MODEL,
  getOpenAIChatModelFromSecretValue,
} from "./openai"
import type { RuntimeVariables } from "./workflowEngine"

export const WORKFLOW_PROMPT_SYSTEM = `You are an AI step inside a deterministic support workflow.
Follow the step instructions carefully.
Use conversation variables and the latest user message when relevant.
Keep replies concise and helpful.
Never invent policy, pricing, or product facts that are not provided in the instructions or knowledge context.`

export const KB_NO_RESULTS =
  "I couldn't find specific information about that in our knowledge base."

export const searchKnowledgeBase = async (
  ctx: any,
  args: {
    organizationId: string
    query: string
    secretValue?: string | null
    model?: string
  }
) => {
  if (!args.query.trim()) {
    return KB_NO_RESULTS
  }

  const rag = await getRagForOrganization(args.secretValue)
  const searchResult = await rag.search(ctx, {
    namespace: args.organizationId,
    query: args.query,
    limit: 5,
  })

  if (!searchResult.entries.length) {
    return KB_NO_RESULTS
  }

  const contextText = `Found results in ${searchResult.entries
    .map((entry: { title?: string | null }) => entry.title || null)
    .filter((title: string | null) => title !== null)
    .join(", ")}. Here is the context:\n\n${searchResult.text}`

  const response = await generateText({
    system: SEARCH_INTERPRETER_PROMPT,
    messages: [
      {
        role: "user",
        content: `User asked: "${args.query}"\n\nSearch results: ${contextText}`,
      },
    ],
    model: getOpenAIChatModelFromSecretValue(
      args.secretValue,
      args.model || OPENAI_CHAT_MODEL
    ),
  })

  return response.text
}

export const generatePromptReply = async (
  ctx: any,
  args: {
    organizationId: string
    instructions: string
    variables: RuntimeVariables
    useKnowledgeBase: boolean
    chatModel: string
    secretValue?: string | null
  }
) => {
  let knowledgeContext = ""

  if (args.useKnowledgeBase) {
    const query =
      args.variables.lastInput ||
      args.variables.lastUserMessage ||
      args.instructions

    knowledgeContext = await searchKnowledgeBase(ctx, {
      organizationId: args.organizationId,
      query,
      secretValue: args.secretValue,
      model: args.chatModel,
    })
  }

  const variableLines = Object.entries(args.variables)
    .filter(([key]) => !key.startsWith("__"))
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")

  const userContent = [
    `Step instructions:\n${args.instructions}`,
    variableLines ? `Workflow variables:\n${variableLines}` : "",
    knowledgeContext ? `Knowledge base context:\n${knowledgeContext}` : "",
    args.variables.lastUserMessage
      ? `Latest user message:\n${args.variables.lastUserMessage}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const response = await generateText({
    system: WORKFLOW_PROMPT_SYSTEM,
    messages: [{ role: "user", content: userContent }],
    model: getOpenAIChatModelFromSecretValue(
      args.secretValue,
      args.chatModel
    ),
  })

  return response.text
}
