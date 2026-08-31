import { requireOrganizationIdentity } from "../lib/organizationIdentity"
import { ConvexError, v } from "convex/values"
import { internalMutation, mutation, query } from "../_generated/server"
import { Id } from "../_generated/dataModel"
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constants"
import { enforceRateLimit } from "../lib/rateLimits"
import {
  DEFAULT_IMAGE_UPLOAD_POLICY,
  IMAGE_UPLOAD_POLICY_BOUNDS,
} from "../lib/chatAttachments"

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
  fontFamily: "sans" as const,
  headerBrandMode: "image" as const,
  headerBannerImageUrl: "",
  headerBannerText: "",
  headerBannerTextColor: "#ffffff",
  headerBannerAccentColor: "#ffffff",
  headerBannerFont: "sans" as const,
  headerBannerStyle: "pill" as const,
} as const

const DEFAULT_APPEARANCE = {
  launcherColor: "#000000",
  launcherLabel: "Chat with us",
  voiceLauncherLabel: "Talk with us",
  launcherIcon: "question" as const,
  launcherIconUrl: "",
  launcherPromptEnabled: true,
  launcherPromptText: "Need help? Talk with us",
  launcherPromptDelaySeconds: 5,
  animation: "scale" as const,
  poweredByText: "Osonflow",
  showPoweredBy: true,
  showHelpCenter: true,
  showChatHistoryDownload: true,
  launcherPosition: "bottom-right" as const,
  launcherOffsetX: 20,
  launcherOffsetY: 20,
  launcherSize: 48,
  autoOpenEnabled: false,
  autoOpenDelaySeconds: 8,
  autoOpenFrequency: "session" as const,
  notificationSoundEnabled: true,
  imageUploadsEnabled: DEFAULT_IMAGE_UPLOAD_POLICY.enabled,
  imageUploadMaxSizeMb: DEFAULT_IMAGE_UPLOAD_POLICY.maxSizeMb,
  imageUploadMaxPerMessage: DEFAULT_IMAGE_UPLOAD_POLICY.maxPerMessage,
  imageUploadAiVisionEnabled: DEFAULT_IMAGE_UPLOAD_POLICY.aiVisionEnabled,
}

const DEFAULT_WIDGET_COPY = {
  homeGreeting: "Hi there 👋",
  homeHeadline: "Let me know how we can help!",
  startChatLabel: "Start a chat",
  inputPlaceholder: "Type your message…",
  onlineLabel: "Online · replies instantly",
}

const MAX_WIDGET_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const DEFAULT_AGENT_ID = "default"
const FREE_AGENT_LIMIT = 1
const PRO_AGENT_LIMIT = 5

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

const voiceCallSettingsValidator = v.object({
  autoEndOnGoodbye: v.optional(v.boolean()),
  customGoodbyePhrases: v.optional(v.array(v.string())),
  idleTimeoutSeconds: v.optional(v.number()),
  maxDurationSeconds: v.optional(v.number()),
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
  fontFamily: v.optional(
    v.union(
      v.literal("sans"),
      v.literal("serif"),
      v.literal("mono"),
      v.literal("rounded")
    )
  ),
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
  voiceLauncherLabel: v.optional(v.string()),
  launcherIcon: v.optional(
    v.union(v.literal("chat"), v.literal("sparkles"), v.literal("question"))
  ),
  launcherIconUrl: v.optional(v.string()),
  launcherPromptEnabled: v.optional(v.boolean()),
  launcherPromptText: v.optional(v.string()),
  launcherPromptDelaySeconds: v.optional(v.number()),
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
  showChatHistoryDownload: v.optional(v.boolean()),
  launcherPosition: v.optional(
    v.union(v.literal("bottom-right"), v.literal("bottom-left"))
  ),
  launcherOffsetX: v.optional(v.number()),
  launcherOffsetY: v.optional(v.number()),
  launcherSize: v.optional(v.number()),
  autoOpenEnabled: v.optional(v.boolean()),
  autoOpenDelaySeconds: v.optional(v.number()),
  autoOpenFrequency: v.optional(
    v.union(v.literal("session"), v.literal("visitor"), v.literal("always"))
  ),
  notificationSoundEnabled: v.optional(v.boolean()),
  imageUploadsEnabled: v.optional(v.boolean()),
  imageUploadMaxSizeMb: v.optional(v.number()),
  imageUploadMaxPerMessage: v.optional(v.number()),
  imageUploadAiVisionEnabled: v.optional(v.boolean()),
})

const widgetCopyValidator = v.object({
  homeGreeting: v.optional(v.string()),
  homeHeadline: v.optional(v.string()),
  startChatLabel: v.optional(v.string()),
  inputPlaceholder: v.optional(v.string()),
  onlineLabel: v.optional(v.string()),
})

const widgetSettingsArgsValidator = {
  agentId: v.optional(v.string()),
  greetMessage: v.string(),
  systemPrompt: v.optional(v.string()),
  enabledToolIds: v.optional(v.array(v.id("assistantTools"))),
  defaultSuggestions: defaultSuggestionsValidator,
  helpArticles: v.optional(legacyHelpArticlesValidator),
  helpTopics: helpTopicsValidator,
  homeCards: homeCardsValidator,
  chatSettings: v.optional(chatSettingsValidator),
  openaiRealtimeSettings: v.optional(openaiRealtimeSettingsValidator),
  geminiLiveSettings: v.optional(geminiLiveSettingsValidator),
  voiceCallSettings: v.optional(voiceCallSettingsValidator),
  theme: v.optional(themeValidator),
  appearance: v.optional(appearanceValidator),
  widgetCopy: v.optional(widgetCopyValidator),
} as const

const agentScopedArgsValidator = {
  agentId: v.optional(v.string()),
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
  fontFamily?: "sans" | "serif" | "mono" | "rounded"
  headerBrandMode?: "none" | "image" | "text"
  headerBannerImageUrl?: string
  headerBannerText?: string
  headerBannerTextColor?: string
  headerBannerAccentColor?: string
  headerBannerFont?: "sans" | "serif" | "mono" | "display"
  headerBannerStyle?: "plain" | "pill" | "gradient"
}

type WidgetAppearance = {
  launcherColor?: string
  launcherLabel?: string
  voiceLauncherLabel?: string
  launcherIcon?: "chat" | "sparkles" | "question"
  launcherIconUrl?: string
  launcherPromptEnabled?: boolean
  launcherPromptText?: string
  launcherPromptDelaySeconds?: number
  animation?: "slide-up" | "scale" | "fade" | "pop"
  poweredByText?: string
  showPoweredBy?: boolean
  showHelpCenter?: boolean
  showChatHistoryDownload?: boolean
  launcherPosition?: "bottom-right" | "bottom-left"
  launcherOffsetX?: number
  launcherOffsetY?: number
  launcherSize?: number
  autoOpenEnabled?: boolean
  autoOpenDelaySeconds?: number
  autoOpenFrequency?: "session" | "visitor" | "always"
  notificationSoundEnabled?: boolean
  imageUploadsEnabled?: boolean
  imageUploadMaxSizeMb?: number
  imageUploadMaxPerMessage?: number
  imageUploadAiVisionEnabled?: boolean
}

type WidgetCopy = {
  homeGreeting?: string
  homeHeadline?: string
  startChatLabel?: string
  inputPlaceholder?: string
  onlineLabel?: string
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
  enabledToolIds?: Id<"assistantTools">[]
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
  voiceCallSettings?: {
    autoEndOnGoodbye?: boolean
    customGoodbyePhrases?: string[]
    idleTimeoutSeconds?: number
    maxDurationSeconds?: number
  }
  theme?: WidgetTheme
  appearance?: WidgetAppearance
  widgetCopy?: WidgetCopy
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
  voiceCallSettings: {
    autoEndOnGoodbye: true,
    customGoodbyePhrases: [],
    idleTimeoutSeconds: 120,
    maxDurationSeconds: 600,
  },
  theme: { ...DEFAULT_THEME },
  appearance: { ...DEFAULT_APPEARANCE },
  widgetCopy: { ...DEFAULT_WIDGET_COPY },
})

const clampBorderRadius = (value?: number) => {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : DEFAULT_THEME.borderRadius

  return Math.min(32, Math.max(0, parsed))
}

const clampNumber = (
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
) => {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback

  return Math.min(max, Math.max(min, parsed))
}

const clampLauncherOffset = (value?: number) =>
  clampNumber(value, 0, 160, DEFAULT_APPEARANCE.launcherOffsetX)

const clampLauncherSize = (value?: number) =>
  clampNumber(value, 40, 76, DEFAULT_APPEARANCE.launcherSize)

const clampAutoOpenDelaySeconds = (value?: number) =>
  clampNumber(value, 0, 300, DEFAULT_APPEARANCE.autoOpenDelaySeconds)

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
  fontFamily:
    incoming?.fontFamily ?? base?.fontFamily ?? DEFAULT_THEME.fontFamily,
  headerBrandMode:
    incoming?.headerBrandMode ??
    base?.headerBrandMode ??
    DEFAULT_THEME.headerBrandMode,
  headerBannerImageUrl:
    incoming?.headerBannerImageUrl ??
    base?.headerBannerImageUrl ??
    DEFAULT_THEME.headerBannerImageUrl,
  headerBannerText:
    incoming?.headerBannerText ??
    base?.headerBannerText ??
    DEFAULT_THEME.headerBannerText,
  headerBannerTextColor:
    incoming?.headerBannerTextColor ??
    base?.headerBannerTextColor ??
    DEFAULT_THEME.headerBannerTextColor,
  headerBannerAccentColor:
    incoming?.headerBannerAccentColor ??
    base?.headerBannerAccentColor ??
    DEFAULT_THEME.headerBannerAccentColor,
  headerBannerFont:
    incoming?.headerBannerFont ??
    base?.headerBannerFont ??
    DEFAULT_THEME.headerBannerFont,
  headerBannerStyle:
    incoming?.headerBannerStyle ??
    base?.headerBannerStyle ??
    DEFAULT_THEME.headerBannerStyle,
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
  voiceLauncherLabel:
    incoming?.voiceLauncherLabel ??
    base?.voiceLauncherLabel ??
    DEFAULT_APPEARANCE.voiceLauncherLabel,
  launcherIcon:
    incoming?.launcherIcon ??
    base?.launcherIcon ??
    DEFAULT_APPEARANCE.launcherIcon,
  launcherIconUrl:
    incoming?.launcherIconUrl ??
    base?.launcherIconUrl ??
    DEFAULT_APPEARANCE.launcherIconUrl,
  launcherPromptEnabled:
    incoming?.launcherPromptEnabled ??
    base?.launcherPromptEnabled ??
    DEFAULT_APPEARANCE.launcherPromptEnabled,
  launcherPromptText:
    incoming?.launcherPromptText ??
    base?.launcherPromptText ??
    DEFAULT_APPEARANCE.launcherPromptText,
  launcherPromptDelaySeconds:
    incoming?.launcherPromptDelaySeconds ??
    base?.launcherPromptDelaySeconds ??
    DEFAULT_APPEARANCE.launcherPromptDelaySeconds,
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
  showChatHistoryDownload:
    incoming?.showChatHistoryDownload ??
    base?.showChatHistoryDownload ??
    DEFAULT_APPEARANCE.showChatHistoryDownload,
  launcherPosition:
    incoming?.launcherPosition ??
    base?.launcherPosition ??
    DEFAULT_APPEARANCE.launcherPosition,
  launcherOffsetX: clampLauncherOffset(
    incoming?.launcherOffsetX ?? base?.launcherOffsetX
  ),
  launcherOffsetY: clampLauncherOffset(
    incoming?.launcherOffsetY ?? base?.launcherOffsetY
  ),
  launcherSize: clampLauncherSize(incoming?.launcherSize ?? base?.launcherSize),
  autoOpenEnabled:
    incoming?.autoOpenEnabled ??
    base?.autoOpenEnabled ??
    DEFAULT_APPEARANCE.autoOpenEnabled,
  autoOpenDelaySeconds: clampAutoOpenDelaySeconds(
    incoming?.autoOpenDelaySeconds ?? base?.autoOpenDelaySeconds
  ),
  autoOpenFrequency:
    incoming?.autoOpenFrequency ??
    base?.autoOpenFrequency ??
    DEFAULT_APPEARANCE.autoOpenFrequency,
  notificationSoundEnabled:
    incoming?.notificationSoundEnabled ??
    base?.notificationSoundEnabled ??
    DEFAULT_APPEARANCE.notificationSoundEnabled,
  imageUploadsEnabled:
    incoming?.imageUploadsEnabled ??
    base?.imageUploadsEnabled ??
    DEFAULT_APPEARANCE.imageUploadsEnabled,
  // Clamped here as well as at upload time: a draft is not allowed to describe
  // a limit the server would refuse to honour.
  imageUploadMaxSizeMb: clampNumber(
    incoming?.imageUploadMaxSizeMb ?? base?.imageUploadMaxSizeMb,
    IMAGE_UPLOAD_POLICY_BOUNDS.minSizeMb,
    IMAGE_UPLOAD_POLICY_BOUNDS.maxSizeMb,
    DEFAULT_APPEARANCE.imageUploadMaxSizeMb
  ),
  imageUploadMaxPerMessage: clampNumber(
    incoming?.imageUploadMaxPerMessage ?? base?.imageUploadMaxPerMessage,
    IMAGE_UPLOAD_POLICY_BOUNDS.minPerMessage,
    IMAGE_UPLOAD_POLICY_BOUNDS.maxPerMessage,
    DEFAULT_APPEARANCE.imageUploadMaxPerMessage
  ),
  imageUploadAiVisionEnabled:
    incoming?.imageUploadAiVisionEnabled ??
    base?.imageUploadAiVisionEnabled ??
    DEFAULT_APPEARANCE.imageUploadAiVisionEnabled,
})

const mergeWidgetCopy = (
  base?: WidgetCopy,
  incoming?: WidgetCopy
): WidgetCopy => ({
  homeGreeting:
    incoming?.homeGreeting ??
    base?.homeGreeting ??
    DEFAULT_WIDGET_COPY.homeGreeting,
  homeHeadline:
    incoming?.homeHeadline ??
    base?.homeHeadline ??
    DEFAULT_WIDGET_COPY.homeHeadline,
  startChatLabel:
    incoming?.startChatLabel ??
    base?.startChatLabel ??
    DEFAULT_WIDGET_COPY.startChatLabel,
  inputPlaceholder:
    incoming?.inputPlaceholder ??
    base?.inputPlaceholder ??
    DEFAULT_WIDGET_COPY.inputPlaceholder,
  onlineLabel:
    incoming?.onlineLabel ??
    base?.onlineLabel ??
    DEFAULT_WIDGET_COPY.onlineLabel,
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
    enabledToolIds: snapshot.enabledToolIds ?? fallback.enabledToolIds,
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
    voiceCallSettings: {
      autoEndOnGoodbye:
        snapshot.voiceCallSettings?.autoEndOnGoodbye ??
        fallback.voiceCallSettings?.autoEndOnGoodbye ??
        true,
      customGoodbyePhrases:
        snapshot.voiceCallSettings?.customGoodbyePhrases ??
        fallback.voiceCallSettings?.customGoodbyePhrases ??
        [],
      idleTimeoutSeconds:
        snapshot.voiceCallSettings?.idleTimeoutSeconds ??
        fallback.voiceCallSettings?.idleTimeoutSeconds ??
        120,
      maxDurationSeconds:
        snapshot.voiceCallSettings?.maxDurationSeconds ??
        fallback.voiceCallSettings?.maxDurationSeconds ??
        600,
    },
    theme: mergeTheme(fallback.theme, snapshot.theme),
    appearance: mergeAppearance(fallback.appearance, snapshot.appearance),
    widgetCopy: mergeWidgetCopy(fallback.widgetCopy, snapshot.widgetCopy),
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
      enabledToolIds: widgetSettings.enabledToolIds ?? fallback.enabledToolIds,
      defaultSuggestions:
        widgetSettings.defaultSuggestions ?? fallback.defaultSuggestions,
      helpArticles: widgetSettings.helpArticles ?? fallback.helpArticles,
      helpTopics: widgetSettings.helpTopics ?? fallback.helpTopics,
      homeCards: widgetSettings.homeCards ?? fallback.homeCards,
      chatSettings: widgetSettings.chatSettings ?? fallback.chatSettings,
      openaiRealtimeSettings:
        widgetSettings.openaiRealtimeSettings ??
        fallback.openaiRealtimeSettings,
      geminiLiveSettings:
        widgetSettings.geminiLiveSettings ?? fallback.geminiLiveSettings,
      voiceCallSettings:
        widgetSettings.voiceCallSettings ?? fallback.voiceCallSettings,
      theme: widgetSettings.theme,
      appearance: widgetSettings.appearance,
      widgetCopy: widgetSettings.widgetCopy,
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

const getAuthContext = async (
  ctx: Parameters<typeof requireOrganizationIdentity>[0]
) => {
  const { identity, orgId } = await requireOrganizationIdentity(ctx)

  return {
    organizationId: orgId,
    actorId: identity.subject,
  }
}

const getWidgetSettingsByOrganizationId = async (
  ctx: any,
  organizationId: string,
  agentId = DEFAULT_AGENT_ID
) => {
  const byAgentId = await ctx.db
    .query("widgetSettings")
    .withIndex("by_organization_id_and_agent_id", (q: any) =>
      q.eq("organizationId", organizationId).eq("agentId", agentId)
    )
    .unique()

  if (byAgentId) {
    return byAgentId
  }

  if (agentId !== DEFAULT_AGENT_ID) {
    return null
  }

  const organizationSettings = await ctx.db
    .query("widgetSettings")
    .withIndex("by_organization_id", (q: any) =>
      q.eq("organizationId", organizationId)
    )
    .collect()

  return (
    organizationSettings.find((settings: any) => settings.isDefault) ??
    organizationSettings.find((settings: any) => !settings.agentId) ??
    organizationSettings[0] ??
    null
  )
}

const listWidgetSettingsForOrganization = async (
  ctx: any,
  organizationId: string
) => {
  return await ctx.db
    .query("widgetSettings")
    .withIndex("by_organization_id", (q: any) =>
      q.eq("organizationId", organizationId)
    )
    .collect()
}

const getAgentLimitForOrganization = async (
  ctx: any,
  organizationId: string
) => {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_organization_id", (q: any) =>
      q.eq("organizationId", organizationId)
    )
    .unique()

  const isPro =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    subscription?.status === "past_due"

  return isPro ? PRO_AGENT_LIMIT : FREE_AGENT_LIMIT
}

const normalizeAgentId = (agentId?: string) =>
  agentId?.trim() || DEFAULT_AGENT_ID

const createAgentId = () =>
  `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const applyPublishedSnapshotPatch = (snapshot: WidgetSettingsSnapshot) => ({
  greetMessage: snapshot.greetMessage,
  systemPrompt: snapshot.systemPrompt,
  enabledToolIds: snapshot.enabledToolIds,
  defaultSuggestions: snapshot.defaultSuggestions,
  helpArticles: snapshot.helpArticles,
  helpTopics: snapshot.helpTopics,
  homeCards: snapshot.homeCards,
  chatSettings: snapshot.chatSettings,
  openaiRealtimeSettings: snapshot.openaiRealtimeSettings,
  geminiLiveSettings: snapshot.geminiLiveSettings,
  voiceCallSettings: snapshot.voiceCallSettings,
  theme: snapshot.theme,
  appearance: snapshot.appearance,
  widgetCopy: snapshot.widgetCopy,
})

const insertVersionRecord = async (
  ctx: any,
  args: {
    organizationId: string
    agentId: string
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
    agentId: args.agentId,
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
  agentId: string,
  widgetSettings: any,
  actorId?: string
) => {
  const baselineVersion = widgetSettings.publishedVersion ?? 1

  const existingBaseline = await ctx.db
    .query("widgetSettingsVersions")
    .withIndex("by_organization_id_and_agent_id", (q: any) =>
      q.eq("organizationId", organizationId).eq("agentId", agentId)
    )
    .collect()
    .then((versions: any[]) =>
      versions.find((version) => version.version === baselineVersion)
    )

  if (existingBaseline) {
    return
  }

  await insertVersionRecord(ctx, {
    organizationId,
    agentId,
    version: baselineVersion,
    settings: getPublishedSnapshot(widgetSettings),
    publishedAt: widgetSettings.publishedAt ?? widgetSettings._creationTime,
    publishedBy: widgetSettings.publishedBy ?? actorId,
    action: "bootstrap",
  })
}

// Tool ids arrive from the client, so a caller could otherwise point their
// widget at another organization's tools.
const assertToolsBelongToOrganization = async (
  ctx: any,
  organizationId: string,
  enabledToolIds: Id<"assistantTools">[] | undefined
) => {
  if (!enabledToolIds?.length) {
    return
  }

  for (const toolId of new Set(enabledToolIds)) {
    const tool = await ctx.db.get(toolId)

    if (!tool || tool.organizationId !== organizationId) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "One of the selected tools is not available.",
      })
    }
  }
}

const saveDraftForOrganization = async (
  ctx: any,
  organizationId: string,
  agentId: string,
  actorId: string | undefined,
  draftArgs: WidgetSettingsSnapshot
) => {
  await assertToolsBelongToOrganization(
    ctx,
    organizationId,
    draftArgs.enabledToolIds
  )

  const now = Date.now()
  const existingWidgetSettings = await getWidgetSettingsByOrganizationId(
    ctx,
    organizationId,
    agentId
  )

  if (existingWidgetSettings) {
    const publishedSnapshot = getPublishedSnapshot(existingWidgetSettings)
    const baseDraftSnapshot = existingWidgetSettings.draft
      ? getDraftSnapshot(existingWidgetSettings)
      : publishedSnapshot
    const nextDraft = normalizeSnapshot(draftArgs, baseDraftSnapshot)

    await ctx.db.patch(existingWidgetSettings._id, {
      agentId,
      isDefault:
        existingWidgetSettings.isDefault ?? agentId === DEFAULT_AGENT_ID,
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
    agentId,
    name: agentId === DEFAULT_AGENT_ID ? "Default agent" : "New agent",
    isDefault: agentId === DEFAULT_AGENT_ID,
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
    agentId,
    version: 1,
    settings: initialPublished,
    publishedAt: now,
    publishedBy: actorId,
    action: "bootstrap",
  })
}

/**
 * Entry point for AI setup.
 *
 * Deliberately writes the draft and nothing else: a generated setup is a
 * proposal, and the owner still reviews and publishes it through the designer
 * like any other change. Shares saveDraftForOrganization with the hand-edited
 * path so draft merging, bootstrapping and version records stay identical.
 */
export const applyGeneratedDraft = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    ...widgetSettingsArgsValidator,
  },
  handler: async (ctx, args) => {
    const { organizationId, actorId, ...draftArgs } = args
    const agentId = normalizeAgentId(draftArgs.agentId)

    await saveDraftForOrganization(
      ctx,
      organizationId,
      agentId,
      actorId,
      draftArgs
    )
  },
})

export const saveDraft = mutation({
  args: widgetSettingsArgsValidator,
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const agentId = normalizeAgentId(args.agentId)
    await saveDraftForOrganization(ctx, organizationId, agentId, actorId, args)
  },
})

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { actorId } = await getAuthContext(ctx)
    await enforceRateLimit(ctx, "widgetImageUploadByUser", {
      key: actorId ?? "unknown",
      message: "Too many image uploads. Please wait a moment and try again.",
    })
    return await ctx.storage.generateUploadUrl()
  },
})

export const getUploadedImageUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)

    const metadata = await ctx.db.system.get(args.storageId)

    if (!metadata) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Uploaded image not found",
      })
    }

    // Storage ids are not tenant-scoped, so ownership is tracked separately.
    // Every other `ctx.storage.store` call claims its blob, which means an
    // unclaimed blob can only be one this organization just uploaded.
    const existingOwner = await ctx.db
      .query("storageObjects")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()

    if (existingOwner && existingOwner.organizationId !== organizationId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Uploaded image not found",
      })
    }

    if (existingOwner && existingOwner.purpose !== "widget_image") {
      // Owned by this organization but serving another purpose (a knowledge
      // base file, say). Refuse without deleting, or this endpoint doubles as
      // a way to destroy the organization's own documents.
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "That file is not a widget image.",
      })
    }

    const rejectUpload = async (message: string) => {
      await ctx.storage.delete(args.storageId)

      if (existingOwner) {
        await ctx.db.delete(existingOwner._id)
      }

      throw new ConvexError({ code: "INVALID_INPUT", message })
    }

    if (!metadata.contentType?.startsWith("image/")) {
      await rejectUpload("Please select an image file.")
    }

    if (metadata.size > MAX_WIDGET_IMAGE_SIZE_BYTES) {
      await rejectUpload("Image must be 5MB or smaller.")
    }

    const url = await ctx.storage.getUrl(args.storageId)

    if (!url) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Uploaded image URL is not available",
      })
    }

    if (!existingOwner) {
      await ctx.db.insert("storageObjects", {
        storageId: args.storageId,
        organizationId,
        uploadedBy: actorId,
        purpose: "widget_image",
        createdAt: Date.now(),
      })
    }

    return { url }
  },
})

export const publishDraft = mutation({
  args: agentScopedArgsValidator,
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const agentId = normalizeAgentId(args.agentId)
    const existingWidgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId,
      agentId
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
      agentId,
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
      agentId,
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
    agentId: v.optional(v.string()),
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
    const agentId = normalizeAgentId(args.agentId)
    const existingWidgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId,
      agentId
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
      agentId,
      existingWidgetSettings,
      actorId
    )

    const targetVersion = await ctx.db
      .query("widgetSettingsVersions")
      .withIndex("by_organization_id_and_agent_id", (q: any) =>
        q.eq("organizationId", organizationId).eq("agentId", agentId)
      )
      .collect()
      .then((versions: any[]) =>
        versions.find((version) => version.version === args.version)
      )

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
      agentId,
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

export const listAgents = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const settingsRows = await listWidgetSettingsForOrganization(
      ctx,
      organizationId
    )
    const limit = await getAgentLimitForOrganization(ctx, organizationId)

    const agents = settingsRows
      .map((settings: any) => {
        const agentId = settings.agentId ?? DEFAULT_AGENT_ID
        return {
          agentId,
          name:
            settings.name ??
            settings.theme?.assistantName ??
            (agentId === DEFAULT_AGENT_ID ? "Default agent" : "New agent"),
          isDefault: settings.isDefault ?? agentId === DEFAULT_AGENT_ID,
          publishedVersion: settings.publishedVersion ?? 1,
          updatedAt:
            settings.draftUpdatedAt ??
            settings.publishedAt ??
            settings._creationTime,
        }
      })
      .sort((a: any, b: any) => {
        if (a.isDefault) return -1
        if (b.isDefault) return 1
        return b.updatedAt - a.updatedAt
      })

    const effectiveAgentCount = Math.max(agents.length, 1)

    return {
      agents: agents.length
        ? agents
        : [
            {
              agentId: DEFAULT_AGENT_ID,
              name: "Default agent",
              isDefault: true,
              publishedVersion: 1,
              updatedAt: undefined,
            },
          ],
      limit,
      canCreateAgent: effectiveAgentCount < limit,
    }
  },
})

export const createAgent = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const existingAgents = await listWidgetSettingsForOrganization(
      ctx,
      organizationId
    )
    const limit = await getAgentLimitForOrganization(ctx, organizationId)

    const effectiveAgentCount = Math.max(existingAgents.length, 1)

    if (effectiveAgentCount >= limit) {
      throw new ConvexError({
        code: "LIMIT_REACHED",
        message:
          limit === FREE_AGENT_LIMIT
            ? "Upgrade to Pro to create more agents."
            : `You can create up to ${limit} agents on this plan.`,
      })
    }

    const agentId = createAgentId()
    const now = Date.now()
    const initialPublished = createDefaultWidgetSettings()
    const name = args.name?.trim() || `Agent ${effectiveAgentCount + 1}`

    await ctx.db.insert("widgetSettings", {
      organizationId,
      agentId,
      name,
      isDefault: false,
      ...applyPublishedSnapshotPatch({
        ...initialPublished,
        theme: {
          ...initialPublished.theme,
          assistantName: name,
        },
      }),
      draft: {
        ...initialPublished,
        theme: {
          ...initialPublished.theme,
          assistantName: name,
        },
      },
      publishedVersion: 1,
      publishedAt: now,
      publishedBy: actorId,
      draftUpdatedAt: now,
      draftUpdatedBy: actorId,
    })

    await insertVersionRecord(ctx, {
      organizationId,
      agentId,
      version: 1,
      settings: initialPublished,
      publishedAt: now,
      publishedBy: actorId,
      action: "bootstrap",
    })

    return { agentId }
  },
})

export const renameAgent = mutation({
  args: {
    agentId: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx)
    const agentId = normalizeAgentId(args.agentId)
    const name = args.name.trim()

    if (!name) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Agent name is required.",
      })
    }

    const widgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId,
      agentId
    )

    if (!widgetSettings) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agent not found.",
      })
    }

    await ctx.db.patch(widgetSettings._id, { agentId, name })
  },
})

export const getCustomizationState = query({
  args: agentScopedArgsValidator,
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx)
    const agentId = normalizeAgentId(args.agentId)
    const widgetSettings = await getWidgetSettingsByOrganizationId(
      ctx,
      organizationId,
      agentId
    )

    if (!widgetSettings) {
      const defaults = createDefaultWidgetSettings()

      return {
        published: defaults,
        draft: defaults,
        agentId,
        agentName: agentId === DEFAULT_AGENT_ID ? "Default agent" : "New agent",
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
      .withIndex("by_organization_id_and_agent_id", (q: any) =>
        q.eq("organizationId", organizationId).eq("agentId", agentId)
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
      agentId,
      agentName: widgetSettings.name ?? "Default agent",
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
