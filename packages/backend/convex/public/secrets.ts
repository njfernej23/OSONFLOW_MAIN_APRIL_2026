import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { parseSecretValue } from "../lib/secrets";

export const getVapiSecrets = action({
    args: { organizationId: v.string() },
    handler: async (ctx, args): Promise<{ publicApiKey: string } | null> => {
        const plugin: Doc<"plugins"> | null = await ctx.runQuery(
            internal.system.plugins.getByOrganizationIdAndService,
            { organizationId: args.organizationId, service: "vapi" },
        );

        if (!plugin?.secretValue) return null;

        const secretData: { privateApiKey: string; publicApiKey: string } | null =
            parseSecretValue<{ privateApiKey: string; publicApiKey: string }>(plugin.secretValue);

        if (!secretData?.publicApiKey || !secretData?.privateApiKey) return null;

        return { publicApiKey: secretData.publicApiKey };
    },
});
