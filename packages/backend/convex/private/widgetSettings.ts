import { ConvexError, v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constants"

const DEFAULT_THEME = {
  primaryColor: "#000000",
  headerGradientStart: "#000000",
  headerGradientEnd: "#000000",
  userBubbleColor: "#000000",
  botBubbleColor: "#ECF1F7",
  borderRadius: 16,
  logoUrl: "",
  backgroundImageUrl: "",
  assistantName: "Support Assistant",
} as const

const DEFAULT_APPEARANCE = {
  launcherColor: "#000000",
  launcherLabel: "Chat with us",
  launcherIcon: "question" as const,
  launcherIconUrl: "",
  animation: "scale" as const,
  poweredByText: "Osonflow",
  showPoweredBy: true,
  showHelpCenter: true,
}

const defaultSuggestionsValidator = v.object({
  suggestion1: v.optional(v.string()),
  suggestion2: v.optional(v.string()),
  suggestion3: v.optional(v.string()),
})

const helpArticleValidator = v.object({
  title: v.string(),
  excerpt: v.string(),
  body: v.string(),
})

const legacyHelpArticlesValidator = v.object({
  article1: helpArticleValidator,
  article2: helpArticleValidator,
  article3: helpArticleValidator,
})

const helpTopicValidator = v.object({
  title: v.string(),
  excerpt: v.string(),
  articles: v.array(helpArticleValidator),
})

const helpTopicsValidator = v.array(helpTopicValidator)

const homeCardValidator = v.object({
  type: v.literal("article"),
  topicIndex: v.number(),
  articleIndex: v.number(),
})

const homeCardsValidator = v.array(homeCardValidator)

const vapiSettingsValidator = v.object({
  assistantId: v.optional(v.string()),
  phoneNumber: v.optional(v.string()),
})

const chatSettingsValidator = v.object({
  model: v.optional(v.string()),
})

const openaiRealtimeSettingsValidator = v.object({
  enabled: v.optional(v.boolean()),
  model: v.optional(v.string()),
  voice: v.optional(v.string()),
})

const geminiLiveSettingsValidator = v.object({
  enabled: v.optional(v.boolean()),
  model: v.optional(v.string()),
  voice: v.optional(v.string()),
})

const themeValidator = v.object({
  primaryColor: v.optional(v.string()),
  headerGradientStart: v.optional(v.string()),
  headerGradientEnd: v.optional(v.string()),
  userBubbleColor: v.optional(v.string()),
  botBubbleColor: v.optional(v.string()),
  borderRadius: v.optional(v.number()),
  logoUrl: v.optional(v.string()),
  backgroundImageUrl: v.optional(v.string()),
  assistantName: v.optional(v.string()),
  headerBrandMode: v.optional(
    v.union(v.literal("none"), v.literal("image"), v.literal("text"))
  ),
  headerBannerImageUrl: v.optional(v.string()),
  headerBannerText: v.optional(v.string()),
  headerBannerTextColor: v.optional(v.string()),
  headerBannerAccentColor: v.optional(v.string()),
  headerBannerFont: v.optional(
    v.union(
      v.literal("sans"),
      v.literal("serif"),
      v.literal("mono"),
      v.literal("display")
    )
  ),
  headerBannerStyle: v.optional(
    v.union(v.literal("plain"), v.literal("pill"), v.literal("gradient"))
  ),
})

const appearanceValidator = v.object({
  launcherColor: v.optional(v.string()),
  launcherLabel: v.optional(v.string()),
  launcherIcon: v.optional(
    v.union(v.literal("chat"), v.literal("sparkles"), v.literal("question"))
  ),
  launcherIconUrl: v.optional(v.string()),
  animation: v.optional(
    v.union(
      v.literal("slide-up"),
      v.literal("scale"),
      v.literal("fade"),
      v.literal("pop")
    )
  ),
  poweredByText: v.optional(v.string()),
  showPoweredBy: v.optional(v.boolean()),
  showHelpCenter: v.optional(v.boolean()),
})

const widgetSettingsArgsValidator = {
  greetMessage: v.string(),
  systemPrompt: v.optional(v.string()),
  defaultSuggestions: defaultSuggestionsValidator,
  helpArticles: v.optional(legacyHelpArticlesValidator),
  helpTopics: helpTopicsValidator,
  homeCards: homeCardsValidator,
  vapiSettings: vapiSettingsValidator,
  chatSettings: v.optional(chatSettingsValidator),
  openaiRealtimeSettings: v.optional(openaiRealtimeSettingsValidator),
  geminiLiveSettings: v.optional(geminiLiveSettingsValidator),
  theme: v.optional(themeValidator),
  appearance: v.optional(appearanceValidator),
} as const

type WidgetTheme = {
  primaryColor?: string
  headerGradientStart?: string
  headerGradientEnd?: string
  userBubbleColor?: string
  botBubbleColor?: string
  borderRadius?: number
  logoUrl?: string
  backgroundImageUrl?: string
  assistantName?: string
}

type WidgetAppearance = {
  launcherColor?: string
  launcherLabel?: string
  launcherIcon?: "chat" | "sparkles" | "question"
  launcherIconUrl?: string
  animation?: "slide-up" | "scale" | "fade" | "pop"
  poweredByText?: string
  showPoweredBy?: boolean
  showHelpCenter?: boolean
}

type HelpArticle = {
  title: string
  excerpt: string
  body: string
}

type HelpArticles = {
  article1: HelpArticle
  article2: HelpArticle
  article3: HelpArticle
}

type LegacyHelpTopic = {
  title: string
  excerpt: string
  articles: HelpArticles
}

type HelpTopic = {
  title: string
  excerpt: string
  articles: HelpArticle[]
}

type LegacyHelpTopics = {
  topic1: LegacyHelpTopic
  topic2: LegacyHelpTopic
  topic3: LegacyHelpTopic
}

type HelpTopics = HelpTopic[]

type HomeCard = {
  type: "topic" | "article"
  topicIndex: number
  articleIndex?: number
}

type WidgetSettingsSnapshot = {
  greetMessage: string
  systemPrompt?: string
  chatSettings?: {
    model?: string
  }
  defaultSuggestions: {
    suggestion1?: string
    suggestion2?: string
    suggestion3?: string
  }
  helpArticles?: HelpArticles
  helpTopics?: HelpTopics | LegacyHelpTopics
  homeCards?: HomeCard[]
  vapiSettings: {
    assistantId?: string
    phoneNumber?: string
  }
  openaiRealtimeSettings?: {
    enabled?: boolean
    model?: string
    voice?: string
  }
  geminiLiveSettings?: {
    enabled?: boolean
    model?: string
    voice?: string
  }
  theme?: WidgetTheme
  appearance?: WidgetAppearance
}

type VersionAction = "publish" | "rollback" | "bootstrap"

const createDefaultWidgetSettings = (): WidgetSettingsSnapshot => ({
  greetMessage: "Hi! How can I help you today?",
  systemPrompt: SUPPORT_AGENT_PROMPT,
  defaultSuggestions: {
    suggestion1: "",
    suggestion2: "",
    suggestion3: "",
  },
  helpTopics: [
    {
      title: "Getting started",
      excerpt: "Setup guides and first steps for new users.",
      articles: [
        {
          title: "How do I get started?",
          excerpt:
            "Learn the fastest way to begin and get value from the product.",
          body: "Getting started is simple:\n\n1. Create your account and complete the first setup steps.\n2. Add your key details so the assistant can understand your needs.\n3. Open chat if you need help with a specific question.",
        },
        {
          title: "What should I do first?",
          excerpt: "A quick checklist for the first useful actions.",
          body: "Start with the most important setup items first.\n\nConfirm your profile, review the available tools, and ask the assistant any product-specific question you have.",
        },
        {
          title: "Where can I ask questions?",
          excerpt: "Find the best place to get help in the widget.",
          body: "Use the Help tab for written articles. Use Messages or Start AI chat when you want a conversational answer.",
        },
      ],
    },
    {
      title: "Billing and plans",
      excerpt: "Plan, billing, and subscription information.",
      articles: [
        {
          title: "What are your pricing plans?",
          excerpt:
            "Review where to find plan, billing, and subscription information.",
          body: "Pricing depends on the plan and features enabled for your organization.\n\nYou can check the current plan from your account or billing page.",
        },
        {
          title: "How do I update billing?",
          excerpt: "Learn where billing details are managed.",
          body: "Billing details are usually managed from your account billing page.\n\nIf you cannot find it, start an AI chat and ask for billing help.",
        },
        {
          title: "Can I change my plan?",
          excerpt: "Understand the next step for upgrades or changes.",
          body: "Plan changes depend on your organization settings.\n\nContact support or start an AI chat with the plan you want to change to.",
        },
      ],
    },
    {
      title: "Account help",
      excerpt: "Login, access, and profile issue guidance.",
      articles: [
        {
          title: "I need help with my account",
          excerpt:
            "Find the best next step for login, access, or profile issues.",
          body: "For account help, first confirm that your email address and organization are correct.\n\nIf you cannot access something, start an AI chat with the details of the issue.",
        },
        {
          title: "I cannot log in",
          excerpt: "Troubleshoot login and access problems.",
          body: "Check that you are using the right email address and organization.\n\nIf login still fails, include the error message when you contact support.",
        },
        {
          title: "How do I update my profile?",
          excerpt: "Find where your personal account details live.",
          body: "Profile settings are managed in your account area.\n\nIf you do not see the field you need, ask the assistant for help.",
        },
      ],
    },
  ],
  homeCards: [
    { type: "article", topicIndex: 0, articleIndex: 0 },
    { type: "article", topicIndex: 1, articleIndex: 0 },
    { type: "article", topicIndex: 2, articleIndex: 0 },
  ],
  vapiSettings: {
    assistantId: "",
    phoneNumber: "",
  },
  chatSettings: {
    model: "gpt-4o-mini",
  },
  openaiRealtimeSettings: {
    enabled: false,
    model: "gpt-realtime",
    voice: "marin",
  },
  geminiLiveSettings: {
    enabled: false,
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    voice: "Kore",
  },
  theme: { ...DEFAULT_THEME },
  appearance: { ...DEFAULT_APPEARANCE },
})

const clampBorderRadius = (value?: number) => {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : DEFAULT_THEME.borderRadius

  return Math.min(32, Math.max(0, parsed))
}

const mergeTheme = (
  base?: WidgetTheme,
  incoming?: WidgetTheme
): WidgetTheme => ({
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
    incoming?.botBubbleColor ??
    base?.botBubbleColor ??
    DEFAULT_THEME.botBubbleColor,
  borderRadius: clampBorderRadius(incoming?.borderRadius ?? base?.borderRadius),
  logoUrl: incoming?.logoUrl ?? base?.logoUrl ?? DEFAULT_THEME.logoUrl,
  backgroundImageUrl:
    incoming?.backgroundImageUrl ??
    base?.backgroundImageUrl ??
    DEFAULT_THEME.backgroundImageUrl,
  assistantName:
    incoming?.assistantName ??
    base?.assistantName ??
    DEFAULT_THEME.assistantName,
})

const mergeAppearance = (
  base?: WidgetAppearance,
  incoming?: WidgetAppearance
): WidgetAppearance => ({
  launcherColor:
    incoming?.launcherColor ??
    base?.launcherColor ??
    DEFAULT_APPEARANCE.launcherColor,
  launcherLabel:
    incoming?.launcherLabel ??
    base?.launcherLabel ??
    DEFAULT_APPEARANCE.launcherLabel,
  launcherIcon:
    incoming?.launcherIcon ??
    base?.launcherIcon ??
    DEFAULT_APPEARANCE.launcherIcon,
  launcherIconUrl:
    incoming?.launcherIconUrl ??
    base?.launcherIconUrl ??
    DEFAULT_APPEARANCE.launcherIconUrl,
  animation:
    incoming?.animation ?? base?.animation ?? DEFAULT_APPEARANCE.animation,
  poweredByText:
    incoming?.poweredByText ??
    base?.poweredByText ??
    DEFAULT_APPEARANCE.poweredByText,
  showPoweredBy:
    incoming?.showPoweredBy ??
    base?.showPoweredBy ??
    DEFAULT_APPEARANCE.showPoweredBy,
  showHelpCenter:
    incoming?.showHelpCenter ??
    base?.showHelpCenter ??
    DEFAULT_APPEARANCE.showHelpCenter,
})

const legacyArticlesToArray = (articles: HelpArticles): HelpArticle[] => [
  articles.article1,
  articles.article2,
  articles.article3,
]

const helpTopicsToArray = (
  topics: HelpTopics | LegacyHelpTopics
): HelpTopics => {
  if (Array.isArray(topics)) {
    return topics
  }

  return [topics.topic1, topics.topic2, topics.topic3].map((topic) => ({
    title: topic.title,
    excerpt: topic.excerpt,
    articles: legacyArticlesToArray(topic.articles),
  }))
}

const normalizeHelpTopics = (
  topics?: HelpTopics | LegacyHelpTopics,
  fallback?: HelpTopics | LegacyHelpTopics
): HelpTopics => {
  const source =
    topics ?? fallback ?? createDefaultWidgetSettings().helpTopics ?? []

  return helpTopicsToArray(source)
    .map((topic) => ({
      title: topic.title.trim(),
      excerpt: topic.excerpt.trim(),
      articles: topic.articles
        .map((article) => ({
          title: article.title.trim(),
          excerpt: article.excerpt.trim(),
          body: article.body.trim(),
        }))
        .filter((article) => article.title && article.excerpt && article.body),
    }))
    .filter((topic) => topic.title && topic.excerpt && topic.articles.length)
}

const normalizeHomeCards = (
  homeCards: HomeCard[] | undefined,
  helpTopics: HelpTopics,
  fallback?: HomeCard[]
): HomeCard[] => {
  const fallbackCards = helpTopics.reduce<HomeCard[]>(
    (cards, topic, topicIndex) => {
      if (cards.length >= 3 || !topic.articles[0]) return cards

      cards.push({
        type: "article",
        topicIndex,
        articleIndex: 0,
      })
      return cards
    },
    []
  )

  const source: HomeCard[] = homeCards ?? fallback ?? fallbackCards

  const normalized = source.reduce<HomeCard[]>((cards, card) => {
    const topicIndex = Math.max(0, Math.round(card.topicIndex))

    if (!helpTopics[topicIndex]) return cards

    const articleIndex =
      typeof card.articleIndex === "number"
        ? Math.max(0, Math.round(card.articleIndex))
        : 0

    if (!helpTopics[topicIndex]?.articles[articleIndex]) return cards
    cards.push({ type: "article", topicIndex, articleIndex })
    return cards
  }, [])

  return normalized.length ? normalized : fallbackCards
}

const normalizeSnapshot = (
  snapshot: WidgetSettingsSnapshot,
  base?: WidgetSettingsSnapshot
): WidgetSettingsSnapshot => {
  const fallback = base ?? createDefaultWidgetSettings()
  const helpTopics = normalizeHelpTopics(
    snapshot.helpTopics,
    fallback.helpTopics
  )

  return {
    greetMessage: snapshot.greetMessage,
    systemPrompt:
      snapshot.systemPrompt ?? fallback.systemPrompt ?? SUPPORT_AGENT_PROMPT,
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
    helpArticles: snapshot.helpArticles ?? fallback.helpArticles,
    helpTopics,
    homeCards: normalizeHomeCards(
      snapshot.homeCards,
      helpTopics,
      fallback.homeCards
    ),
    vapiSettings: {
      assistantId:
        snapshot.vapiSettings.assistantId ??
        fallback.vapiSettings.assistantId ??
        "",
      phoneNumber:
        snapshot.vapiSettings.phoneNumber ??
        fallback.vapiSettings.phoneNumber ??
        "",
    },
    chatSettings: {
      model:
        snapshot.chatSettings?.model ??
        fallback.chatSettings?.model ??
        "gpt-4o-mini",
    },
    openaiRealtimeSettings: {
      enabled:
        snapshot.openaiRealtimeSettings?.enabled ??
        fallback.openaiRealtimeSettings?.enabled ??
        false,
      model:
        snapshot.openaiRealtimeSettings?.model ??
        fallback.openaiRealtimeSettings?.model ??
        "gpt-realtime",
      voice:
        snapshot.openaiRealtimeSettings?.voice ??
        fallback.openaiRealtimeSettings?.voice ??
        "marin",
    },
    geminiLiveSettings: {
      enabled:
        snapshot.geminiLiveSettings?.enabled ??
        fallback.geminiLiveSettings?.enabled ??
        false,
      model:
        snapshot.geminiLiveSettings?.model ??
        fallback.geminiLiveSettings?.model ??
        "gemini-2.5-flash-native-audio-preview-12-2025",
      voice:
        snapshot.geminiLiveSettings?.voice ??
        fallback.geminiLiveSettings?.voice ??
        "Kore",
    },
    theme: mergeTheme(fallback.theme, snapshot.theme),
    appearance: mergeAppearance(fallback.appearance, snapshot.appearance),
  }
}

const getPublishedSnapshot = (
  widgetSettings: any | null
): WidgetSettingsSnapshot => {
  const fallback = createDefaultWidgetSettings()

  if (!widgetSettings) {
    return fallback
  }

  return normalizeSnapshot(
    {
      greetMessage: widgetSettings.greetMessage ?? fallback.greetMessage,
      systemPrompt: widgetSettings.systemPrompt ?? fallback.systemPrompt,
      defaultSuggestions:
        widgetSettings.defaultSuggestions ?? fallback.defaultSuggestions,
      helpArticles: widgetSettings.helpArticles ?? fallback.helpArticles,
      helpTopics: widgetSettings.helpTopics ?? fallback.helpTopics,
      homeCards: widgetSettings.homeCards ?? fallback.homeCards,
      vapiSettings: widgetSettings.vapiSettings ?? fallback.vapiSettings,
      chatSettings: widgetSettings.chatSettings ?? fallback.chatSettings,
      openaiRealtimeSettings:
        widgetSettings.openaiRealtimeSettings ??
        fallback.openaiRealtimeSettings,
      geminiLiveSettings:
        widgetSettings.geminiLiveSettings ?? fallback.geminiLiveSettings,
      theme: widgetSettings.theme,
      appearance: widgetSettings.appearance,
    },
    fallback
  )
}

const getDraftSnapshot = (
  widgetSettings: any | null
): WidgetSettingsSnapshot => {
  const publishedSnapshot = getPublishedSnapshot(widgetSettings)

  if (!widgetSettings?.draft) {
    return publishedSnapshot
  }

  return normalizeSnapshot(widgetSettings.draft, publishedSnapshot)
}

const getAuthContext = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const orgId = identity.orgId as string

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return {
    organizationId: orgId,
    actorId: identity.subject,
  }
}

const getWidgetSettingsByOrganizationId = async (
  ctx: any,
  organizationId: string
) => {
  return await ctx.db
    .query("widgetSettings")
    .withIndex("by_organization_id", (q: any) =>
      q.eq("organizationId", organizationId)
    )
    .unique()
}

const applyPublishedSnapshotPatch = (snapshot: WidgetSettingsSnapshot) => ({
  greetMessage: snapshot.greetMessage,
  systemPrompt: snapshot.systemPrompt,
  defaultSuggestions: snapshot.defaultSuggestions,
  helpArticles: snapshot.helpArticles,
  helpTopics: snapshot.helpTopics,
  homeCards: snapshot.homeCards,
  vapiSettings: snapshot.vapiSettings,
  chatSettings: snapshot.chatSettings,
  openaiRealtimeSettings: snapshot.openaiRealtimeSettings,
  geminiLiveSettings: snapshot.geminiLiveSettings,
  theme: snapshot.theme,
  appearance: snapshot.appearance,
})

const insertVersionRecord = async (
  ctx: any,
  args: {
    organizationId: string
    version: number
    settings: WidgetSettingsSnapshot
    publishedAt: number
    publishedBy?: string
    action: VersionAction
    sourceVersion?: number
  }
) => {
  await ctx.db.insert("widgetSettingsVersions", {
    organizationId: args.organizationId,
    version: args.version,
    settings: args.settings,
    publishedAt: args.publishedAt,
    publishedBy: args.publishedBy,
    action: args.action,
    sourceVersion: args.sourceVersion,
  })
}

const ensureBaselineVersionRecord = async (
  ctx: any,
  organizationId: string,
  widgetSettings: any,
  actorId?: string
) => {
  const baselineVersion = widgetSettings.publishedVersion ?? 1

  const existingBaseline = await ctx.db
    .query("widgetSettingsVersions")
    .withIndex("by_organization_id_and_version", (q: any) =>
      q.eq("organizationId", organizationId).eq("version", baselineVersion)
    )
    .unique()

  if (existingBaseline) {
    return
  }

  await insertVersionRecord(ctx, {
    organizationId,
    version: baselineVersion,
    settings: getPublishedSnapshot(widgetSettings),
    publishedAt: widgetSettings.publishedAt ?? widgetSettings._creationTime,
    publishedBy: widgetSettings.publishedBy ?? actorId,
    action: "bootstrap",
  })
}

const saveDraftForOrganization = async (
  ctx: any,
  organizationId: string,
  actorId: string | undefined,
  draftArgs: WidgetSettingsSnapshot
) => {
  const now = Date.now()
  const existingWidgetSettings = await getWidgetSettingsByOrganizationId(
    ctx,
    organizationId
  )

  if (existingWidgetSettings) {
    const publishedSnapshot = getPublishedSnapshot(existingWidgetSettings)
    const baseDraftSnapshot = existingWidgetSettings.draft
      ? getDraftSnapshot(existingWidgetSettings)
      : publishedSnapshot
    const nextDraft = normalizeSnapshot(draftArgs, baseDraftSnapshot)

    await ctx.db.patch(existingWidgetSettings._id, {
      draft: nextDraft,
      draftUpdatedAt: now,
      draftUpdatedBy: actorId,
      publishedVersion: existingWidgetSettings.publishedVersion ?? 1,
      publishedAt:
        existingWidgetSettings.publishedAt ??
        existingWidgetSettings._creationTime,
      publishedBy: existingWidgetSettings.publishedBy ?? actorId,
    })

    return
  }

  const initialPublished = createDefaultWidgetSettings()
  const nextDraft = normalizeSnapshot(draftArgs, initialPublished)

  await ctx.db.insert("widgetSettings", {
    organizationId,
    ...applyPublishedSnapshotPatch(initialPublished),
    draft: nextDraft,
    publishedVersion: 1,
    publishedAt: now,
    publishedBy: actorId,
    draftUpdatedAt: now,
    draftUpdatedBy: actorId,
  })

  await insertVersionRecord(ctx, {
    organizationId,
    version: 1,
    settings: initialPublished,
    publishedAt: now,
    publishedBy: actorId,
    action: "bootstrap",
  })
}

export const upsert = mutation({
  args: widgetSettingsArgsValidator,
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    await saveDraftForOrganization(ctx, organizationId, actorId, args)
  },
})

export const saveDraft = mutation({
  args: widgetSettingsArgsValidator,
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    await saveDraftForOrganization(ctx, organizationId, actorId, args)
  },
})

export const publishDraft = mutation({
  args: {},
  handler: async (ctx) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const existingWidgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId
    )

    if (!existingWidgetSettings) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Create and save a draft before publishing",
      })
    }

    await ensureBaselineVersionRecord(
      ctx,
      organizationId,
      existingWidgetSettings,
      actorId
    )

    const draftSnapshot = getDraftSnapshot(existingWidgetSettings)
    const now = Date.now()
    const nextVersion = (existingWidgetSettings.publishedVersion ?? 1) + 1

    await ctx.db.patch(existingWidgetSettings._id, {
      ...applyPublishedSnapshotPatch(draftSnapshot),
      draft: draftSnapshot,
      publishedVersion: nextVersion,
      publishedAt: now,
      publishedBy: actorId,
      draftUpdatedAt: now,
      draftUpdatedBy: actorId,
    })

    await insertVersionRecord(ctx, {
      organizationId,
      version: nextVersion,
      settings: draftSnapshot,
      publishedAt: now,
      publishedBy: actorId,
      action: "publish",
    })

    return { publishedVersion: nextVersion }
  },
})

export const rollbackToVersion = mutation({
  args: {
    version: v.number(),
  },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.version) || args.version <= 0) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Version must be a positive integer",
      })
    }

    const { organizationId, actorId } = await getAuthContext(ctx)
    const existingWidgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId
    )

    if (!existingWidgetSettings) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No widget settings found to rollback",
      })
    }

    await ensureBaselineVersionRecord(
      ctx,
      organizationId,
      existingWidgetSettings,
      actorId
    )

    const targetVersion = await ctx.db
      .query("widgetSettingsVersions")
      .withIndex("by_organization_id_and_version", (q: any) =>
        q.eq("organizationId", organizationId).eq("version", args.version)
      )
      .unique()

    if (!targetVersion) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Version v${args.version} does not exist`,
      })
    }

    const rollbackSnapshot = normalizeSnapshot(
      targetVersion.settings,
      getPublishedSnapshot(existingWidgetSettings)
    )
    const now = Date.now()
    const nextVersion = (existingWidgetSettings.publishedVersion ?? 1) + 1

    await ctx.db.patch(existingWidgetSettings._id, {
      ...applyPublishedSnapshotPatch(rollbackSnapshot),
      draft: rollbackSnapshot,
      publishedVersion: nextVersion,
      publishedAt: now,
      publishedBy: actorId,
      draftUpdatedAt: now,
      draftUpdatedBy: actorId,
    })

    await insertVersionRecord(ctx, {
      organizationId,
      version: nextVersion,
      settings: rollbackSnapshot,
      publishedAt: now,
      publishedBy: actorId,
      action: "rollback",
      sourceVersion: args.version,
    })

    return {
      publishedVersion: nextVersion,
      rolledBackFromVersion: args.version,
    }
  },
})

export const getOne = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    return await getWidgetSettingsByOrganizationId(ctx, organizationId)
  },
})

export const getCustomizationState = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const widgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId
    )

    if (!widgetSettings) {
      const defaults = createDefaultWidgetSettings()

      return {
        published: defaults,
        draft: defaults,
        publishedVersion: 1,
        publishedAt: undefined,
        draftUpdatedAt: undefined,
        isDraftDifferentFromPublished: false,
        versions: [] as Array<{
          version: number
          publishedAt: number
          publishedBy?: string
          action: VersionAction
          sourceVersion?: number
        }>,
      }
    }

    const published = getPublishedSnapshot(widgetSettings)
    const draft = getDraftSnapshot(widgetSettings)

    const versionDocs = await ctx.db
      .query("widgetSettingsVersions")
      .withIndex("by_organization_id", (q: any) =>
        q.eq("organizationId", organizationId)
      )
      .collect()

    const versions = versionDocs
      .sort((a: any, b: any) => b.version - a.version)
      .slice(0, 20)
      .map((versionDoc: any) => ({
        version: versionDoc.version,
        publishedAt: versionDoc.publishedAt,
        publishedBy: versionDoc.publishedBy,
        action: versionDoc.action as VersionAction,
        sourceVersion: versionDoc.sourceVersion,
      }))

    return {
      published,
      draft,
      publishedVersion: widgetSettings.publishedVersion ?? 1,
      publishedAt: widgetSettings.publishedAt ?? widgetSettings._creationTime,
      draftUpdatedAt:
        widgetSettings.draftUpdatedAt ?? widgetSettings._creationTime,
      isDraftDifferentFromPublished:
        JSON.stringify(draft) !== JSON.stringify(published),
      versions,
    }
  },
})
