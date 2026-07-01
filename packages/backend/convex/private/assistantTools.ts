import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { ConvexError, v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server"
import { Doc, Id } from "../_generated/dataModel"
import {
  ASSISTANT_TOOL_TYPE_LABELS,
  BUILTIN_ASSISTANT_TOOLS,
  sanitizeAssistantToolName,
} from "../lib/assistantTools"

const assistantToolTypeValidator = v.union(
  v.literal("query"),
  v.literal("handoff"),
  v.literal("resolve"),
  v.literal("google_sheets"),
  v.literal("api_request"),
  v.literal("custom_webhook")
)

const assistantToolParameterValidator = v.object({
  name: v.string(),
  description: v.string(),
  type: v.union(
    v.literal("string"),
    v.literal("number"),
    v.literal("boolean")
  ),
  required: v.boolean(),
})

const assistantToolConfigValidator = v.object({
  knowledgeBaseModel: v.optional(v.string()),
  spreadsheetId: v.optional(v.string()),
  range: v.optional(v.string()),
  operation: v.optional(
    v.union(
      v.literal("lookup"),
      v.literal("append"),
      v.literal("update"),
      v.literal("delete")
    )
  ),
  searchColumns: v.optional(v.array(v.string())),
  valueColumns: v.optional(v.array(v.string())),
  updateColumns: v.optional(v.array(v.string())),
  url: v.optional(v.string()),
  method: v.optional(v.union(v.literal("GET"), v.literal("POST"))),
  headersJson: v.optional(v.string()),
  bodyTemplate: v.optional(v.string()),
  webhookUrl: v.optional(v.string()),
  webhookMethod: v.optional(v.union(v.literal("GET"), v.literal("POST"))),
})

const requireOrganizationId = async (ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
}) => {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const organizationId = getOrganizationIdFromIdentity(identity) as string

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return organizationId
}

const listOrganizationTools = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: string
): Promise<Doc<"assistantTools">[]> => {
  return ctx.db
    .query("assistantTools")
    .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
    .collect()
}

const seedBuiltinTools = async (
  ctx: MutationCtx,
  organizationId: string
): Promise<void> => {
  const existing = await listOrganizationTools(ctx, organizationId)

  const existingBuiltinTypes = new Set(
    existing.filter((tool) => tool.isBuiltin).map((tool) => tool.type)
  )

  const now = Date.now()

  for (const builtin of BUILTIN_ASSISTANT_TOOLS) {
    if (existingBuiltinTypes.has(builtin.type)) {
      continue
    }

    await ctx.db.insert("assistantTools", {
      organizationId,
      name: builtin.name,
      description: builtin.description,
      type: builtin.type,
      isBuiltin: true,
      isEnabled: true,
      enabledForChat: true,
      enabledForVoice: builtin.type === "query",
      parameters: builtin.parameters,
      config:
        builtin.type === "query" ? { knowledgeBaseModel: "gpt-4o-mini" } : undefined,
      sortOrder: builtin.sortOrder,
      updatedAt: now,
    })
  }
}

export const bootstrapBuiltinTools = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const organizationId = await requireOrganizationId(ctx)
    await seedBuiltinTools(ctx, organizationId)
    return null
  },
})

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx): Promise<Doc<"assistantTools">[]> => {
    const organizationId = await requireOrganizationId(ctx)
    const tools = await listOrganizationTools(ctx, organizationId)
    return tools.sort((left, right) => left.sortOrder - right.sortOrder)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    type: assistantToolTypeValidator,
    enabledForChat: v.boolean(),
    enabledForVoice: v.boolean(),
    parameters: v.array(assistantToolParameterValidator),
    config: v.optional(assistantToolConfigValidator),
  },
  returns: v.id("assistantTools"),
  handler: async (ctx, args): Promise<Id<"assistantTools">> => {
    const organizationId = await requireOrganizationId(ctx)

    if (
      args.type === "query" ||
      args.type === "handoff" ||
      args.type === "resolve"
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Built-in assistant tools cannot be created manually.",
      })
    }

    const name = sanitizeAssistantToolName(args.name)
    const existing = await ctx.db
      .query("assistantTools")
      .withIndex("by_organization_id_and_name", (q) =>
        q.eq("organizationId", organizationId).eq("name", name)
      )
      .unique()

    if (existing) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `A tool named "${name}" already exists.`,
      })
    }

    const tools = await ctx.db
      .query("assistantTools")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect()

    return await ctx.db.insert("assistantTools", {
      organizationId,
      name,
      description: args.description.trim(),
      type: args.type,
      isBuiltin: false,
      isEnabled: true,
      enabledForChat: args.enabledForChat,
      enabledForVoice: args.enabledForVoice,
      parameters: args.parameters,
      config: args.config,
      sortOrder: tools.length,
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    toolId: v.id("assistantTools"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    enabledForChat: v.optional(v.boolean()),
    enabledForVoice: v.optional(v.boolean()),
    parameters: v.optional(v.array(assistantToolParameterValidator)),
    config: v.optional(assistantToolConfigValidator),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const organizationId = await requireOrganizationId(ctx)
    const tool = await ctx.db.get(args.toolId)

    if (!tool || tool.organizationId !== organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Assistant tool not found",
      })
    }

    const updates: Partial<Doc<"assistantTools">> = {
      updatedAt: Date.now(),
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim()
    }

    if (args.isEnabled !== undefined) {
      updates.isEnabled = args.isEnabled
    }

    if (args.enabledForChat !== undefined) {
      updates.enabledForChat = args.enabledForChat
    }

    if (args.enabledForVoice !== undefined) {
      updates.enabledForVoice = args.enabledForVoice
    }

    if (args.parameters !== undefined) {
      updates.parameters = args.parameters
    }

    if (args.config !== undefined) {
      updates.config = args.config
    }

    if (args.name !== undefined && !tool.isBuiltin) {
      updates.name = sanitizeAssistantToolName(args.name)
    }

    await ctx.db.patch(args.toolId, updates)
    return null
  },
})

export const remove = mutation({
  args: {
    toolId: v.id("assistantTools"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const organizationId = await requireOrganizationId(ctx)
    const tool = await ctx.db.get(args.toolId)

    if (!tool || tool.organizationId !== organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Assistant tool not found",
      })
    }

    if (tool.isBuiltin) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Built-in assistant tools cannot be deleted.",
      })
    }

    await ctx.db.delete(args.toolId)
    return null
  },
})

export const upsertGoogleSheetsCredentials = mutation({
  args: {
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const organizationId = await requireOrganizationId(ctx)
    const apiKey = args.apiKey.trim()

    if (!apiKey) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Google Sheets API key is required",
      })
    }

    const existing = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", organizationId).eq("service", "google_sheets")
      )
      .unique()

    const secretValue = JSON.stringify({ apiKey })

    if (existing) {
      await ctx.db.patch(existing._id, {
        secretValue,
        secretName: "Google Sheets API key",
      })
      return null
    }

    await ctx.db.insert("plugins", {
      organizationId,
      service: "google_sheets",
      secretName: "Google Sheets API key",
      secretValue,
    })

    return null
  },
})

export const getGoogleSheetsCredentials = query({
  args: {},
  returns: v.object({
    isConfigured: v.boolean(),
  }),
  handler: async (ctx): Promise<{ isConfigured: boolean }> => {
    const organizationId = await requireOrganizationId(ctx)

    const plugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", organizationId).eq("service", "google_sheets")
      )
      .unique()

    return {
      isConfigured: Boolean(plugin?.secretValue),
    }
  },
})

export const getToolTypeLabels = query({
  args: {},
  returns: v.any(),
  handler: async (): Promise<typeof ASSISTANT_TOOL_TYPE_LABELS> => {
    return ASSISTANT_TOOL_TYPE_LABELS
  },
})
