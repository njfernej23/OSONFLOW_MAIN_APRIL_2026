import { v } from "convex/values";
import { action } from "../_generated/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import rag from "../system/ai/rag";
import { SEARCH_INTERPRETER_PROMPT } from "../system/ai/constants";

// Called by the widget during a real-time voice call when the AI invokes the search_knowledge_base function.
export const search = action({
    args: {
        organizationId: v.string(),
        query: v.string(),
    },
    handler: async (ctx, args) => {
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

        const response = await generateText({
            messages: [
                { role: "system", content: SEARCH_INTERPRETER_PROMPT },
                {
                    role: "user",
                    content: `User asked: "${args.query}"\n\nSearch results: ${contextText}`,
                },
            ],
            model: openai.chat("gpt-4o-mini"),
        });

        return response.text;
    },
});
