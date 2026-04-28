import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

const webhookEventTypeValidator = v.union(
    v.literal("contact_session.created"),
    v.literal("conversation.created"),
    v.literal("conversation.status_changed"),
    v.literal("message.received"),
    v.literal("message.sent")
);

const webhookProviderValidator = v.union(
    v.literal("webhook"),
    v.literal("discord"),
    v.literal("telegram"),
    v.literal("whatsapp")
);

const webhookProviderConfigValidator = v.object({
    telegramBotToken: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    whatsappAccessToken: v.optional(v.string()),
    whatsappPhoneNumberId: v.optional(v.string()),
    whatsappRecipientPhone: v.optional(v.string()),
});

type WebhookProvider = "webhook" | "discord" | "telegram" | "whatsapp";

type WebhookProviderConfig = {
    telegramBotToken?: string;
    telegramChatId?: string;
    whatsappAccessToken?: string;
    whatsappPhoneNumberId?: string;
    whatsappRecipientPhone?: string;
};

const DELIVERY_HISTORY_DELETE_BATCH_SIZE = 200;

const inferProviderFromUrl = (url?: string): WebhookProvider => {
    if (!url) {
        return "webhook";
    }

    const lower = url.toLowerCase();

    if (lower.includes("discord.com/api/webhooks")) {
        return "discord";
    }

    if (lower.includes("api.telegram.org")) {
        return "telegram";
    }

    if (lower.includes("graph.facebook.com")) {
        return "whatsapp";
    }

    return "webhook";
};

const getEffectiveProvider = (provider?: string, url?: string): WebhookProvider => {
    // Legacy Slack destinations now behave like plain webhooks.
    if (provider === "slack") {
        return "webhook";
    }

    if (
        provider === "discord" ||
        provider === "telegram" ||
        provider === "whatsapp" ||
        provider === "webhook"
    ) {
        return provider;
    }

    return inferProviderFromUrl(url);
};

const createSigningSecret = () => {
    const first = crypto.randomUUID().replaceAll("-", "");
    const second = crypto.randomUUID().replaceAll("-", "");
    return `whsec_${first}${second}`;
};

const normalizeOptionalString = (value?: string) => {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
};

const parseAndValidateWebhookUrl = (url: string, provider: WebhookProvider) => {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url);
    } catch {
        throw new ConvexError({
            code: "BAD_REQUEST",
            message: `Invalid ${provider} destination URL`,
        });
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new ConvexError({
            code: "BAD_REQUEST",
            message: "Destination URL must use http or https",
        });
    }

    return parsedUrl.toString();
};

const normalizeProviderConfig = (providerConfig?: WebhookProviderConfig) => {
    if (!providerConfig) {
        return undefined;
    }

    const normalized: WebhookProviderConfig = {
        telegramBotToken: normalizeOptionalString(providerConfig.telegramBotToken),
        telegramChatId: normalizeOptionalString(providerConfig.telegramChatId),
        whatsappAccessToken: normalizeOptionalString(providerConfig.whatsappAccessToken),
        whatsappPhoneNumberId: normalizeOptionalString(providerConfig.whatsappPhoneNumberId),
        whatsappRecipientPhone: normalizeOptionalString(providerConfig.whatsappRecipientPhone),
    };

    if (
        !normalized.telegramBotToken &&
        !normalized.telegramChatId &&
        !normalized.whatsappAccessToken &&
        !normalized.whatsappPhoneNumberId &&
        !normalized.whatsappRecipientPhone
    ) {
        return undefined;
    }

    return normalized;
};

const ensureProviderConfigRequirements = (
    provider: WebhookProvider,
    providerConfig?: WebhookProviderConfig
) => {
    if (provider === "telegram") {
        if (!providerConfig?.telegramBotToken || !providerConfig.telegramChatId) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Telegram requires bot token and chat ID",
            });
        }
    }

    if (provider === "whatsapp") {
        if (
            !providerConfig?.whatsappAccessToken ||
            !providerConfig.whatsappPhoneNumberId ||
            !providerConfig.whatsappRecipientPhone
        ) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "WhatsApp requires access token, phone number ID, and recipient phone",
            });
        }
    }
};

const resolveTargetUrl = ({
    provider,
    url,
    providerConfig,
    existingUrl,
}: {
    provider: WebhookProvider;
    url?: string;
    providerConfig?: WebhookProviderConfig;
    existingUrl?: string;
}) => {
    const providedUrl = normalizeOptionalString(url);

    if (provider === "telegram") {
        if (providedUrl) {
            return parseAndValidateWebhookUrl(providedUrl, provider);
        }

        return parseAndValidateWebhookUrl("https://api.telegram.org/sendMessage", provider);
    }

    if (provider === "whatsapp") {
        if (providedUrl) {
            return parseAndValidateWebhookUrl(providedUrl, provider);
        }

        return parseAndValidateWebhookUrl("https://graph.facebook.com/v19.0/messages", provider);
    }

    if (providedUrl) {
        return parseAndValidateWebhookUrl(providedUrl, provider);
    }

    if (existingUrl) {
        return parseAndValidateWebhookUrl(existingUrl, provider);
    }

    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

    throw new ConvexError({
        code: "BAD_REQUEST",
        message: `${providerLabel} destination URL is required`,
    });
};

const getProviderConfigPreview = (providerConfig?: WebhookProviderConfig) => {
    if (!providerConfig) {
        return undefined;
    }

    return {
        telegramChatId: providerConfig.telegramChatId,
        hasTelegramBotToken: Boolean(providerConfig.telegramBotToken),
        whatsappPhoneNumberId: providerConfig.whatsappPhoneNumberId,
        whatsappRecipientPhone: providerConfig.whatsappRecipientPhone,
        hasWhatsappAccessToken: Boolean(providerConfig.whatsappAccessToken),
    };
};

const getAuthContext = async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Identity not found",
        });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Organization not found",
        });
    }

    return {
        organizationId: orgId,
        actorId: identity.subject,
    };
};

const getOwnedWebhook = async (ctx: any, webhookId: any, organizationId: string) => {
    const webhook = await ctx.db.get(webhookId);

    if (!webhook) {
        throw new ConvexError({
            code: "NOT_FOUND",
            message: "Webhook not found",
        });
    }

    if (webhook.organizationId !== organizationId) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Invalid organization",
        });
    }

    return webhook;
};

export const getDashboard = query({
    args: {},
    handler: async (ctx) => {
        const { organizationId } = await getAuthContext(ctx);

        const webhooks = await ctx.db
            .query("integrationWebhooks")
            .withIndex("by_organization_id", (q: any) => q.eq("organizationId", organizationId))
            .order("desc")
            .collect();

        const deliveries = await ctx.db
            .query("webhookDeliveries")
            .withIndex("by_organization_id", (q: any) => q.eq("organizationId", organizationId))
            .order("desc")
            .take(50);

        const webhookById = new Map(webhooks.map((webhook: any) => [webhook._id, webhook]));

        return {
            webhooks: webhooks.map((webhook: any) => ({
                _id: webhook._id,
                _creationTime: webhook._creationTime,
                url: webhook.url,
                description: webhook.description,
                provider: getEffectiveProvider(webhook.provider, webhook.url),
                providerConfigPreview: getProviderConfigPreview(webhook.providerConfig),
                isEnabled: webhook.isEnabled,
                eventTypes: webhook.eventTypes,
                updatedAt: webhook.updatedAt,
                signingSecretPreview: `${webhook.signingSecret.slice(0, 14)}...`,
            })),
            deliveries: deliveries.map((delivery: any) => ({
                _id: delivery._id,
                _creationTime: delivery._creationTime,
                webhookId: delivery.webhookId,
                webhookUrl:
                    webhookById.get(delivery.webhookId)?.url ?? delivery.targetUrl,
                eventId: delivery.eventId,
                eventType: delivery.eventType,
                status: delivery.status,
                attempt: delivery.attempt,
                responseStatus: delivery.responseStatus,
                responseBody: delivery.responseBody,
                error: delivery.error,
                durationMs: delivery.durationMs,
            })),
        };
    },
});

export const createWebhook = mutation({
    args: {
        url: v.optional(v.string()),
        description: v.optional(v.string()),
        provider: v.optional(webhookProviderValidator),
        providerConfig: v.optional(webhookProviderConfigValidator),
        eventTypes: v.array(webhookEventTypeValidator),
    },
    handler: async (ctx, args) => {
        const { organizationId, actorId } = await getAuthContext(ctx);

        if (args.eventTypes.length === 0) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "At least one event type must be selected",
            });
        }

        const now = Date.now();
        const provider = (args.provider ?? "webhook") as WebhookProvider;
        const providerConfig = normalizeProviderConfig(args.providerConfig);
        ensureProviderConfigRequirements(provider, providerConfig);
        const normalizedUrl = resolveTargetUrl({
            provider,
            url: args.url,
            providerConfig,
        });
        const signingSecret = createSigningSecret();

        const webhookId = await ctx.db.insert("integrationWebhooks", {
            organizationId,
            url: normalizedUrl,
            description: args.description?.trim() ? args.description.trim() : undefined,
            provider,
            providerConfig,
            signingSecret,
            isEnabled: true,
            eventTypes: args.eventTypes,
            createdBy: actorId,
            updatedAt: now,
        });

        return {
            webhookId,
            signingSecret,
        };
    },
});

export const updateWebhook = mutation({
    args: {
        webhookId: v.id("integrationWebhooks"),
        url: v.optional(v.string()),
        description: v.optional(v.string()),
        provider: v.optional(webhookProviderValidator),
        providerConfig: v.optional(webhookProviderConfigValidator),
        isEnabled: v.optional(v.boolean()),
        eventTypes: v.optional(v.array(webhookEventTypeValidator)),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        const webhook = await getOwnedWebhook(ctx, args.webhookId, organizationId);

        if (args.eventTypes && args.eventTypes.length === 0) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "At least one event type must be selected",
            });
        }

        const patch: {
            url?: string;
            description?: string;
            provider?: WebhookProvider;
            providerConfig?: WebhookProviderConfig;
            isEnabled?: boolean;
            eventTypes?: Array<
                "contact_session.created" |
                "conversation.created" |
                "conversation.status_changed" |
                "message.received" |
                "message.sent"
            >;
            updatedAt: number;
        } = {
            updatedAt: Date.now(),
        };

        const existingProvider = getEffectiveProvider(webhook.provider, webhook.url);
        const nextProvider = (args.provider ?? existingProvider) as WebhookProvider;
        const existingProviderConfig =
            (webhook.providerConfig as WebhookProviderConfig | undefined) ?? undefined;
        const incomingProviderConfig = normalizeProviderConfig(args.providerConfig);
        const nextProviderConfig =
            args.providerConfig === undefined
                ? existingProviderConfig
                : {
                      ...existingProviderConfig,
                      ...incomingProviderConfig,
                  };
        const shouldUpdateTarget =
            args.url !== undefined ||
            args.provider !== undefined ||
            args.providerConfig !== undefined;

        ensureProviderConfigRequirements(nextProvider, nextProviderConfig);

        if (shouldUpdateTarget) {
            patch.url = resolveTargetUrl({
                provider: nextProvider,
                url: args.url,
                providerConfig: nextProviderConfig,
                existingUrl: webhook.url,
            });
        }

        if (args.description !== undefined) {
            patch.description = normalizeOptionalString(args.description);
        }

        if (args.provider !== undefined) {
            patch.provider = nextProvider;
        }

        if (args.providerConfig !== undefined) {
            patch.providerConfig = nextProviderConfig;
        }

        if (args.isEnabled !== undefined) {
            patch.isEnabled = args.isEnabled;
        }

        if (args.eventTypes !== undefined) {
            patch.eventTypes = args.eventTypes;
        }

        await ctx.db.patch(args.webhookId, patch);
    },
});

export const rotateSigningSecret = mutation({
    args: {
        webhookId: v.id("integrationWebhooks"),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        await getOwnedWebhook(ctx, args.webhookId, organizationId);

        const signingSecret = createSigningSecret();

        await ctx.db.patch(args.webhookId, {
            signingSecret,
            updatedAt: Date.now(),
        });

        return {
            signingSecret,
        };
    },
});

export const clearDeliveryHistory = mutation({
    args: {
        webhookId: v.optional(v.id("integrationWebhooks")),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        if (args.webhookId) {
            await getOwnedWebhook(ctx, args.webhookId, organizationId);
        }

        const deliveries = args.webhookId
            ? await ctx.db
                  .query("webhookDeliveries")
                  .withIndex("by_webhook_id", (q: any) => q.eq("webhookId", args.webhookId))
                  .order("desc")
                  .take(DELIVERY_HISTORY_DELETE_BATCH_SIZE)
            : await ctx.db
                  .query("webhookDeliveries")
                  .withIndex("by_organization_id", (q: any) => q.eq("organizationId", organizationId))
                  .order("desc")
                  .take(DELIVERY_HISTORY_DELETE_BATCH_SIZE);

        let deletedCount = 0;

        for (const delivery of deliveries) {
            if (delivery.organizationId !== organizationId) {
                continue;
            }

            await ctx.db.delete(delivery._id);
            deletedCount += 1;
        }

        return {
            deletedCount,
            hasMore: deliveries.length === DELIVERY_HISTORY_DELETE_BATCH_SIZE,
        };
    },
});

export const removeWebhook = mutation({
    args: {
        webhookId: v.id("integrationWebhooks"),
    },
    handler: async (ctx, args) => {
        const { organizationId } = await getAuthContext(ctx);

        await getOwnedWebhook(ctx, args.webhookId, organizationId);

        await ctx.db.delete(args.webhookId);
    },
});
