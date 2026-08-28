import { v } from "convex/values"

import { internal } from "../_generated/api"
import { internalAction, internalQuery } from "../_generated/server"
import {
  asString,
  getBlockSteps,
  isBlockNodeType,
  isRecord,
  type RuntimeVariables,
  type WorkflowDefinition,
} from "../lib/workflowEngine"
import { runApiStep } from "../lib/workflowApiStep"

type ApiStepContext = {
  nodeData: unknown
  nodeType: string
  variables: RuntimeVariables
  organizationId: string
  threadId: string
}

export const getStepContext = internalQuery({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
  },
  returns: v.union(
    v.object({
      nodeData: v.any(),
      nodeType: v.string(),
      variables: v.any(),
      organizationId: v.string(),
      threadId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<ApiStepContext | null> => {
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

    if (session.pendingApiNodeId && session.pendingApiNodeId !== args.nodeId) {
      return null
    }

    const workflow = await ctx.db.get(session.workflowId)

    if (!workflow?.publishedDefinition) {
      return null
    }

    const definition = workflow.publishedDefinition as WorkflowDefinition
    const node = (definition.nodes ?? []).find(
      (candidate) => candidate.id === args.nodeId
    )

    if (!node) {
      return null
    }

    // Inside a Block the deferred step is one entry in the step list, not the
    // block itself, so hand back that step's own type and data.
    const nodeData = isRecord(node.data) ? node.data : {}
    const blockSteps = isBlockNodeType(asString(node.type))
      ? getBlockSteps(nodeData)
      : null
    const blockStep = blockSteps?.[session.pendingStepIndex ?? 0]

    return {
      nodeData: blockStep ? blockStep.data : nodeData,
      nodeType: blockStep ? blockStep.type : asString(node.type),
      variables: (isRecord(session.variables)
        ? session.variables
        : {}) as RuntimeVariables,
      organizationId: conversation.organizationId,
      threadId: conversation.threadId,
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
    const context = await ctx.runQuery(
      internal.system.workflowApiSteps.getStepContext,
      {
        sessionId: args.sessionId,
        conversationId: args.conversationId,
        nodeId: args.nodeId,
      }
    )

    if (!context) {
      return { ok: false, error: "Session not ready for API step" }
    }

    const result = await runApiStep(
      isRecord(context.nodeData) ? context.nodeData : {},
      context.variables as RuntimeVariables
    )

    await ctx.runMutation(internal.system.workflowRuntime.continueAfterAction, {
      sessionId: args.sessionId,
      conversationId: args.conversationId,
      nodeId: args.nodeId,
      kind: "api",
      ok: result.ok,
      status: result.status,
      resultVariables: result.variables,
      error: result.error,
    })

    return { ok: result.ok, error: result.error }
  },
})
