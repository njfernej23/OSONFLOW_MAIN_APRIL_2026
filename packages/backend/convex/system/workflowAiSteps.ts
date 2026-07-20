import { generateText } from "ai"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import {
  internalAction,
  internalQuery,
} from "../_generated/server"
import {
  asBoolean,
  asString,
  buildKbQuery,
  buildPromptInstructions,
  getOutputVariableKey,
  isRecord,
  type RuntimeVariables,
  type WorkflowDefinition,
  type WorkflowNode,
} from "../lib/workflowEngine"
import { getRagForOrganization } from "./ai/rag"
import { SEARCH_INTERPRETER_PROMPT } from "./ai/constants"
import {
  OPENAI_CHAT_MODEL,
  getOpenAIChatModelFromSecretValue,
} from "../lib/openai"

const WORKFLOW_PROMPT_SYSTEM = `You are an AI step inside a deterministic support workflow.
Follow the step instructions carefully.
Use conversation variables and the latest user message when relevant.
Keep replies concise and helpful.
Never invent policy, pricing, or product facts that are not provided in the instructions or knowledge context.`

type SessionContext = {
  organizationId: string
  threadId: string
  definition: WorkflowDefinition
  variables: RuntimeVariables
  pendingAiNodeId: string | null
}

const getNode = (
  definition: WorkflowDefinition,
  nodeId: string
): WorkflowNode | null =>
  (definition.nodes ?? []).find((node) => node.id === nodeId) ?? null

export const getSessionContext = internalQuery({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
  },
  returns: v.union(
    v.object({
      organizationId: v.string(),
      threadId: v.string(),
      definition: v.any(),
      variables: v.any(),
      pendingAiNodeId: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<SessionContext | null> => {
    const session = await ctx.db.get(args.sessionId)
    const conversation = await ctx.db.get(args.conversationId)

    if (
      !session ||
      !conversation ||
      session.status === "ended" ||
      session.conversationId !== conversation._id
    ) {
      return null
    }

    if (session.pendingAiNodeId && session.pendingAiNodeId !== args.nodeId) {
      return null
    }

    const workflow = await ctx.db.get(session.workflowId)

    if (!workflow?.publishedDefinition) {
      return null
    }

    return {
      organizationId: conversation.organizationId,
      threadId: conversation.threadId,
      definition: workflow.publishedDefinition as WorkflowDefinition,
      variables: (isRecord(session.variables)
        ? session.variables
        : {}) as RuntimeVariables,
      pendingAiNodeId: session.pendingAiNodeId ?? null,
    }
  },
})

const searchKnowledgeBase = async (
  ctx: any,
  organizationId: string,
  query: string,
  model?: string
) => {
  if (!query.trim()) {
    return "I couldn't find specific information about that in our knowledge base."
  }

  const openAIPlugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId,
      service: "openai_realtime",
    }
  )

  const rag = await getRagForOrganization(openAIPlugin?.secretValue)
  const searchResult = await rag.search(ctx, {
    namespace: organizationId,
    query,
    limit: 5,
  })

  if (!searchResult.entries.length) {
    return "I couldn't find specific information about that in our knowledge base."
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
        content: `User asked: "${query}"\n\nSearch results: ${contextText}`,
      },
    ],
    model: getOpenAIChatModelFromSecretValue(
      openAIPlugin?.secretValue,
      model || OPENAI_CHAT_MODEL
    ),
  })

  return response.text
}

const generatePromptReply = async (
  ctx: any,
  args: {
    organizationId: string
    instructions: string
    variables: RuntimeVariables
    useKnowledgeBase: boolean
    chatModel: string
  }
) => {
  const openAIPlugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId: args.organizationId,
      service: "openai_realtime",
    }
  )

  let knowledgeContext = ""

  if (args.useKnowledgeBase) {
    const query =
      args.variables.lastInput ||
      args.variables.lastUserMessage ||
      args.instructions

    knowledgeContext = await searchKnowledgeBase(
      ctx,
      args.organizationId,
      query,
      args.chatModel
    )
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
      openAIPlugin?.secretValue,
      args.chatModel
    ),
  })

  return response.text
}

export const runNode = internalAction({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(
      internal.system.workflowAiSteps.getSessionContext,
      {
        sessionId: args.sessionId,
        conversationId: args.conversationId,
        nodeId: args.nodeId,
      }
    )

    if (!session) {
      return { ok: false, error: "Session not ready for AI step" }
    }

    try {
      const node = getNode(session.definition, args.nodeId)
      const data = isRecord(node?.data) ? node!.data! : {}
      const type = asString(node?.type)
      const variables = session.variables as RuntimeVariables

      let assistantText = ""
      let outputVariable = getOutputVariableKey(data, "lastAiResponse")
      let sendMessage = true

      if (type === "kbSearch") {
        const query = buildKbQuery(data, variables)
        assistantText = await searchKnowledgeBase(
          ctx,
          session.organizationId,
          query
        )
        outputVariable = getOutputVariableKey(data, "kbAnswer")
        sendMessage = asBoolean(data.sendAsMessage, true)
      } else {
        const instructions = buildPromptInstructions(data, variables)
        const useKnowledgeBase = asBoolean(
          data.useKnowledgeBase,
          type === "playbook" || type === "agent" || type === "operator"
        )

        assistantText = await generatePromptReply(ctx, {
          organizationId: session.organizationId,
          instructions,
          variables,
          useKnowledgeBase,
          chatModel: OPENAI_CHAT_MODEL,
        })
      }

      await ctx.runMutation(internal.system.workflowRuntime.continueAfterAi, {
        sessionId: args.sessionId,
        conversationId: args.conversationId,
        nodeId: args.nodeId,
        assistantText: sendMessage ? assistantText : "",
        outputVariable,
        // When sendMessage is false, still persist the answer into variables.
        outputValue: sendMessage ? undefined : assistantText,
      })

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workflow AI step failed"

      console.error("workflowAiSteps.runNode failed", {
        sessionId: args.sessionId,
        nodeId: args.nodeId,
        error: message,
      })

      try {
        await ctx.runMutation(internal.system.workflowRuntime.continueAfterAi, {
          sessionId: args.sessionId,
          conversationId: args.conversationId,
          nodeId: args.nodeId,
          assistantText:
            "I had trouble completing this AI step. A human operator will continue from here.",
          outputVariable: "lastAiResponse",
        })
        await ctx.runMutation(internal.system.conversations.escalate, {
          threadId: session.threadId,
        })
      } catch (fallbackError) {
        console.error("workflowAiSteps fallback failed", fallbackError)
      }

      return { ok: false, error: message }
    }
  },
})
