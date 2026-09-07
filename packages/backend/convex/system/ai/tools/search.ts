import { createTool } from "@convex-dev/agent"
import z from "zod"
import { internal } from "../../../_generated/api"
import { answerFromKnowledgeBase } from "../../../lib/knowledgeBaseAnswer"
import { OPENAI_CHAT_MODEL } from "../../../lib/openai"

export const search = createTool({
  description:
    "Search the knowledge base for relevant information to help answer user questions",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant information"),
  }),
  execute: async (ctx, args): Promise<string> => {
    if (!ctx.threadId) {
      return "Missing thread ID"
    }

    const conversation: any = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId }
    )

    if (!conversation) {
      return "Conversation not found"
    }
    const orgId: string = conversation.organizationId

    const openAIPlugin: any = await ctx.runQuery(
      (internal as any).system.plugins.getByOrganizationIdAndService,
      { organizationId: orgId, service: "openai_realtime" }
    )
    const widgetSettings: any = await ctx.runQuery(
      internal.system.widgetSettings.getByOrganizationId,
      {
        organizationId: orgId,
        agentId: conversation.agentId,
      }
    )
    const chatModel =
      widgetSettings?.chatSettings?.model?.trim() || OPENAI_CHAT_MODEL

    // Handed back to the model as findings, not written into the thread. The
    // model turns it into the reply, so the visitor gets one answer instead of
    // this interpretation followed by a second summary of it.
    return await answerFromKnowledgeBase(ctx, {
      organizationId: orgId,
      query: args.query,
      model: chatModel,
      openAISecretValue: openAIPlugin?.secretValue,
    })
  },
})
