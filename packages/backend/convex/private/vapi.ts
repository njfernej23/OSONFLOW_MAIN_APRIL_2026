import { VapiClient, Vapi } from "@vapi-ai/server-sdk";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { parseSecretValue } from "../lib/secrets";
import { ConvexError } from "convex/values";

type VapiCredentials = { privateApiKey: string; publicApiKey: string };

async function getVapiCredentials(ctx: { runQuery: Function; auth: { getUserIdentity: () => Promise<any> } }): Promise<{ orgId: string; creds: VapiCredentials }> {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        throw new ConvexError({ code: "UNAUTHORIZED", message: "Identity not found" });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
        throw new ConvexError({ code: "UNAUTHORIZED", message: "Organization not found" });
    }

    const plugin: Doc<"plugins"> | null = await ctx.runQuery(
        internal.system.plugins.getByOrganizationIdAndService,
        { organizationId: orgId, service: "vapi" },
    );

    if (!plugin) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Plugin not found" });
    }

    if (!plugin.secretValue) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Credentials not found" });
    }

    const creds: VapiCredentials | null = parseSecretValue<VapiCredentials>(plugin.secretValue);

    if (!creds) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Credentials not found" });
    }

    if (!creds.privateApiKey || !creds.publicApiKey) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Credentials incomplete. Please reconnect your Vapi account." });
    }

    return { orgId, creds };
}

export const getAssistants = action({
    args: {},
    handler: async (ctx): Promise<Vapi.Assistant[]> => {
        const { creds } = await getVapiCredentials(ctx);
        const vapiClient = new VapiClient({ token: creds.privateApiKey });
        return await vapiClient.assistants.list();
    },
});

export const getPhoneNumbers = action({
    args: {},
    handler: async (ctx): Promise<Vapi.phoneNumbers.ListPhoneNumbersResponseItem[]> => {
        const { creds } = await getVapiCredentials(ctx);
        const vapiClient = new VapiClient({ token: creds.privateApiKey });
        return await vapiClient.phoneNumbers.list();
    },
});
