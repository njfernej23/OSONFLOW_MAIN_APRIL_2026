// Workflows disabled — not developing this feature for now.
/*
import { v } from "convex/values"
import { query } from "../_generated/server"

export const getActiveSummary = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query("workflows")
      .withIndex("by_organization_id_and_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true)
      )
      .first()

    if (!workflow?.publishedDefinition) {
      return null
    }

    return {
      workflowId: workflow._id,
      name: workflow.name,
      publishedAt: workflow.publishedAt ?? null,
    }
  },
})

export const getPendingChoices = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId)

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      return null
    }

    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation || conversation.contactSessionId !== contactSession._id) {
      return null
    }

    const session = await ctx.db
      .query("workflowSessions")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .unique()

    if (!session || session.status !== "waiting") {
      return null
    }

    return {
      workflowId: session.workflowId,
      pendingNodeId: session.pendingNodeId ?? null,
      buttons: session.pendingButtons ?? [],
    }
  },
})
*/
