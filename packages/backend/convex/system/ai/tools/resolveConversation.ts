import { createTool } from '@convex-dev/agent';
import z from "zod";
import { internal } from "../../../_generated/api";

export const resolveConversation = createTool({
    description: "Resolve a conversation when the user's issue has been successfully addressed",
    inputSchema: z.object({}),
    execute: async (ctx) => {
        if (!ctx.threadId) {
            return "Missing thread ID";
        }

        await ctx.runMutation(internal.system.conversations.resolve, {
            threadId: ctx.threadId,
        });

        // Returned to the model, not to the visitor: it writes the closing line
        // the visitor actually reads.
        return "The conversation has been marked resolved. Close off warmly and invite the user back if they need anything else."
    },
});
