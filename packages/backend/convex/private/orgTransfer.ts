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
  // Workflows disabled — not developing this feature for now
  // workflows?: Array<{
  //   name: string
  //   description?: string
  //   definition: unknown
  //   publishedDefinition?: unknown
  //   isActive?: boolean
  // }>
  plugins?: Array<{
    service: "vapi" | "openai_realtime" | "gemini_live"
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
  typeof value === "object" && value !== null

const parseOrgBundle = (parsed: unknown): OrgBundle => {
  if (!isRecord(parsed)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Bundle format is invalid or unsupported",
    })
  }

  if (parsed.type !== ORG_BUNDLE_TYPE || parsed.version !== ORG_BUNDLE_VERSION) {
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

const buildWidgetSnapshotFromRow = (row: any) => ({
  greetMessage: row.greetMessage,
  systemPrompt: row.systemPrompt,
  chatSettings: row.chatSettings,
  defaultSuggestions: row.defaultSuggestions,
  helpTopics: Array.isArray(row.helpTopics) ? row.helpTopics : [],
  homeCards: Array.isArray(row.homeCards) ? row.homeCards : [],
  vapiSettings: row.vapiSettings,
  openaiRealtimeSettings: row.openaiRealtimeSettings,
  geminiLiveSettings: row.geminiLiveSettings,
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
        const rawText = new TextDecoder().decode(await storageBlob.arrayBuffer())
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
  entry: KnowledgeExportEntry
) => {
  const text = entry.text.trim()

  if (!text) {
    return { created: false, reason: "empty_text" as const }
  }

  const organizationRag = await getRagForOrganization()
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
  }

  return { created, reason: created ? null : ("duplicate" as const) }
}

export const exportBundle = action({
  args: {},
  handler: async (ctx): Promise<{
    bundle: OrgBundle
    summary: {
      widgetSettings: boolean
      knowledgeBaseCount: number
      savedRepliesCount: number
      // workflowsCount: number // Workflows disabled
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

    const tableData = await ctx.runQuery(internal.system.orgTransfer.collectTableData, {
      organizationId: orgId,
    })

    const knowledgeBase = await exportKnowledgeBase(ctx, orgId)

    const bundle = {
      type: ORG_BUNDLE_TYPE,
      version: ORG_BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      widgetSettings: tableData.widgetSettings
        ? {
            published: buildWidgetSnapshotFromRow(tableData.widgetSettings),
            draft:
              tableData.widgetSettings.draft ??
              buildWidgetSnapshotFromRow(tableData.widgetSettings),
          }
        : undefined,
      knowledgeBase,
      savedReplies: tableData.savedReplies,
      // workflows: tableData.workflows, // Workflows disabled
      plugins: tableData.plugins,
      integrationWebhooks: tableData.integrationWebhooks,
    }

    return {
      bundle,
      summary: {
        widgetSettings: Boolean(bundle.widgetSettings),
        knowledgeBaseCount: knowledgeBase.length,
        savedRepliesCount: tableData.savedReplies.length,
        // workflowsCount: tableData.workflows.length, // Workflows disabled
        pluginsCount: tableData.plugins.length,
        integrationWebhooksCount: tableData.integrationWebhooks.length,
      },
    }
  },
})

export const importBundle = action({
  args: {
    bundleJson: v.string(),
    options: v.optional(importOptionsValidator),
  },
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
      // workflows: 0, // Workflows disabled
      plugins: 0,
      integrationWebhooks: 0,
    }

    if (bundle.widgetSettings) {
      const snapshot =
        bundle.widgetSettings.draft ?? bundle.widgetSettings.published

      if (snapshot) {
        await ctx.runMutation(api.private.widgetSettings.saveDraft, snapshot as never)
        summary.widgetSettings = true

        if (options.publishWidgetSettings) {
          await ctx.runMutation(api.private.widgetSettings.publishDraft, {})
          summary.publishedWidgetSettings = true
        }
      }
    }

    if (options.replaceKnowledgeBase) {
      summary.knowledgeBaseCleared = await clearKnowledgeBase(ctx, orgId)
    }

    if (bundle.knowledgeBase?.length) {
      for (const entry of bundle.knowledgeBase) {
        const result = await importKnowledgeEntry(ctx, orgId, entry)

        if (result.created) {
          summary.knowledgeBaseImported += 1
        } else {
          summary.knowledgeBaseSkipped += 1
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
        await ctx.runMutation(internal.system.orgTransfer.importSavedReply, {
          organizationId: orgId,
          actorId: identity.subject,
          title: reply.title,
          body: reply.body,
          category: reply.category,
        })
        summary.savedReplies += 1
      }
    }

    // Workflows disabled — not developing this feature for now
    // if (bundle.workflows?.length) {
    //   for (const workflow of bundle.workflows) {
    //     await ctx.runMutation(internal.system.orgTransfer.importWorkflow, {
    //       organizationId: orgId,
    //       actorId: identity.subject,
    //       name: workflow.name,
    //       description: workflow.description,
    //       definition: workflow.definition as never,
    //       publishedDefinition: workflow.publishedDefinition as never,
    //       isActive: workflow.isActive,
    //     })
    //     summary.workflows += 1
    //   }
    // }

    if (bundle.plugins?.length) {
      for (const plugin of bundle.plugins) {
        if (!plugin.value) {
          continue
        }

        await ctx.runMutation(internal.system.orgTransfer.importPlugin, {
          organizationId: orgId,
          service: plugin.service,
          secretName: plugin.secretName,
          secretValue: serializeSecretValue(plugin.value as Record<string, unknown>),
        })
        summary.plugins += 1
      }
    }

    if (bundle.integrationWebhooks?.length) {
      for (const webhook of bundle.integrationWebhooks) {
        await ctx.runMutation(internal.system.orgTransfer.importIntegrationWebhook, {
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
          providerConfig: webhook.providerConfig as never,
          isEnabled: webhook.isEnabled,
          eventTypes: webhook.eventTypes as Array<
            | "contact_session.created"
            | "conversation.created"
            | "conversation.status_changed"
            | "message.received"
            | "message.sent"
          >,
          signingSecret: webhook.signingSecret,
        })
        summary.integrationWebhooks += 1
      }
    }

    return { summary }
  },
})
