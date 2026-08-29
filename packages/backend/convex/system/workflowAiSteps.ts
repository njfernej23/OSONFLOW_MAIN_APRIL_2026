import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction, internalQuery } from "../_generated/server"
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
import {
  generatePromptReply,
  searchKnowledgeBase,
} from "../lib/workflowAiGeneration"
import { exitMessages, runAgentTurn } from "../lib/workflowAgentTurn"
import { OPENAI_CHAT_MODEL } from "../lib/openai"

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
      const openAIPlugin = await ctx.runQuery(
        internal.system.plugins.getByOrganizationIdAndService,
        {
          organizationId: session.organizationId,
          service: "openai_realtime",
        }
      )
      const secretValue = openAIPlugin?.secretValue
      const node = getNode(session.definition, args.nodeId)
      const data = isRecord(node?.data) ? node!.data! : {}
      const type = asString(node?.type)
      const variables = session.variables as RuntimeVariables

      // An Agent node runs a structured turn: it can take one of its exits,
      // collect variables, offer quick replies, or close the conversation.
      if (
        type === "playbook" ||
        type === "agent" ||
        type === "crew" ||
        type === "operator"
      ) {
        const turn = await runAgentTurn(ctx, {
          organizationId: session.organizationId,
          data,
          variables,
          secretValue,
          executeTool: async (toolName, toolArgs) =>
            await ctx.runAction(
              internal.system.assistantTools.execute.executeTool,
              {
                organizationId: session.organizationId,
                toolName,
                args: toolArgs,
                channel: "chat",
              }
            ),
        })

        await ctx.runMutation(internal.system.workflowRuntime.continueAfterAi, {
          sessionId: args.sessionId,
          conversationId: args.conversationId,
          nodeId: args.nodeId,
          assistantText: turn.reply,
          outputVariable: getOutputVariableKey(data, "lastAiResponse"),
          exitHandle: turn.exitId ?? undefined,
          collectedVariables: turn.variables,
          extraMessages: turn.exitId
            ? exitMessages(data, turn.exitId, {
                ...variables,
                ...turn.variables,
              })
            : [],
          pendingButtons: turn.buttons,
          // With no exits the agent is a plain AI reply: hand on to the next
          // node rather than holding a conversation it can never leave.
          outcome: turn.exitId
            ? "continue"
            : turn.action === "end"
              ? "end"
              : turn.action === "callForward"
                ? "callForward"
                : turn.hasExits
                  ? "wait"
                  : "continue",
        })

        return { ok: true }
      }

      let assistantText = ""
      let outputVariable = getOutputVariableKey(data, "lastAiResponse")
      let sendMessage = true

      if (type === "kbSearch") {
        const query = buildKbQuery(data, variables)
        assistantText = await searchKnowledgeBase(ctx, {
          organizationId: session.organizationId,
          query,
          secretValue,
        })
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
          secretValue,
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
