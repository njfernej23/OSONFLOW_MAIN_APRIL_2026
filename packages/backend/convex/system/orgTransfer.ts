import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"
import { parseSecretValue } from "../lib/secrets"

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

const pluginServiceValidator = v.union(
  v.literal("vapi"),
  v.literal("openai_realtime"),
  v.literal("gemini_live")
)

// Workflows disabled — not developing this feature for now
// const workflowDefinitionValidator = v.object({
//   schemaVersion: v.number(),
//   id: v.optional(v.string()),
//   name: v.string(),
//   description: v.optional(v.string()),
//   nodes: v.array(v.any()),
//   edges: v.array(v.any()),
// })

export const collectTableData = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = args

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique()

    const savedReplies = await ctx.db
      .query("savedReplies")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect()

    // Workflows disabled — not developing this feature for now
    // const workflows = await ctx.db
    //   .query("workflows")
    //   .withIndex("by_organization_id", (q) =>
    //     q.eq("organizationId", organizationId)
    //   )
    //   .collect()

    const plugins = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect()

    const integrationWebhooks = await ctx.db
      .query("integrationWebhooks")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect()

    return {
      widgetSettings,
      savedReplies: savedReplies.map((reply) => ({
        title: reply.title,
        body: reply.body,
        category: reply.category,
      })),
      // workflows: workflows.map((workflow) => ({
      //   name: workflow.name,
      //   description: workflow.description,
      //   definition: workflow.definition,
      //   publishedDefinition: workflow.publishedDefinition,
      //   isActive: workflow.isActive ?? false,
      // })),
      plugins: plugins.map((plugin) => ({
        service: plugin.service,
        secretName: plugin.secretName,
        value: plugin.secretValue
          ? parseSecretValue(plugin.secretValue)
          : null,
      })),
      integrationWebhooks: integrationWebhooks.map((webhook) => ({
        url: webhook.url,
        description: webhook.description,
        provider: webhook.provider,
        providerConfig: webhook.providerConfig,
        isEnabled: webhook.isEnabled,
        eventTypes: webhook.eventTypes,
        signingSecret: webhook.signingSecret,
      })),
    }
  },
})

export const importIntegrationWebhook = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    url: v.string(),
    description: v.optional(v.string()),
    provider: v.optional(webhookProviderValidator),
    providerConfig: v.optional(webhookProviderConfigValidator),
    isEnabled: v.boolean(),
    eventTypes: v.array(webhookEventTypeValidator),
    signingSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert("integrationWebhooks", {
      organizationId: args.organizationId,
      url: args.url,
      description: args.description,
      provider: args.provider,
      providerConfig: args.providerConfig,
      signingSecret: args.signingSecret,
      isEnabled: args.isEnabled,
      eventTypes: args.eventTypes,
      createdBy: args.actorId,
      updatedAt: now,
    })
  },
})

// Workflows disabled — not developing this feature for now
/*
export const importWorkflow = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    definition: workflowDefinitionValidator,
    publishedDefinition: v.optional(workflowDefinitionValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const workflowId = await ctx.db.insert("workflows", {
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      definition: args.definition,
      publishedDefinition: args.publishedDefinition,
      isActive: args.isActive ?? false,
      publishedAt: args.publishedDefinition ? now : undefined,
      publishedBy: args.publishedDefinition ? args.actorId : undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: args.actorId,
      updatedBy: args.actorId,
    })

    return workflowId
  },
})
*/

export const importSavedReply = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert("savedReplies", {
      organizationId: args.organizationId,
      title: args.title,
      body: args.body,
      category: args.category,
      usageCount: 0,
      updatedAt: now,
      createdBy: args.actorId,
    })
  },
})

export const importPlugin = internalMutation({
  args: {
    organizationId: v.string(),
    service: pluginServiceValidator,
    secretName: v.string(),
    secretValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", args.organizationId).eq("service", args.service)
      )
      .unique()

    if (existingPlugin) {
      await ctx.db.patch(existingPlugin._id, {
        secretName: args.secretName,
        secretValue: args.secretValue,
      })
      return
    }

    await ctx.db.insert("plugins", {
      organizationId: args.organizationId,
      service: args.service,
      secretName: args.secretName,
      secretValue: args.secretValue,
    })
  },
})
