import { createTool } from '@convex-dev/agent';
import z from "zod";
import { internal } from "../../../_generated/api";

export const escalateConversation = createTool({
    description: "Escalate a conversation to a human operator when the user needs human assistance",
    inputSchema: z.object({}),
    execute: async (ctx) => {
        if (!ctx.threadId) {
            return "Missing thread ID";
        }

        await ctx.runMutation(internal.system.conversations.escalate, {
            threadId: ctx.threadId,
        });

        // Returned to the model, not to the visitor: it writes the sentence the
        // visitor actually reads, in their language and the brand's voice.
        return "The conversation has been escalated to a human operator. Tell the user a teammate will pick this up shortly."
    },
});
