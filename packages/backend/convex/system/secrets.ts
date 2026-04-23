import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { serializeSecretValue } from "../lib/secrets";

export const upsert = internalAction({
    args: {
        organizationId: v.string(),
        service: v.union(v.literal("vapi"), v.literal("openai_realtime"), v.literal("gemini_live")),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const secretName = `tenant/${args.organizationId}/${args.service}`;
        const secretValue = serializeSecretValue(args.value);

        await ctx.runMutation(internal.system.plugins.upsert, {
            service: args.service,
            secretName,
            secretValue,
            organizationId: args.organizationId,
        });

        return { status: "success" };
    },
});
