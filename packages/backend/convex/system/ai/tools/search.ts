import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import z from "zod";
import { api, internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";
import { getRagForOrganization } from "../rag";
import { SEARCH_INTERPRETER_PROMPT } from "../constants";
import {
    OPENAI_CHAT_MODEL,
    getOpenAIChatModelFromSecretValue,
} from "../../../lib/openai";

export const search = createTool({
    description: "Search the knowledge base for relevant information to help answer user questions",
    args: z.object({
        query: z
            .string()
            .describe("The search query to find relevant information"),
    }),
    handler: async (ctx, args): Promise<string> => {
        if (!ctx.threadId) {
            return "Missing thread ID";
        }

        const conversation: any = await ctx.runQuery(
            internal.system.conversations.getByThreadId,
            { threadId: ctx.threadId },
        );

        if (!conversation) {
            return "Conversation not found";
        }
        const orgId: string = conversation.organizationId;

        const openAIPlugin: any = await ctx.runQuery(
            (internal as any).system.plugins.getByOrganizationIdAndService,
            { organizationId: orgId, service: "openai_realtime" },
        );
        const widgetSettings: any = await ctx.runQuery(
            api.public.widgetSettings.getByOrganizationId,
            { organizationId: orgId },
        );
        const chatModel =
            widgetSettings?.chatSettings?.model?.trim() || OPENAI_CHAT_MODEL;
        const rag = await getRagForOrganization(openAIPlugin?.secretValue);
        const searchResult = await rag.search(ctx, {
            namespace: orgId,
            query: args.query,
            limit: 5,
        });

        const contextText = `Found results in ${searchResult.entries
            .map((e) => e.title || null)
            .filter((t) => t !== null)
            .join(", ")}. Here is the context:\n\n${searchResult.text}`;

        const response: any = await generateText({
            messages: [
                {
                    role: "system",
                    content: SEARCH_INTERPRETER_PROMPT,
                },
                {
                    role: "user",
                    content: `User asked: "${args.query}"\n\nSearch results: ${contextText}`,
                },
            ],
            model: getOpenAIChatModelFromSecretValue(
                openAIPlugin?.secretValue,
                chatModel,
            ),
        });


        await supportAgent.saveMessage(ctx, {
            threadId: ctx.threadId,
            message: {
                role: "assistant",
                content: response.text,
            },
        });

        return response.text;
    }


});
