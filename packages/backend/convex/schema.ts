import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

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

const legacyHelpTopicValidator = v.object({
  title: v.string(),
  excerpt: v.string(),
  articles: legacyHelpArticlesValidator,
})

const legacyHelpTopicsValidator = v.object({
  topic1: legacyHelpTopicValidator,
  topic2: legacyHelpTopicValidator,
  topic3: legacyHelpTopicValidator,
})

const helpTopicsValidator = v.array(helpTopicValidator)

const storedHelpTopicsValidator = v.union(
  helpTopicsValidator,
  legacyHelpTopicsValidator
)

const homeCardValidator = v.object({
  type: v.union(v.literal("topic"), v.literal("article")),
  topicIndex: v.number(),
  articleIndex: v.optional(v.number()),
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

const aiVoiceConversationProviderValidator = v.union(
  v.literal("openai_realtime"),
  v.literal("gemini_live"),
  v.literal("vapi")
)

const aiVoiceConversationRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant")
)

const supportChannelValidator = v.union(v.literal("chat"), v.literal("voice"))

const supportSentimentValidator = v.union(
  v.literal("positive"),
  v.literal("neutral"),
  v.literal("negative")
)

const supportUrgencyValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
)

const resolutionSourceValidator = v.union(
  v.literal("ai"),
  v.literal("human"),
  v.literal("voice_ai"),
  // v.literal("workflow") // Workflows disabled
  v.literal("workflow")
)

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
})

const widgetSettingsSnapshotValidator = v.object({
  greetMessage: v.string(),
  systemPrompt: v.optional(v.string()),
  chatSettings: v.optional(chatSettingsValidator),
  defaultSuggestions: defaultSuggestionsValidator,
  helpArticles: v.optional(legacyHelpArticlesValidator),
  helpTopics: v.optional(storedHelpTopicsValidator),
  homeCards: v.optional(homeCardsValidator),
  vapiSettings: vapiSettingsValidator,
  openaiRealtimeSettings: v.optional(openaiRealtimeSettingsValidator),
  geminiLiveSettings: v.optional(geminiLiveSettingsValidator),
  theme: v.optional(themeValidator),
  appearance: v.optional(appearanceValidator),
})

const webhookEventTypeValidator = v.union(
  v.literal("contact_session.created"),
  v.literal("conversation.created"),
  v.literal("conversation.status_changed"),
  v.literal("message.received"),
  v.literal("message.sent")
)

const webhookProviderValidator = v.union(
  v.literal("webhook"),
  v.literal("discord"),
  // Keep reading legacy Slack rows until the stored data is migrated.
  v.literal("slack"),
  v.literal("telegram"),
  v.literal("whatsapp")
)

const webhookProviderConfigValidator = v.object({
  telegramBotToken: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  whatsappAccessToken: v.optional(v.string()),
  whatsappPhoneNumberId: v.optional(v.string()),
  whatsappRecipientPhone: v.optional(v.string()),
})

// Workflows disabled — not developing this feature for now
// const workflowDefinitionValidator = v.object({
//   schemaVersion: v.number(),
//   id: v.optional(v.string()),
//   name: v.string(),
//   description: v.optional(v.string()),
//   nodes: v.array(v.any()),
//   edges: v.array(v.any()),
// })

// const workflowButtonOptionValidator = v.object({
//   id: v.string(),
//   label: v.string(),
// })

export default defineSchema({
  subscriptions: defineTable({
    organizationId: v.string(),
    status: v.string(),
    provider: v.optional(v.union(v.literal("clerk"), v.literal("polar"))),
    polarCustomerId: v.optional(v.string()),
    polarProductId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_organization_id", ["organizationId"]),
  widgetSettings: defineTable({
    organizationId: v.string(),
    greetMessage: v.string(),
    systemPrompt: v.optional(v.string()),
    chatSettings: v.optional(chatSettingsValidator),
    defaultSuggestions: defaultSuggestionsValidator,
    helpArticles: v.optional(legacyHelpArticlesValidator),
    helpTopics: v.optional(storedHelpTopicsValidator),
    homeCards: v.optional(homeCardsValidator),
    vapiSettings: vapiSettingsValidator,
    openaiRealtimeSettings: v.optional(openaiRealtimeSettingsValidator),
    geminiLiveSettings: v.optional(geminiLiveSettingsValidator),
    theme: v.optional(themeValidator),
    appearance: v.optional(appearanceValidator),
    draft: v.optional(widgetSettingsSnapshotValidator),
    publishedVersion: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    publishedBy: v.optional(v.string()),
    draftUpdatedAt: v.optional(v.number()),
    draftUpdatedBy: v.optional(v.string()),
  }).index("by_organization_id", ["organizationId"]),
  widgetSettingsVersions: defineTable({
    organizationId: v.string(),
    version: v.number(),
    settings: widgetSettingsSnapshotValidator,
    publishedAt: v.number(),
    publishedBy: v.optional(v.string()),
    action: v.union(
      v.literal("publish"),
      v.literal("rollback"),
      v.literal("bootstrap")
    ),
    sourceVersion: v.optional(v.number()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_version", ["organizationId", "version"]),
  plugins: defineTable({
    organizationId: v.string(),
    service: v.union(
      v.literal("vapi"),
      v.literal("openai_realtime"),
      v.literal("gemini_live")
    ),
    secretName: v.string(),
    secretValue: v.optional(v.string()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_service", ["organizationId", "service"]),
  integrationWebhooks: defineTable({
    organizationId: v.string(),
    url: v.string(),
    description: v.optional(v.string()),
    provider: v.optional(webhookProviderValidator),
    providerConfig: v.optional(webhookProviderConfigValidator),
    signingSecret: v.string(),
    isEnabled: v.boolean(),
    eventTypes: v.array(webhookEventTypeValidator),
    createdBy: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_enabled", ["organizationId", "isEnabled"]),
  webhookDeliveries: defineTable({
    organizationId: v.string(),
    webhookId: v.id("integrationWebhooks"),
    eventId: v.string(),
    eventType: webhookEventTypeValidator,
    targetUrl: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    attempt: v.number(),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    error: v.optional(v.string()),
    payload: v.optional(v.any()),
    durationMs: v.optional(v.number()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_webhook_id", ["webhookId"]),
  telegramIntegrations: defineTable({
    organizationId: v.string(),
    botToken: v.string(),
    botId: v.number(),
    botUsername: v.optional(v.string()),
    botFirstName: v.optional(v.string()),
    webhookSecret: v.string(),
    webhookUrl: v.optional(v.string()),
    isEnabled: v.boolean(),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_webhook_url"),
      v.literal("error")
    ),
    setupError: v.optional(v.string()),
    lastWebhookAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_webhook_secret", ["webhookSecret"]),
  telegramContacts: defineTable({
    organizationId: v.string(),
    integrationId: v.id("telegramIntegrations"),
    chatId: v.string(),
    userId: v.optional(v.string()),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    contactSessionId: v.id("contactSessions"),
    activeConversationId: v.optional(v.id("conversations")),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_integration_id_and_chat_id", ["integrationId", "chatId"])
    .index("by_contact_session_id", ["contactSessionId"]),
  instagramIntegrations: defineTable({
    organizationId: v.string(),
    accessToken: v.string(),
    instagramUserId: v.string(),
    username: v.optional(v.string()),
    webhookSecret: v.string(),
    verifyToken: v.string(),
    webhookUrl: v.optional(v.string()),
    isEnabled: v.boolean(),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_webhook_url"),
      v.literal("error")
    ),
    setupError: v.optional(v.string()),
    lastWebhookAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_webhook_secret", ["webhookSecret"])
    .index("by_instagram_user_id", ["instagramUserId"]),
  instagramOAuthStates: defineTable({
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    state: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_organization_id", ["organizationId"]),
  instagramContacts: defineTable({
    organizationId: v.string(),
    integrationId: v.id("instagramIntegrations"),
    senderId: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    profilePicUrl: v.optional(v.string()),
    followerCount: v.optional(v.number()),
    contactSessionId: v.id("contactSessions"),
    activeConversationId: v.optional(v.id("conversations")),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_integration_id_and_sender_id", ["integrationId", "senderId"])
    .index("by_contact_session_id", ["contactSessionId"]),
  whatsappIntegrations: defineTable({
    organizationId: v.string(),
    accessToken: v.string(),
    phoneNumberId: v.string(),
    businessAccountId: v.optional(v.string()),
    displayPhoneNumber: v.optional(v.string()),
    verifiedName: v.optional(v.string()),
    webhookSecret: v.string(),
    verifyToken: v.string(),
    webhookUrl: v.optional(v.string()),
    isEnabled: v.boolean(),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_webhook_url"),
      v.literal("error")
    ),
    setupError: v.optional(v.string()),
    lastWebhookAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_webhook_secret", ["webhookSecret"])
    .index("by_phone_number_id", ["phoneNumberId"]),
  whatsappContacts: defineTable({
    organizationId: v.string(),
    integrationId: v.id("whatsappIntegrations"),
    waId: v.string(),
    profileName: v.optional(v.string()),
    contactSessionId: v.id("contactSessions"),
    activeConversationId: v.optional(v.id("conversations")),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_integration_id_and_wa_id", ["integrationId", "waId"])
    .index("by_contact_session_id", ["contactSessionId"]),
  conversations: defineTable({
    threadId: v.string(),
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    status: v.union(
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
    isArchived: v.optional(v.boolean()),
    assignedToId: v.optional(v.union(v.string(), v.null())),
    assignedToName: v.optional(v.union(v.string(), v.null())),
    assignedAt: v.optional(v.union(v.number(), v.null())),
    contactLastReadAt: v.optional(v.number()),
    operatorLastReadAt: v.optional(v.number()),
    lastCustomerMessageAt: v.optional(v.union(v.number(), v.null())),
    lastOperatorMessageAt: v.optional(v.union(v.number(), v.null())),
    unreadForContactCount: v.optional(v.number()),
    unreadForOperatorCount: v.optional(v.number()),
    firstCustomerMessageAt: v.optional(v.union(v.number(), v.null())),
    firstHumanResponseAt: v.optional(v.union(v.number(), v.null())),
    escalatedAt: v.optional(v.union(v.number(), v.null())),
    resolvedAt: v.optional(v.union(v.number(), v.null())),
    resolutionSource: v.optional(v.union(resolutionSourceValidator, v.null())),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_thread_id", ["threadId"])
    .index("by_status_and_organization_id", ["status", "organizationId"])
    .index("by_organization_id_and_assigned_to", [
      "organizationId",
      "assignedToId",
    ])
    .index("by_status_and_organization_id_and_assigned_to", [
      "status",
      "organizationId",
      "assignedToId",
    ]),

  aiReplyCache: defineTable({
    organizationId: v.string(),
    cacheKey: v.string(),
    systemPromptKey: v.string(),
    model: v.string(),
    sourcePrompt: v.string(),
    answer: v.string(),
    sourceThreadId: v.optional(v.string()),
    semanticEntryId: v.optional(v.string()),
    semanticIndexedAt: v.optional(v.number()),
    hitCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_organization_id_and_cache_key", ["organizationId", "cacheKey"])
    .index("by_organization_id_and_last_used_at", [
      "organizationId",
      "lastUsedAt",
    ]),

  savedReplies: defineTable({
    organizationId: v.string(),
    title: v.string(),
    body: v.string(),
    category: v.optional(v.string()),
    usageCount: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_usage_count", [
      "organizationId",
      "usageCount",
    ]),

  // Workflows disabled — not developing this feature for now
  // workflows: defineTable({
  //   organizationId: v.string(),
  //   name: v.string(),
  //   description: v.optional(v.string()),
  //   definition: workflowDefinitionValidator,
  //   publishedDefinition: v.optional(workflowDefinitionValidator),
  //   isActive: v.optional(v.boolean()),
  //   publishedAt: v.optional(v.number()),
  //   publishedBy: v.optional(v.string()),
  //   createdAt: v.number(),
  //   updatedAt: v.number(),
  //   createdBy: v.optional(v.string()),
  //   updatedBy: v.optional(v.string()),
  // })
  //   .index("by_organization_id", ["organizationId"])
  //   .index("by_organization_id_and_active", ["organizationId", "isActive"])
  //   .index("by_organization_id_and_updated_at", [
  //     "organizationId",
  //     "updatedAt",
  //   ]),

  // workflowSessions: defineTable({
  //   organizationId: v.string(),
  //   workflowId: v.id("workflows"),
  //   conversationId: v.id("conversations"),
  //   contactSessionId: v.id("contactSessions"),
  //   status: v.union(
  //     v.literal("active"),
  //     v.literal("waiting"),
  //     v.literal("ended")
  //   ),
  //   currentNodeId: v.optional(v.union(v.string(), v.null())),
  //   pendingNodeId: v.optional(v.union(v.string(), v.null())),
  //   pendingButtons: v.optional(v.array(workflowButtonOptionValidator)),
  //   variables: v.any(),
  //   startedAt: v.number(),
  //   updatedAt: v.number(),
  //   endedAt: v.optional(v.number()),
  // })
  //   .index("by_conversation_id", ["conversationId"])
  //   .index("by_contact_session_id", ["contactSessionId"])
  //   .index("by_organization_id", ["organizationId"]),

  // workflowPresence: defineTable({
  //   organizationId: v.string(),
  //   workflowId: v.id("workflows"),
  //   userId: v.string(),
  //   name: v.string(),
  //   initials: v.string(),
  //   imageUrl: v.optional(v.string()),
  //   color: v.string(),
  //   cursorX: v.optional(v.number()),
  //   cursorY: v.optional(v.number()),
  //   selectedNodeId: v.optional(v.string()),
  //   lastSeenAt: v.number(),
  // })
  //   .index("by_workflow_id", ["workflowId"])
  //   .index("by_workflow_id_and_user_id", ["workflowId", "userId"]),

  contactSessions: defineTable({
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    expiresAt: v.number(),
    isAnonymous: v.optional(v.boolean()),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        language: v.optional(v.string()),
        languages: v.optional(v.string()),
        platform: v.optional(v.string()),
        vendor: v.optional(v.string()),
        telegramUserId: v.optional(v.string()),
        telegramUsername: v.optional(v.string()),
        telegramLanguageCode: v.optional(v.string()),
        instagramUserId: v.optional(v.string()),
        instagramUsername: v.optional(v.string()),
        instagramFullName: v.optional(v.string()),
        instagramProfilePic: v.optional(v.string()),
        instagramFollowerCount: v.optional(v.number()),
        instagramAccountId: v.optional(v.string()),
        whatsappPhoneNumber: v.optional(v.string()),
        whatsappProfileName: v.optional(v.string()),
        whatsappPhoneNumberId: v.optional(v.string()),
        whatsappBusinessAccountId: v.optional(v.string()),
        screenResolution: v.optional(v.string()),
        viewportSize: v.optional(v.string()),
        timezone: v.optional(v.string()),
        timezoneOffset: v.optional(v.number()),
        cookieEnabled: v.optional(v.boolean()),
        referrer: v.optional(v.string()),
        currentUrl: v.optional(v.string()),
        source: v.optional(v.string()),
        visitorId: v.optional(v.string()),
      })
    ),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_expires_at", ["expiresAt"]),

  aiVoiceConversations: defineTable({
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    provider: aiVoiceConversationProviderValidator,
    status: v.optional(
      v.union(
        v.literal("unresolved"),
        v.literal("escalated"),
        v.literal("resolved")
      )
    ),
    linkedConversationId: v.optional(v.id("conversations")),
    lastActivityAt: v.number(),
    endedAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    lastMessageRole: v.optional(aiVoiceConversationRoleValidator),
    operatorLastReadAt: v.optional(v.number()),
    unreadForOperatorCount: v.optional(v.number()),
    escalatedAt: v.optional(v.union(v.number(), v.null())),
    resolvedAt: v.optional(v.union(v.number(), v.null())),
    resolutionSource: v.optional(v.union(resolutionSourceValidator, v.null())),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_organization_id_and_last_activity_at", [
      "organizationId",
      "lastActivityAt",
    ]),

  aiVoiceConversationMessages: defineTable({
    conversationId: v.id("aiVoiceConversations"),
    role: aiVoiceConversationRoleValidator,
    text: v.string(),
  }).index("by_conversation_id", ["conversationId"]),

  conversationInsights: defineTable({
    organizationId: v.string(),
    channel: supportChannelValidator,
    conversationId: v.optional(v.id("conversations")),
    aiVoiceConversationId: v.optional(v.id("aiVoiceConversations")),
    contactSessionId: v.id("contactSessions"),
    status: v.union(
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
    intent: v.string(),
    sentiment: supportSentimentValidator,
    urgency: supportUrgencyValidator,
    language: v.optional(v.string()),
    summary: v.string(),
    isUnanswered: v.boolean(),
    unansweredQuestion: v.optional(v.string()),
    wasEscalated: v.boolean(),
    wasResolved: v.boolean(),
    resolutionSource: v.optional(resolutionSourceValidator),
    firstHumanResponseMs: v.optional(v.number()),
    humanSavedMinutes: v.number(),
    lastAnalyzedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_updated_at", ["organizationId", "updatedAt"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_ai_voice_conversation_id", ["aiVoiceConversationId"]),

  customerMemories: defineTable({
    organizationId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    summary: v.string(),
    preferredLanguage: v.optional(v.string()),
    recentIntents: v.array(v.string()),
    notableFacts: v.array(v.string()),
    issueHistory: v.array(
      v.object({
        channel: supportChannelValidator,
        intent: v.string(),
        status: v.union(
          v.literal("unresolved"),
          v.literal("escalated"),
          v.literal("resolved")
        ),
        summary: v.string(),
        at: v.number(),
      })
    ),
    totalConversations: v.number(),
    totalEscalations: v.number(),
    totalResolved: v.number(),
    lastSeenAt: v.number(),
    lastContactSessionId: v.optional(v.id("contactSessions")),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_email", ["organizationId", "email"])
    .index("by_organization_id_and_last_seen_at", [
      "organizationId",
      "lastSeenAt",
    ]),
})
