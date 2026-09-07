import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { answerFromKnowledgeBase } from "../lib/knowledgeBaseAnswer";
import { enforceRateLimit } from "../lib/rateLimits";
import { requireContactSessionFromAction } from "../lib/widgetAuth";

// Called by the widget during a real-time voice call when the AI invokes the search_knowledge_base function.
export const search = action({
    args: {
        organizationId: v.string(),
        contactSessionId: v.id("contactSessions"),
        query: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        // Reads the organization's private knowledge base and spends its model
        // credits, so it must be tied to a session belonging to that organization.
        await requireContactSessionFromAction(ctx, {
            contactSessionId: args.contactSessionId,
            organizationId: args.organizationId,
        });

        await enforceRateLimit(ctx, "assistantToolExecuteBySession", {
            key: `${args.organizationId}:${args.contactSessionId}`,
            message: "Too many knowledge base lookups. Please wait a moment.",
        });
        await enforceRateLimit(ctx, "assistantToolExecuteByOrg", {
            key: args.organizationId,
            message: "This assistant is receiving too many requests right now.",
        });

        const openAIPlugin: any = await ctx.runQuery(
            (internal as any).system.plugins.getByOrganizationIdAndService,
            {
                organizationId: args.organizationId,
                service: "openai_realtime",
            },
        );

        return await answerFromKnowledgeBase(ctx, {
            organizationId: args.organizationId,
            query: args.query,
            openAISecretValue: openAIPlugin?.secretValue,
        });
    },
});
