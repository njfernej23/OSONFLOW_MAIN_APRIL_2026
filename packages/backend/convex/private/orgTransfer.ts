import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { ConvexError, v } from "convex/values"
import { action } from "../_generated/server"
import { api, internal } from "../_generated/api"
import { contentHashFromArrayBuffer, type Entry } from "@convex-dev/rag"
import type { Id } from "../_generated/dataModel"
import { extractTextContent } from "../lib/extractTextContent"
import rag, { getRagForOrganization } from "../system/ai/rag"
import { serializeSecretValue } from "../lib/secrets"

export const ORG_BUNDLE_TYPE = "osonflow-org-bundle" as const
export const ORG_BUNDLE_VERSION = 1 as const
const MAX_EXPORT_TEXT_LENGTH = 200_000

type EntryMetadata = {
  storageId?: Id<"_storage">
  uploadedBy: string
  filename: string
  category: string | null
  sourceUrl?: string
  sourceType?: "file" | "website"
}

type KnowledgeExportEntry = {
  key: string
  title: string
  filename: string
  category: string | null
  sourceType: "file" | "website"
  sourceUrl?: string
  mimeType?: string
  text: string
}

type OrgBundle = {
  type: typeof ORG_BUNDLE_TYPE
  version: typeof ORG_BUNDLE_VERSION
  exportedAt: string
  widgetSettings?: {
    draft: Record<string, unknown>
    published?: Record<string, unknown>
  }
  knowledgeBase?: KnowledgeExportEntry[]
  savedReplies?: Array<{
    title: string
    body: string
    category?: string
  }>
  workflows?: Array<{
    name: string
    description?: string
    definition: unknown
    publishedDefinition?: unknown
    isActive?: boolean
  }>
  plugins?: Array<{
    service: "openai_realtime" | "gemini_live" | "google_sheets" | "google_calendar"
    secretName: string
    value: unknown
  }>
  integrationWebhooks?: Array<{
    url: string
    description?: string
    provider?: string
    providerConfig?: unknown
    isEnabled: boolean
    eventTypes: string[]
    signingSecret: string
  }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const compact = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, nested]) => nested !== undefined)
  ) as T

const pickString = (value: unknown) =>
  typeof value === "string" ? value : undefined

const pickNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const pickBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : undefined

const pickHelpTopics = (value: unknown) => {
  const topics = Array.isArray(value)
    ? value
    : isRecord(value)
      ? [value.topic1, value.topic2, value.topic3]
      : []

  return topics.filter(isRecord).map((topic) => ({
    title: pickString(topic.title) ?? "",
    excerpt: pickString(topic.excerpt) ?? "",
    articles: (
      Array.isArray(topic.articles)
        ? topic.articles
        : isRecord(topic.articles)
          ? [
              topic.articles.article1,
              topic.articles.article2,
              topic.articles.article3,
            ]
          : []
    )
      .filter(isRecord)
      .map((article) => ({
        title: pickString(article.title) ?? "",
        excerpt: pickString(article.excerpt) ?? "",
        body: pickString(article.body) ?? "",
      })),
  }))
}

const pickHomeCards = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .filter((card) => card.type === "article")
    .map((card) => ({
      type: "article" as const,
      topicIndex: pickNumber(card.topicIndex) ?? 0,
      articleIndex: pickNumber(card.articleIndex) ?? 0,
    }))
}

const pickTheme = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined
  }

  return compact({
    primaryColor: pickString(value.primaryColor),
    headerGradientStart: pickString(value.headerGradientStart),
    headerGradientEnd: pickString(value.headerGradientEnd),
    userBubbleColor: pickString(value.userBubbleColor),
    botBubbleColor: pickString(value.botBubbleColor),
    borderRadius: pickNumber(value.borderRadius),
    logoUrl: pickString(value.logoUrl),
    backgroundImageUrl: pickString(value.backgroundImageUrl),
    assistantName: pickString(value.assistantName),
    fontFamily:
      value.fontFamily === "sans" ||
      value.fontFamily === "serif" ||
      value.fontFamily === "mono" ||
      value.fontFamily === "rounded"
        ? value.fontFamily
        : undefined,
    headerBrandMode:
      value.headerBrandMode === "none" ||
      value.headerBrandMode === "image" ||
      value.headerBrandMode === "text"
        ? value.headerBrandMode
        : undefined,
    headerBannerImageUrl: pickString(value.headerBannerImageUrl),
    headerBannerText: pickString(value.headerBannerText),
    headerBannerTextColor: pickString(value.headerBannerTextColor),
    headerBannerAccentColor: pickString(value.headerBannerAccentColor),
    headerBannerFont:
      value.headerBannerFont === "sans" ||
      value.headerBannerFont === "serif" ||
      value.headerBannerFont === "mono" ||
      value.headerBannerFont === "display"
        ? value.headerBannerFont
        : undefined,
    headerBannerStyle:
      value.headerBannerStyle === "plain" ||
      value.headerBannerStyle === "pill" ||
      value.headerBannerStyle === "gradient"
        ? value.headerBannerStyle
        : undefined,
  })
}

const pickAppearance = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined
  }

  return compact({
    launcherColor: pickString(value.launcherColor),
    launcherLabel: pickString(value.launcherLabel),
    voiceLauncherLabel: pickString(value.voiceLauncherLabel),
    launcherIcon:
      value.launcherIcon === "chat" ||
      value.launcherIcon === "sparkles" ||
      value.launcherIcon === "question"
        ? value.launcherIcon
        : undefined,
    launcherIconUrl: pickString(value.launcherIconUrl),
    launcherPromptEnabled: pickBoolean(value.launcherPromptEnabled),
    launcherPromptText: pickString(value.launcherPromptText),
    launcherPromptDelaySeconds: pickNumber(value.launcherPromptDelaySeconds),
    animation:
      value.animation === "slide-up" ||
      value.animation === "scale" ||
      value.animation === "fade" ||
      value.animation === "pop"
        ? value.animation
        : undefined,
    poweredByText: pickString(value.poweredByText),
    showPoweredBy: pickBoolean(value.showPoweredBy),
    showHelpCenter: pickBoolean(value.showHelpCenter),
    showChatHistoryDownload: pickBoolean(value.showChatHistoryDownload),
    launcherPosition:
      value.launcherPosition === "bottom-right" ||
      value.launcherPosition === "bottom-left"
        ? value.launcherPosition
        : undefined,
    launcherOffsetX: pickNumber(value.launcherOffsetX),
    launcherOffsetY: pickNumber(value.launcherOffsetY),
    launcherSize: pickNumber(value.launcherSize),
    autoOpenEnabled: pickBoolean(value.autoOpenEnabled),
    autoOpenDelaySeconds: pickNumber(value.autoOpenDelaySeconds),
    autoOpenFrequency:
      value.autoOpenFrequency === "session" ||
      value.autoOpenFrequency === "visitor" ||
      value.autoOpenFrequency === "always"
        ? value.autoOpenFrequency
        : undefined,
    notificationSoundEnabled: pickBoolean(value.notificationSoundEnabled),
  })
}

const pickWidgetCopy = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined
  }

  return compact({
    homeGreeting: pickString(value.homeGreeting),
    homeHeadline: pickString(value.homeHeadline),
    startChatLabel: pickString(value.startChatLabel),
    inputPlaceholder: pickString(value.inputPlaceholder),
    onlineLabel: pickString(value.onlineLabel),
  })
}

const pickVoiceCallSettings = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined
  }

  const phrases = Array.isArray(value.customGoodbyePhrases)
    ? value.customGoodbyePhrases.filter(
        (phrase): phrase is string => typeof phrase === "string"
      )
    : typeof value.customGoodbyePhrases === "string"
      ? value.customGoodbyePhrases
          .split("\n")
          .map((phrase) => phrase.trim())
          .filter(Boolean)
      : undefined

  return compact({
    autoEndOnGoodbye: pickBoolean(value.autoEndOnGoodbye),
    customGoodbyePhrases: phrases,
    idleTimeoutSeconds: pickNumber(value.idleTimeoutSeconds),
    maxDurationSeconds: pickNumber(value.maxDurationSeconds),
  })
}

const sanitizeWidgetSnapshot = (snapshot: unknown) => {
  if (!isRecord(snapshot)) {
    return null
  }

  const defaultSuggestions = isRecord(snapshot.defaultSuggestions)
    ? compact({
        suggestion1: pickString(snapshot.defaultSuggestions.suggestion1),
        suggestion2: pickString(snapshot.defaultSuggestions.suggestion2),
        suggestion3: pickString(snapshot.defaultSuggestions.suggestion3),
      })
    : { suggestion1: "", suggestion2: "", suggestion3: "" }

  const chatSettings = isRecord(snapshot.chatSettings)
    ? compact({ model: pickString(snapshot.chatSettings.model) })
    : undefined

  const openaiRealtimeSettings = isRecord(snapshot.openaiRealtimeSettings)
    ? compact({
        enabled: pickBoolean(snapshot.openaiRealtimeSettings.enabled),
        model: pickString(snapshot.openaiRealtimeSettings.model),
        voice: pickString(snapshot.openaiRealtimeSettings.voice),
      })
    : undefined

  const geminiLiveSettings = isRecord(snapshot.geminiLiveSettings)
    ? compact({
        enabled: pickBoolean(snapshot.geminiLiveSettings.enabled),
        model: pickString(snapshot.geminiLiveSettings.model),
        voice: pickString(snapshot.geminiLiveSettings.voice),
      })
    : undefined

  return compact({
    greetMessage:
      pickString(snapshot.greetMessage)?.trim() ||
      "Hi! How can I help you today?",
    systemPrompt: pickString(snapshot.systemPrompt),
    defaultSuggestions,
    helpTopics: pickHelpTopics(snapshot.helpTopics),
    homeCards: pickHomeCards(snapshot.homeCards),
    chatSettings,
    openaiRealtimeSettings,
    geminiLiveSettings,
    voiceCallSettings: pickVoiceCallSettings(snapshot.voiceCallSettings),
    theme: pickTheme(snapshot.theme),
    appearance: pickAppearance(snapshot.appearance),
    widgetCopy: pickWidgetCopy(snapshot.widgetCopy),
  })
}

const pickWorkflowDefinition = (value: unknown) => {
  if (!isRecord(value) || typeof value.schemaVersion !== "number") {
    return null
  }

  const name = pickString(value.name)
  if (!name) {
    return null
  }

  return compact({
    schemaVersion: value.schemaVersion,
    id: pickString(value.id),
    name,
    description: pickString(value.description),
    nodes: Array.isArray(value.nodes) ? value.nodes : [],
    edges: Array.isArray(value.edges) ? value.edges : [],
  })
}

const WIDGET_SETTINGS_EXPORT_TYPE = "osonflow-widget-settings"

const parseOrgBundle = (parsed: unknown): OrgBundle => {
  if (!isRecord(parsed)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Bundle format is invalid or unsupported",
    })
  }

  if (parsed.type === WIDGET_SETTINGS_EXPORT_TYPE && isRecord(parsed.settings)) {
    return {
      type: ORG_BUNDLE_TYPE,
      version: ORG_BUNDLE_VERSION,
      exportedAt:
        typeof parsed.exportedAt === "string"
          ? parsed.exportedAt
          : new Date().toISOString(),
      widgetSettings: {
        draft: parsed.settings,
      },
    }
  }

  if (
    parsed.type !== ORG_BUNDLE_TYPE ||
    parsed.version !== ORG_BUNDLE_VERSION
  ) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Bundle format is invalid or unsupported",
    })
  }

  if (typeof parsed.exportedAt !== "string") {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Bundle format is invalid or unsupported",
    })
  }

  return parsed as OrgBundle
}

const importOptionsValidator = v.object({
  publishWidgetSettings: v.optional(v.boolean()),
  replaceKnowledgeBase: v.optional(v.boolean()),
})

const EMPTY_WIDGET_SNAPSHOT = {
  greetMessage: "Hi! How can I help you today?",
  defaultSuggestions: {
    suggestion1: "",
    suggestion2: "",
    suggestion3: "",
  },
  helpTopics: [] as Array<{
    title: string
    excerpt: string
    articles: Array<{ title: string; excerpt: string; body: string }>
  }>,
  homeCards: [] as Array<{
    type: "article"
    topicIndex: number
    articleIndex: number
  }>,
}

const toWidgetSnapshot = (value: unknown): Record<string, unknown> =>
  sanitizeWidgetSnapshot(value) ?? EMPTY_WIDGET_SNAPSHOT

const buildWidgetSnapshotFromRow = (row: any): Record<string, unknown> =>
  toWidgetSnapshot({
    greetMessage: row.greetMessage,
    systemPrompt: row.systemPrompt,
    chatSettings: row.chatSettings,
    defaultSuggestions: row.defaultSuggestions,
    helpTopics: row.helpTopics,
    homeCards: row.homeCards,
    openaiRealtimeSettings: row.openaiRealtimeSettings,
    geminiLiveSettings: row.geminiLiveSettings,
    voiceCallSettings: row.voiceCallSettings,
    theme: row.theme,
    appearance: row.appearance,
  })

const extractKnowledgeText = async (
  ctx: { storage: any },
  entry: Entry,
  orgId: string
): Promise<string | null> => {
  const metadata = entry.metadata as EntryMetadata | undefined

  if (metadata?.uploadedBy !== orgId) {
    return null
  }

  const storageId = metadata.storageId
  const filename = metadata.filename || entry.key || "source"

  if (storageId) {
    const storageBlob = await ctx.storage.get(storageId)

    if (storageBlob) {
      const mimeType = storageBlob.type || "text/plain"
      const extension = filename.split(".").pop()?.toLowerCase() || ""
      const isTextLike =
        metadata.sourceType === "website" ||
        mimeType.startsWith("text/") ||
        ["txt", "csv", "md", "json", "html", "xml"].includes(extension)

      if (isTextLike) {
        const rawText = new TextDecoder().decode(
          await storageBlob.arrayBuffer()
        )
        return rawText.slice(0, MAX_EXPORT_TEXT_LENGTH)
      }

      try {
        const bytes = await storageBlob.arrayBuffer()
        const extracted = await extractTextContent(ctx, {
          storageId,
          filename,
          bytes,
          mimeType,
        })
        return extracted.slice(0, MAX_EXPORT_TEXT_LENGTH)
      } catch {
        return null
      }
    }
  }

  return null
}

const exportKnowledgeBase = async (
  ctx: { storage: any },
  orgId: string
): Promise<KnowledgeExportEntry[]> => {
  const namespace = await rag.getNamespace(ctx as any, {
    namespace: orgId,
  })

  if (!namespace) {
    return []
  }

  const exported: KnowledgeExportEntry[] = []
  let cursor: string | null = null
  let isDone = false

  while (!isDone) {
    const page = await rag.list(ctx as any, {
      namespaceId: namespace.namespaceId,
      paginationOpts: {
        numItems: 25,
        cursor,
      },
    })

    for (const entry of page.page) {
      if (entry.status !== "ready") {
        continue
      }

      const metadata = entry.metadata as EntryMetadata | undefined
      const text = await extractKnowledgeText(ctx, entry, orgId)

      if (!text?.trim()) {
        continue
      }

      exported.push({
        key: entry.key || metadata?.filename || entry.title || "source",
        title: entry.title || metadata?.filename || entry.key || "source",
        filename: metadata?.filename || entry.key || "source",
        category: metadata?.category ?? null,
        sourceType: metadata?.sourceType === "website" ? "website" : "file",
        sourceUrl: metadata?.sourceUrl,
        mimeType: metadata?.sourceType === "website" ? "text/plain" : undefined,
        text,
      })
    }

    isDone = page.isDone
    cursor = page.continueCursor
  }

  return exported
}

const clearKnowledgeBase = async (ctx: any, orgId: string) => {
  const namespace = await rag.getNamespace(ctx, { namespace: orgId })

  if (!namespace) {
    return 0
  }

  let deleted = 0
  let cursor: string | null = null
  let isDone = false

  while (!isDone) {
    const page = await rag.list(ctx, {
      namespaceId: namespace.namespaceId,
      paginationOpts: {
        numItems: 25,
        cursor,
      },
    })

    for (const entry of page.page) {
      const metadata = entry.metadata as EntryMetadata | undefined

      if (metadata?.uploadedBy !== orgId) {
        continue
      }

      if (metadata.storageId) {
        await ctx.storage.delete(metadata.storageId)
      }

      await rag.deleteAsync(ctx, { entryId: entry.entryId })
      deleted += 1
    }

    isDone = page.isDone
    cursor = page.continueCursor
  }

  return deleted
}

const importKnowledgeEntry = async (
  ctx: any,
  orgId: string,
  entry: KnowledgeExportEntry,
  openAISecret?: string | null
) => {
  const text = entry.text.trim()

  if (!text) {
    return { created: false, reason: "empty_text" as const }
  }

  const organizationRag = await getRagForOrganization(openAISecret)
  const textBytes = new TextEncoder().encode(text)
  const textBuffer = textBytes.buffer.slice(
    textBytes.byteOffset,
    textBytes.byteOffset + textBytes.byteLength
  )
  const storageFilename =
    entry.sourceType === "website"
      ? `${entry.filename.endsWith(".txt") ? entry.filename : `${entry.filename}.txt`}`
      : entry.filename
  const storageBlob = new Blob([text], {
    type: entry.mimeType || "text/plain",
  })
  const storageId = await ctx.storage.store(storageBlob)
  await ctx.runMutation((internal as any).system.storageObjects.claim, {
    storageId,
    organizationId: orgId,
    purpose: "knowledge_base_import",
  })

  const { created } = await organizationRag.add(ctx, {
    namespace: orgId,
    text,
    key: entry.key,
    title: entry.title,
    metadata: {
      storageId,
      uploadedBy: orgId,
      filename: storageFilename,
      category: entry.category,
      sourceUrl: entry.sourceUrl,
      sourceType: entry.sourceType,
    } as EntryMetadata,
    contentHash: await contentHashFromArrayBuffer(textBuffer),
  })

  if (!created) {
    await ctx.storage.delete(storageId)
    await ctx.runMutation((internal as any).system.storageObjects.release, {
      storageId,
    })
  }

  return { created, reason: created ? null : ("duplicate" as const) }
}

export const exportBundle = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    bundle: OrgBundle
    summary: {
      widgetSettings: boolean
      knowledgeBaseCount: number
      savedRepliesCount: number
      workflowsCount: number
      pluginsCount: number
      integrationWebhooksCount: number
    }
  }> => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = getOrganizationIdFromIdentity(identity)

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const tableData = await ctx.runQuery(
      internal.system.orgTransfer.collectTableData,
      {
        organizationId: orgId,
      }
    )

    const knowledgeBase = await exportKnowledgeBase(ctx, orgId)

    const widgetSettings = tableData.widgetSettings
      ? {
          published: buildWidgetSnapshotFromRow(tableData.widgetSettings),
          draft:
            sanitizeWidgetSnapshot(tableData.widgetSettings.draft) ??
            buildWidgetSnapshotFromRow(tableData.widgetSettings),
        }
      : undefined

    const bundle: OrgBundle = {
      type: ORG_BUNDLE_TYPE,
      version: ORG_BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      widgetSettings,
      knowledgeBase,
      savedReplies: tableData.savedReplies,
      workflows: tableData.workflows,
      plugins: tableData.plugins,
      integrationWebhooks: tableData.integrationWebhooks,
    }

    return {
      bundle,
      summary: {
        widgetSettings: Boolean(bundle.widgetSettings),
        knowledgeBaseCount: knowledgeBase.length,
        savedRepliesCount: tableData.savedReplies.length,
        workflowsCount: tableData.workflows.length,
        pluginsCount: tableData.plugins.length,
        integrationWebhooksCount: tableData.integrationWebhooks.length,
      },
    }
  },
})

const importSummaryValidator = v.object({
  widgetSettings: v.boolean(),
  publishedWidgetSettings: v.boolean(),
  knowledgeBaseImported: v.number(),
  knowledgeBaseSkipped: v.number(),
  knowledgeBaseCleared: v.number(),
  savedReplies: v.number(),
  workflows: v.number(),
  plugins: v.number(),
  integrationWebhooks: v.number(),
  warnings: v.array(v.string()),
})

const getCaughtErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ConvexError) {
    const data = error.data
    if (typeof data === "string" && data.trim()) {
      return data
    }
    if (
      isRecord(data) &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

const serializePluginValue = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value
  }

  if (isRecord(value)) {
    return serializeSecretValue(value)
  }

  return null
}

export const importBundle = action({
  args: {
    bundleJson: v.string(),
    options: v.optional(importOptionsValidator),
  },
  returns: v.object({
    summary: importSummaryValidator,
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const orgId = getOrganizationIdFromIdentity(identity)

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(args.bundleJson)
    } catch {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Bundle is not valid JSON",
      })
    }

    const bundle = parseOrgBundle(parsed)
    const options = args.options ?? {}
    const summary = {
      widgetSettings: false,
      publishedWidgetSettings: false,
      knowledgeBaseImported: 0,
      knowledgeBaseSkipped: 0,
      knowledgeBaseCleared: 0,
      savedReplies: 0,
      workflows: 0,
      plugins: 0,
      integrationWebhooks: 0,
      warnings: [] as string[],
    }

    if (bundle.widgetSettings) {
      const snapshot = sanitizeWidgetSnapshot(
        bundle.widgetSettings.draft ?? bundle.widgetSettings.published
      )

      if (snapshot) {
        try {
          await ctx.runMutation(
            api.private.widgetSettings.saveDraft,
            snapshot as never
          )
          summary.widgetSettings = true

          if (options.publishWidgetSettings) {
            await ctx.runMutation(api.private.widgetSettings.publishDraft, {})
            summary.publishedWidgetSettings = true
          }
        } catch (error) {
          summary.warnings.push(
            getCaughtErrorMessage(error, "Widget settings could not be imported")
          )
        }
      }
    }

    if (bundle.plugins?.length) {
      for (const plugin of bundle.plugins) {
        const secretValue = serializePluginValue(plugin.value)

        if (
          !secretValue ||
          (plugin.service !== "openai_realtime" &&
            plugin.service !== "gemini_live" &&
            plugin.service !== "google_sheets" &&
            plugin.service !== "google_calendar")
        ) {
          continue
        }

        try {
          await ctx.runMutation(internal.system.orgTransfer.importPlugin, {
            organizationId: orgId,
            service: plugin.service,
            secretName: plugin.secretName,
            secretValue,
          })
          summary.plugins += 1
        } catch (error) {
          summary.warnings.push(
            getCaughtErrorMessage(
              error,
              `Could not import ${plugin.service} key`
            )
          )
        }
      }
    }

    const bundledOpenAI = bundle.plugins?.find(
      (plugin) => plugin.service === "openai_realtime"
    )
    const openAISecret = serializePluginValue(bundledOpenAI?.value)

    if (options.replaceKnowledgeBase) {
      try {
        summary.knowledgeBaseCleared = await clearKnowledgeBase(ctx, orgId)
      } catch (error) {
        summary.warnings.push(
          getCaughtErrorMessage(error, "Could not replace the knowledge base")
        )
      }
    }

    if (bundle.knowledgeBase?.length) {
      for (const entry of bundle.knowledgeBase) {
        try {
          const result = await importKnowledgeEntry(
            ctx,
            orgId,
            entry,
            openAISecret
          )

          if (result.created) {
            summary.knowledgeBaseImported += 1
          } else {
            summary.knowledgeBaseSkipped += 1
          }
        } catch (error) {
          summary.knowledgeBaseSkipped += 1
          summary.warnings.push(
            getCaughtErrorMessage(
              error,
              `Could not import knowledge source "${entry.title}"`
            )
          )
        }
      }

      if (summary.knowledgeBaseImported > 0) {
        await ctx.runMutation(
          (internal as any).system.ai.replyCache.clearForOrganization,
          { organizationId: orgId }
        )
      }
    }

    if (bundle.savedReplies?.length) {
      for (const reply of bundle.savedReplies) {
        try {
          await ctx.runMutation(internal.system.orgTransfer.importSavedReply, {
            organizationId: orgId,
            actorId: identity.subject,
            title: reply.title,
            body: reply.body,
            category: reply.category,
          })
          summary.savedReplies += 1
        } catch (error) {
          summary.warnings.push(
            getCaughtErrorMessage(
              error,
              `Could not import saved reply "${reply.title}"`
            )
          )
        }
      }
    }

    if (bundle.workflows?.length) {
      for (const workflow of bundle.workflows) {
        const definition = pickWorkflowDefinition(workflow.definition)
        const publishedDefinition = pickWorkflowDefinition(
          workflow.publishedDefinition
        )

        if (!definition) {
          summary.warnings.push(
            `Skipped workflow "${workflow.name}" because its definition is invalid`
          )
          continue
        }

        try {
          await ctx.runMutation(internal.system.orgTransfer.importWorkflow, {
            organizationId: orgId,
            actorId: identity.subject,
            name: workflow.name,
            description: workflow.description,
            definition: definition as never,
            publishedDefinition: publishedDefinition as never,
            isActive: workflow.isActive,
          })
          summary.workflows += 1
        } catch (error) {
          summary.warnings.push(
            getCaughtErrorMessage(
              error,
              `Could not import workflow "${workflow.name}"`
            )
          )
        }
      }
    }

    if (bundle.integrationWebhooks?.length) {
      for (const webhook of bundle.integrationWebhooks) {
        try {
          const allowedEventTypes = (
            Array.isArray(webhook.eventTypes) ? webhook.eventTypes : []
          ).filter(
            (
              eventType
            ): eventType is
              | "contact_session.created"
              | "conversation.created"
              | "conversation.status_changed"
              | "message.received"
              | "message.sent" =>
              eventType === "contact_session.created" ||
              eventType === "conversation.created" ||
              eventType === "conversation.status_changed" ||
              eventType === "message.received" ||
              eventType === "message.sent"
          )

          const providerConfig = isRecord(webhook.providerConfig)
            ? compact({
                telegramBotToken: pickString(
                  webhook.providerConfig.telegramBotToken
                ),
                telegramChatId: pickString(
                  webhook.providerConfig.telegramChatId
                ),
                whatsappAccessToken: pickString(
                  webhook.providerConfig.whatsappAccessToken
                ),
                whatsappPhoneNumberId: pickString(
                  webhook.providerConfig.whatsappPhoneNumberId
                ),
                whatsappRecipientPhone: pickString(
                  webhook.providerConfig.whatsappRecipientPhone
                ),
              })
            : undefined

          await ctx.runMutation(
            internal.system.orgTransfer.importIntegrationWebhook,
            {
              organizationId: orgId,
              actorId: identity.subject,
              url: webhook.url,
              description: webhook.description,
              provider:
                webhook.provider === "webhook" ||
                webhook.provider === "discord" ||
                webhook.provider === "telegram" ||
                webhook.provider === "whatsapp"
                  ? webhook.provider
                  : undefined,
              providerConfig: providerConfig as never,
              isEnabled: webhook.isEnabled,
              eventTypes: allowedEventTypes,
              signingSecret: webhook.signingSecret,
            }
          )
          summary.integrationWebhooks += 1
        } catch (error) {
          summary.warnings.push(
            getCaughtErrorMessage(
              error,
              `Could not import webhook "${webhook.url}"`
            )
          )
        }
      }
    }

    return { summary }
  },
})
