import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constants";

const DEFAULT_THEME = {
    primaryColor: "#111111",
    headerGradientStart: "#4f46e5",
    headerGradientEnd: "#2563eb",
    userBubbleColor: "#111111",
    botBubbleColor: "#ffffff",
    borderRadius: 16,
    logoUrl: "",
    assistantName: "Support Assistant",
} as const;

const DEFAULT_APPEARANCE = {
    launcherColor: "#3b82f6",
    launcherLabel: "Chat with us",
    launcherIcon: "chat" as const,
    launcherIconUrl: "",
    poweredByText: "Osonflow",
    showPoweredBy: true,
};

const defaultSuggestionsValidator = v.object({
    suggestion1: v.optional(v.string()),
    suggestion2: v.optional(v.string()),
    suggestion3: v.optional(v.string()),
});

const vapiSettingsValidator = v.object({
    assistantId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
});

const themeValidator = v.object({
    primaryColor: v.optional(v.string()),
    headerGradientStart: v.optional(v.string()),
    headerGradientEnd: v.optional(v.string()),
    userBubbleColor: v.optional(v.string()),
    botBubbleColor: v.optional(v.string()),
    borderRadius: v.optional(v.number()),
    logoUrl: v.optional(v.string()),
    assistantName: v.optional(v.string()),
});

const appearanceValidator = v.object({
    launcherColor: v.optional(v.string()),
    launcherLabel: v.optional(v.string()),
    launcherIcon: v.optional(
        v.union(v.literal("chat"), v.literal("sparkles"), v.literal("question"))
    ),
    launcherIconUrl: v.optional(v.string()),
    poweredByText: v.optional(v.string()),
    showPoweredBy: v.optional(v.boolean()),
});

const widgetSettingsArgsValidator = {
    greetMessage: v.string(),
    systemPrompt: v.optional(v.string()),
    defaultSuggestions: defaultSuggestionsValidator,
    vapiSettings: vapiSettingsValidator,
    theme: v.optional(themeValidator),
    appearance: v.optional(appearanceValidator),
} as const;

type WidgetTheme = {
    primaryColor?: string;
    headerGradientStart?: string;
    headerGradientEnd?: string;
    userBubbleColor?: string;
    botBubbleColor?: string;
    borderRadius?: number;
    logoUrl?: string;
    assistantName?: string;
};

type WidgetAppearance = {
    launcherColor?: string;
    launcherLabel?: string;
    launcherIcon?: "chat" | "sparkles" | "question";
    launcherIconUrl?: string;
    poweredByText?: string;
    showPoweredBy?: boolean;
};

type WidgetSettingsSnapshot = {
    greetMessage: string;
    systemPrompt?: string;
    defaultSuggestions: {
        suggestion1?: string;
        suggestion2?: string;
        suggestion3?: string;
    };
    vapiSettings: {
        assistantId?: string;
        phoneNumber?: string;
    };
    theme?: WidgetTheme;
    appearance?: WidgetAppearance;
};

type VersionAction = "publish" | "rollback" | "bootstrap";

const createDefaultWidgetSettings = (): WidgetSettingsSnapshot => ({
    greetMessage: "Hi! How can I help you today?",
    systemPrompt: SUPPORT_AGENT_PROMPT,
    defaultSuggestions: {
        suggestion1: "",
        suggestion2: "",
        suggestion3: "",
    },
    vapiSettings: {
        assistantId: "",
        phoneNumber: "",
    },
    theme: { ...DEFAULT_THEME },
    appearance: { ...DEFAULT_APPEARANCE },
});

const clampBorderRadius = (value?: number) => {
    const parsed =
        typeof value === "number" && Number.isFinite(value)
            ? Math.round(value)
            : DEFAULT_THEME.borderRadius;

    return Math.min(32, Math.max(0, parsed));
};

const mergeTheme = (base?: WidgetTheme, incoming?: WidgetTheme): WidgetTheme => ({
    primaryColor:
        incoming?.primaryColor ?? base?.primaryColor ?? DEFAULT_THEME.primaryColor,
    headerGradientStart:
        incoming?.headerGradientStart ??
        base?.headerGradientStart ??
        DEFAULT_THEME.headerGradientStart,
    headerGradientEnd:
        incoming?.headerGradientEnd ??
        base?.headerGradientEnd ??
        DEFAULT_THEME.headerGradientEnd,
    userBubbleColor:
        incoming?.userBubbleColor ??
        base?.userBubbleColor ??
        DEFAULT_THEME.userBubbleColor,
    botBubbleColor:
        incoming?.botBubbleColor ?? base?.botBubbleColor ?? DEFAULT_THEME.botBubbleColor,
    borderRadius: clampBorderRadius(incoming?.borderRadius ?? base?.borderRadius),
    logoUrl: incoming?.logoUrl ?? base?.logoUrl ?? DEFAULT_THEME.logoUrl,
    assistantName:
        incoming?.assistantName ?? base?.assistantName ?? DEFAULT_THEME.assistantName,
});

const mergeAppearance = (
    base?: WidgetAppearance,
    incoming?: WidgetAppearance
): WidgetAppearance => ({
    launcherColor:
        incoming?.launcherColor ?? base?.launcherColor ?? DEFAULT_APPEARANCE.launcherColor,
    launcherLabel:
        incoming?.launcherLabel ?? base?.launcherLabel ?? DEFAULT_APPEARANCE.launcherLabel,
    launcherIcon:
        incoming?.launcherIcon ?? base?.launcherIcon ?? DEFAULT_APPEARANCE.launcherIcon,
    launcherIconUrl:
        incoming?.launcherIconUrl ??
        base?.launcherIconUrl ??
        DEFAULT_APPEARANCE.launcherIconUrl,
    poweredByText:
        incoming?.poweredByText ??
        base?.poweredByText ??
        DEFAULT_APPEARANCE.poweredByText,
    showPoweredBy:
        incoming?.showPoweredBy ??
        base?.showPoweredBy ??
        DEFAULT_APPEARANCE.showPoweredBy,
});

const normalizeSnapshot = (
    snapshot: WidgetSettingsSnapshot,
    base?: WidgetSettingsSnapshot
): WidgetSettingsSnapshot => {
    const fallback = base ?? createDefaultWidgetSettings();

    return {
        greetMessage: snapshot.greetMessage,
        systemPrompt: snapshot.systemPrompt ?? fallback.systemPrompt ?? SUPPORT_AGENT_PROMPT,
        defaultSuggestions: {
            suggestion1:
                snapshot.defaultSuggestions.suggestion1 ??
                fallback.defaultSuggestions.suggestion1 ??
                "",
            suggestion2:
                snapshot.defaultSuggestions.suggestion2 ??
                fallback.defaultSuggestions.suggestion2 ??
                "",
            suggestion3:
                snapshot.defaultSuggestions.suggestion3 ??
                fallback.defaultSuggestions.suggestion3 ??
                "",
        },
        vapiSettings: {
            assistantId:
                snapshot.vapiSettings.assistantId ?? fallback.vapiSettings.assistantId ?? "",
            phoneNumber:
                snapshot.vapiSettings.phoneNumber ?? fallback.vapiSettings.phoneNumber ?? "",
        },
        theme: mergeTheme(fallback.theme, snapshot.theme),
        appearance: mergeAppearance(fallback.appearance, snapshot.appearance),
    };
};

const getPublishedSnapshot = (widgetSettings: any | null): WidgetSettingsSnapshot => {
    const fallback = createDefaultWidgetSettings();

    if (!widgetSettings) {
        return fallback;
    }

    return normalizeSnapshot(
        {
            greetMessage: widgetSettings.greetMessage ?? fallback.greetMessage,
            systemPrompt: widgetSettings.systemPrompt ?? fallback.systemPrompt,
            defaultSuggestions: widgetSettings.defaultSuggestions ?? fallback.defaultSuggestions,
            vapiSettings: widgetSettings.vapiSettings ?? fallback.vapiSettings,
            theme: widgetSettings.theme,
            appearance: widgetSettings.appearance,
        },
        fallback
    );
};

const getDraftSnapshot = (widgetSettings: any | null): WidgetSettingsSnapshot => {
    const publishedSnapshot = getPublishedSnapshot(widgetSettings);

    if (!widgetSettings?.draft) {
        return publishedSnapshot;
    }

    return normalizeSnapshot(widgetSettings.draft, publishedSnapshot);
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

const getWidgetSettingsByOrganizationId = async (ctx: any, organizationId: string) => {
    return await ctx.db
        .query("widgetSettings")
        .withIndex("by_organization_id", (q: any) => q.eq("organizationId", organizationId))
        .unique();
};

const applyPublishedSnapshotPatch = (snapshot: WidgetSettingsSnapshot) => ({
    greetMessage: snapshot.greetMessage,
    systemPrompt: snapshot.systemPrompt,
    defaultSuggestions: snapshot.defaultSuggestions,
    vapiSettings: snapshot.vapiSettings,
    theme: snapshot.theme,
    appearance: snapshot.appearance,
});

const insertVersionRecord = async (ctx: any, args: {
    organizationId: string;
    version: number;
    settings: WidgetSettingsSnapshot;
    publishedAt: number;
    publishedBy?: string;
    action: VersionAction;
    sourceVersion?: number;
}) => {
    await ctx.db.insert("widgetSettingsVersions", {
        organizationId: args.organizationId,
        version: args.version,
        settings: args.settings,
        publishedAt: args.publishedAt,
        publishedBy: args.publishedBy,
        action: args.action,
        sourceVersion: args.sourceVersion,
    });
};

const ensureBaselineVersionRecord = async (
    ctx: any,
    organizationId: string,
    widgetSettings: any,
    actorId?: string
) => {
    const baselineVersion = widgetSettings.publishedVersion ?? 1;

    const existingBaseline = await ctx.db
        .query("widgetSettingsVersions")
        .withIndex("by_organization_id_and_version", (q: any) =>
            q.eq("organizationId", organizationId).eq("version", baselineVersion)
        )
        .unique();

    if (existingBaseline) {
        return;
    }

    await insertVersionRecord(ctx, {
        organizationId,
        version: baselineVersion,
        settings: getPublishedSnapshot(widgetSettings),
        publishedAt: widgetSettings.publishedAt ?? widgetSettings._creationTime,
        publishedBy: widgetSettings.publishedBy ?? actorId,
        action: "bootstrap",
    });
};

const saveDraftForOrganization = async (
    ctx: any,
    organizationId: string,
    actorId: string | undefined,
    draftArgs: WidgetSettingsSnapshot
) => {
    const now = Date.now();
    const existingWidgetSettings = await getWidgetSettingsByOrganizationId(ctx, organizationId);

    if (existingWidgetSettings) {
        const publishedSnapshot = getPublishedSnapshot(existingWidgetSettings);
        const baseDraftSnapshot = existingWidgetSettings.draft
            ? getDraftSnapshot(existingWidgetSettings)
            : publishedSnapshot;
        const nextDraft = normalizeSnapshot(draftArgs, baseDraftSnapshot);

        await ctx.db.patch(existingWidgetSettings._id, {
            draft: nextDraft,
            draftUpdatedAt: now,
            draftUpdatedBy: actorId,
            publishedVersion: existingWidgetSettings.publishedVersion ?? 1,
            publishedAt: existingWidgetSettings.publishedAt ?? existingWidgetSettings._creationTime,
            publishedBy: existingWidgetSettings.publishedBy ?? actorId,
        });

        return;
    }

    const initialPublished = createDefaultWidgetSettings();
    const nextDraft = normalizeSnapshot(draftArgs, initialPublished);

    await ctx.db.insert("widgetSettings", {
        organizationId,
        ...applyPublishedSnapshotPatch(initialPublished),
        draft: nextDraft,
        publishedVersion: 1,
        publishedAt: now,
        publishedBy: actorId,
        draftUpdatedAt: now,
        draftUpdatedBy: actorId,
    });

    await insertVersionRecord(ctx, {
        organizationId,
        version: 1,
        settings: initialPublished,
        publishedAt: now,
        publishedBy: actorId,
        action: "bootstrap",
    });
};

export const upsert = mutation({
    args: widgetSettingsArgsValidator,
    handler: async (ctx, args) => {
        const { organizationId, actorId } = await getAuthContext(ctx);
        await saveDraftForOrganization(ctx, organizationId, actorId, args);
    },
});

export const saveDraft = mutation({
    args: widgetSettingsArgsValidator,
    handler: async (ctx, args) => {
        const { organizationId, actorId } = await getAuthContext(ctx);
        await saveDraftForOrganization(ctx, organizationId, actorId, args);
    },
});

export const publishDraft = mutation({
    args: {},
    handler: async (ctx) => {
        const { organizationId, actorId } = await getAuthContext(ctx);
        const existingWidgetSettings = await getWidgetSettingsByOrganizationId(ctx, organizationId);

        if (!existingWidgetSettings) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Create and save a draft before publishing",
            });
        }

        await ensureBaselineVersionRecord(ctx, organizationId, existingWidgetSettings, actorId);

        const draftSnapshot = getDraftSnapshot(existingWidgetSettings);
        const now = Date.now();
        const nextVersion = (existingWidgetSettings.publishedVersion ?? 1) + 1;

        await ctx.db.patch(existingWidgetSettings._id, {
            ...applyPublishedSnapshotPatch(draftSnapshot),
            draft: draftSnapshot,
            publishedVersion: nextVersion,
            publishedAt: now,
            publishedBy: actorId,
            draftUpdatedAt: now,
            draftUpdatedBy: actorId,
        });

        await insertVersionRecord(ctx, {
            organizationId,
            version: nextVersion,
            settings: draftSnapshot,
            publishedAt: now,
            publishedBy: actorId,
            action: "publish",
        });

        return { publishedVersion: nextVersion };
    },
});

export const rollbackToVersion = mutation({
    args: {
        version: v.number(),
    },
    handler: async (ctx, args) => {
        if (!Number.isInteger(args.version) || args.version <= 0) {
            throw new ConvexError({
                code: "INVALID_INPUT",
                message: "Version must be a positive integer",
            });
        }

        const { organizationId, actorId } = await getAuthContext(ctx);
        const existingWidgetSettings = await getWidgetSettingsByOrganizationId(ctx, organizationId);

        if (!existingWidgetSettings) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "No widget settings found to rollback",
            });
        }

        await ensureBaselineVersionRecord(ctx, organizationId, existingWidgetSettings, actorId);

        const targetVersion = await ctx.db
            .query("widgetSettingsVersions")
            .withIndex("by_organization_id_and_version", (q: any) =>
                q.eq("organizationId", organizationId).eq("version", args.version)
            )
            .unique();

        if (!targetVersion) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: `Version v${args.version} does not exist`,
            });
        }

        const rollbackSnapshot = normalizeSnapshot(
            targetVersion.settings,
            getPublishedSnapshot(existingWidgetSettings)
        );
        const now = Date.now();
        const nextVersion = (existingWidgetSettings.publishedVersion ?? 1) + 1;

        await ctx.db.patch(existingWidgetSettings._id, {
            ...applyPublishedSnapshotPatch(rollbackSnapshot),
            draft: rollbackSnapshot,
            publishedVersion: nextVersion,
            publishedAt: now,
            publishedBy: actorId,
            draftUpdatedAt: now,
            draftUpdatedBy: actorId,
        });

        await insertVersionRecord(ctx, {
            organizationId,
            version: nextVersion,
            settings: rollbackSnapshot,
            publishedAt: now,
            publishedBy: actorId,
            action: "rollback",
            sourceVersion: args.version,
        });

        return {
            publishedVersion: nextVersion,
            rolledBackFromVersion: args.version,
        };
    },
});

export const getOne = query({
    args: {},
    handler: async (ctx) => {
        const { organizationId } = await getAuthContext(ctx);
        return await getWidgetSettingsByOrganizationId(ctx, organizationId);
    },
});

export const getCustomizationState = query({
    args: {},
    handler: async (ctx) => {
        const { organizationId } = await getAuthContext(ctx);
        const widgetSettings = await getWidgetSettingsByOrganizationId(ctx, organizationId);

        if (!widgetSettings) {
            const defaults = createDefaultWidgetSettings();

            return {
                published: defaults,
                draft: defaults,
                publishedVersion: 1,
                publishedAt: undefined,
                draftUpdatedAt: undefined,
                isDraftDifferentFromPublished: false,
                versions: [] as Array<{
                    version: number;
                    publishedAt: number;
                    publishedBy?: string;
                    action: VersionAction;
                    sourceVersion?: number;
                }>,
            };
        }

        const published = getPublishedSnapshot(widgetSettings);
        const draft = getDraftSnapshot(widgetSettings);

        const versionDocs = await ctx.db
            .query("widgetSettingsVersions")
            .withIndex("by_organization_id", (q: any) => q.eq("organizationId", organizationId))
            .collect();

        const versions = versionDocs
            .sort((a: any, b: any) => b.version - a.version)
            .slice(0, 20)
            .map((versionDoc: any) => ({
                version: versionDoc.version,
                publishedAt: versionDoc.publishedAt,
                publishedBy: versionDoc.publishedBy,
                action: versionDoc.action as VersionAction,
                sourceVersion: versionDoc.sourceVersion,
            }));

        return {
            published,
            draft,
            publishedVersion: widgetSettings.publishedVersion ?? 1,
            publishedAt: widgetSettings.publishedAt ?? widgetSettings._creationTime,
            draftUpdatedAt: widgetSettings.draftUpdatedAt ?? widgetSettings._creationTime,
            isDraftDifferentFromPublished:
                JSON.stringify(draft) !== JSON.stringify(published),
            versions,
        };
    },
});