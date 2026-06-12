import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { generateText } from "ai";
import { getRagForOrganization } from "../system/ai/rag";
import { SEARCH_INTERPRETER_PROMPT } from "../system/ai/constants";
import { getOpenAIChatModelFromSecretValue } from "../lib/openai";

// Called by the widget during a real-time voice call when the AI invokes the search_knowledge_base function.
export const search = action({
    args: {
        organizationId: v.string(),
        query: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        const openAIPlugin: any = await ctx.runQuery(
            (internal as any).system.plugins.getByOrganizationIdAndService,
            {
                organizationId: args.organizationId,
                service: "openai_realtime",
            },
        );
        const rag = await getRagForOrganization(openAIPlugin?.secretValue);
        const searchResult = await rag.search(ctx, {
            namespace: args.organizationId,
            query: args.query,
            limit: 5,
        });

        if (!searchResult.entries.length) {
            return "I couldn't find specific information about that in our knowledge base.";
        }

        const contextText = `Found results in ${searchResult.entries
            .map((e) => e.title || null)
            .filter((t) => t !== null)
            .join(", ")}. Here is the context:\n\n${searchResult.text}`;

        const response: any = await generateText({
            system: SEARCH_INTERPRETER_PROMPT,
            messages: [
                {
                    role: "user",
                    content: `User asked: "${args.query}"\n\nSearch results: ${contextText}`,
                },
            ],
            model: getOpenAIChatModelFromSecretValue(openAIPlugin?.secretValue),
        });

        return response.text;
    },
});
