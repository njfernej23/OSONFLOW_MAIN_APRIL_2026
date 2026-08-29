import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { ConvexError, v } from "convex/values"
import {
  action,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "../_generated/server"
import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import {
  asBoolean,
  asString,
  buildKbQuery,
  buildPromptInstructions,
  getOutputVariableKey,
  isRecord,
  type RuntimeVariables,
} from "../lib/workflowEngine"
import {
  generatePromptReply,
  searchKnowledgeBase,
} from "../lib/workflowAiGeneration"
import { runApiStep } from "../lib/workflowApiStep"
import { exitMessages, runAgentTurn } from "../lib/workflowAgentTurn"
import { buildToolArgs } from "../system/workflowToolSteps"
import { OPENAI_CHAT_MODEL } from "../lib/openai"

const PRESENCE_STALE_MS = 45_000
const PRESENCE_CLEANUP_MS = 5 * 60_000
const PRESENCE_COLORS = [
  "#c43d61",
  "#315bdc",
  "#21845f",
  "#a855c5",
  "#c98719",
  "#0f766e",
] as const

type JsonRecord = Record<string, unknown>

type WorkflowNodeDefinition = JsonRecord & {
  id: string
  data?: JsonRecord
}

type WorkflowEdgeDefinition = JsonRecord & {
  id: string
  data?: JsonRecord | null
}

type StoredWorkflowDefinition = {
  schemaVersion: number
  id?: string
  name: string
  description?: string
  nodes: WorkflowNodeDefinition[]
  edges: WorkflowEdgeDefinition[]
}

const workflowDefinitionValidator = v.object({
  schemaVersion: v.number(),
  id: v.optional(v.string()),
  name: v.string(),
  description: v.optional(v.string()),
  nodes: v.array(v.any()),
  edges: v.array(v.any()),
})

const getOrganizationIdentity = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const organizationId = getOrganizationIdFromIdentity(identity)

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return { identity, organizationId }
}

const normalizeName = (name: string) => {
  const trimmed = name.trim()
  return trimmed || "Untitled workflow"
}

const normalizeDescription = (description?: string | null) => {
  const trimmed = description?.trim()
  return trimmed ? trimmed : undefined
}

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "?"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

const colorFromUserId = (userId: string) => {
  let hash = 0

  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % PRESENCE_COLORS.length
  }

  return PRESENCE_COLORS[hash] ?? PRESENCE_COLORS[0]
}

const assertWorkflowAccess = async (
  ctx: QueryCtx | MutationCtx,
  workflowId: Id<"workflows">,
  organizationId: string
) => {
  const workflow = await ctx.db.get(workflowId)

  if (!workflow || workflow.organizationId !== organizationId) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Workflow not found",
    })
  }

  return workflow
}

const toWorkflowRecord = (workflow: {
  _id: string
  name: string
  description?: string
  definition: unknown
  publishedDefinition?: unknown
  isActive?: boolean
  publishedAt?: number
  publishedBy?: string
  createdAt: number
  updatedAt: number
  updatedBy?: string
}) => ({
  id: workflow._id,
  name: workflow.name,
  description: workflow.description ?? null,
  definition: workflow.definition,
  publishedDefinition: workflow.publishedDefinition ?? null,
  isActive: workflow.isActive ?? false,
  publishedAt: workflow.publishedAt ?? null,
  publishedBy: workflow.publishedBy ?? null,
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
  updatedBy: workflow.updatedBy,
})

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const isJsonRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeJsonForCompare = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonForCompare)
  }

  if (!isJsonRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, normalizeJsonForCompare(value[key])])
  )
}

const stableSerialize = (value: unknown) =>
  JSON.stringify(normalizeJsonForCompare(value))

const valuesEqual = (a: unknown, b: unknown) =>
  stableSerialize(a) === stableSerialize(b)

const mergeRecordFields = (
  base: JsonRecord,
  local: JsonRecord,
  remote: JsonRecord
) => {
  const next: JsonRecord = { ...remote }
  const keys = new Set([...Object.keys(base), ...Object.keys(local)])

  for (const key of keys) {
    if (!valuesEqual(local[key], base[key])) {
      if (local[key] === undefined) {
        delete next[key]
      } else {
        next[key] = local[key]
      }
    }
  }

  return next
}

const mergeStructuredValue = (
  base: unknown,
  local: unknown,
  remote: unknown
) => {
  if (isJsonRecord(base) && isJsonRecord(local) && isJsonRecord(remote)) {
    return mergeRecordFields(base, local, remote)
  }

  return valuesEqual(local, base) ? remote : local
}

const mergeNodeDefinition = (
  base: WorkflowNodeDefinition,
  local: WorkflowNodeDefinition,
  remote: WorkflowNodeDefinition
): WorkflowNodeDefinition => {
  const merged = mergeRecordFields(
    base,
    local,
    remote
  ) as WorkflowNodeDefinition
  merged.id = local.id

  if (
    isJsonRecord(base.data) &&
    isJsonRecord(local.data) &&
    isJsonRecord(remote.data)
  ) {
    merged.data = mergeRecordFields(base.data, local.data, remote.data)
  }

  return merged
}

const mergeEdgeDefinition = (
  base: WorkflowEdgeDefinition,
  local: WorkflowEdgeDefinition,
  remote: WorkflowEdgeDefinition
): WorkflowEdgeDefinition => {
  const merged = mergeRecordFields(
    base,
    local,
    remote
  ) as WorkflowEdgeDefinition
  const mergedData = mergeStructuredValue(
    base.data ?? null,
    local.data ?? null,
    remote.data ?? null
  )

  merged.id = local.id
  merged.data = mergedData as JsonRecord | null

  return merged
}

const mapById = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]))

const mergeDefinitionItems = <T extends { id: string }>(
  baseItems: T[],
  localItems: T[],
  remoteItems: T[],
  mergeItem: (base: T, local: T, remote: T) => T
) => {
  const baseById = mapById(baseItems)
  const localById = mapById(localItems)
  const remoteById = mapById(remoteItems)
  const orderedIds = Array.from(
    new Set([
      ...remoteItems.map((item) => item.id),
      ...localItems.map((item) => item.id),
    ])
  )
  const merged: T[] = []

  for (const id of orderedIds) {
    const baseItem = baseById.get(id)
    const localItem = localById.get(id)
    const remoteItem = remoteById.get(id)

    if (!localItem) {
      if (!baseItem && remoteItem) {
        merged.push(remoteItem)
      }
      continue
    }

    if (!remoteItem) {
      if (!baseItem) {
        merged.push(localItem)
      }
      continue
    }

    if (!baseItem) {
      merged.push(localItem)
      continue
    }

    const localChanged = !valuesEqual(localItem, baseItem)
    const remoteChanged = !valuesEqual(remoteItem, baseItem)

    if (localChanged && remoteChanged) {
      merged.push(mergeItem(baseItem, localItem, remoteItem))
    } else {
      merged.push(localChanged ? localItem : remoteItem)
    }
  }

  return merged
}

const removeDanglingEdges = (
  edges: WorkflowEdgeDefinition[],
  nodes: WorkflowNodeDefinition[]
) => {
  const nodeIds = new Set(nodes.map((node) => node.id))

  return edges.filter(
    (edge) =>
      typeof edge.source === "string" &&
      typeof edge.target === "string" &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target)
  )
}

const withWorkflowMetadata = (
  workflowId: Id<"workflows"> | undefined,
  name: string,
  description: string | undefined,
  definition: StoredWorkflowDefinition
): StoredWorkflowDefinition => {
  const next = cloneJson(definition)
  next.name = name
  next.nodes = Array.isArray(next.nodes) ? next.nodes : []
  next.edges = Array.isArray(next.edges) ? next.edges : []

  if (workflowId) {
    next.id = workflowId
  } else {
    delete next.id
  }

  if (description) {
    next.description = description
  } else {
    delete next.description
  }

  return next
}

const mergeWorkflowDefinitions = (
  base: StoredWorkflowDefinition,
  local: StoredWorkflowDefinition,
  remote: StoredWorkflowDefinition
): StoredWorkflowDefinition => {
  const description = !valuesEqual(
    local.description ?? null,
    base.description ?? null
  )
    ? local.description
    : remote.description
  const nodes = mergeDefinitionItems(
    base.nodes,
    local.nodes,
    remote.nodes,
    mergeNodeDefinition
  )
  const edges = removeDanglingEdges(
    mergeDefinitionItems(
      base.edges,
      local.edges,
      remote.edges,
      mergeEdgeDefinition
    ),
    nodes
  )

  const merged: StoredWorkflowDefinition = {
    schemaVersion:
      local.schemaVersion || remote.schemaVersion || base.schemaVersion,
    id: local.id ?? remote.id ?? base.id,
    name: !valuesEqual(local.name, base.name) ? local.name : remote.name,
    nodes,
    edges,
  }

  if (description) {
    merged.description = description
  }

  return merged
}

const upsertPresence = async (
  ctx: MutationCtx,
  args: {
    workflowId: Id<"workflows">
    cursorX?: number
    cursorY?: number
    selectedNodeId?: string | null
  },
  organizationId: string,
  identity: NonNullable<
    Awaited<ReturnType<MutationCtx["auth"]["getUserIdentity"]>>
  >
) => {
  const now = Date.now()
  const name =
    identity.name ?? identity.email ?? identity.nickname ?? "Team member"
  const existing = await ctx.db
    .query("workflowPresence")
    .withIndex("by_workflow_id_and_user_id", (q) =>
      q.eq("workflowId", args.workflowId).eq("userId", identity.subject)
    )
    .unique()

  const cursor =
    args.cursorX === undefined || args.cursorY === undefined
      ? {}
      : {
          cursorX: args.cursorX,
          cursorY: args.cursorY,
        }
  const selection =
    args.selectedNodeId === undefined
      ? {}
      : { selectedNodeId: args.selectedNodeId ?? undefined }
  const payload = {
    organizationId,
    workflowId: args.workflowId,
    userId: identity.subject,
    name,
    initials: initialsFromName(name),
    imageUrl: identity.pictureUrl,
    color: colorFromUserId(identity.subject),
    lastSeenAt: now,
    ...cursor,
    ...selection,
  }

  if (existing) {
    await ctx.db.patch(existing._id, payload)
  } else {
    await ctx.db.insert("workflowPresence", payload)
  }

  return now
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getOrganizationIdentity(ctx)

    const workflows = await ctx.db
      .query("workflows")
      .withIndex("by_organization_id_and_updated_at", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .collect()

    return workflows.map((workflow) => ({
      id: workflow._id,
      name: workflow.name,
      description: workflow.description ?? null,
      updatedAt: workflow.updatedAt,
      isActive: workflow.isActive ?? false,
      publishedAt: workflow.publishedAt ?? null,
    }))
  },
})

export const listComponentCandidates = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("workflows"),
      name: v.string(),
      isPublished: v.boolean(),
      publishedAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const { organizationId } = await getOrganizationIdentity(ctx)

    const workflows = await ctx.db
      .query("workflows")
      .withIndex("by_organization_id_and_updated_at", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .collect()

    return workflows.map((workflow) => ({
      id: workflow._id,
      name: workflow.name,
      isPublished: Boolean(workflow.publishedDefinition),
      publishedAt: workflow.publishedAt ?? null,
    }))
  },
})

/** Published snapshot of a component, for the builder's Run panel. */
export const getPublishedDefinition = query({
  args: {
    workflowId: v.id("workflows"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const { organizationId } = await getOrganizationIdentity(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow || workflow.organizationId !== organizationId) {
      return null
    }

    return workflow.publishedDefinition ?? null
  },
})

export const get = query({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getOrganizationIdentity(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow || workflow.organizationId !== organizationId) {
      return null
    }

    return toWorkflowRecord(workflow)
  },
})

export const listPresence = query({
  args: {
    workflowId: v.id("workflows"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    await assertWorkflowAccess(ctx, args.workflowId, organizationId)

    const cutoff = args.now - PRESENCE_STALE_MS
    const presence = await ctx.db
      .query("workflowPresence")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .collect()

    return presence
      .filter((member) => member.lastSeenAt >= cutoff)
      .sort((a, b) => {
        if (a.userId === identity.subject) return -1
        if (b.userId === identity.subject) return 1
        return b.lastSeenAt - a.lastSeenAt
      })
      .map((member) => ({
        userId: member.userId,
        name: member.name,
        initials: member.initials,
        imageUrl: member.imageUrl,
        color: member.color,
        cursor:
          member.cursorX === undefined || member.cursorY === undefined
            ? null
            : {
                x: member.cursorX,
                y: member.cursorY,
              },
        selectedNodeId: member.selectedNodeId ?? null,
        isSelf: member.userId === identity.subject,
      }))
  },
})

export const heartbeatPresence = mutation({
  args: {
    workflowId: v.id("workflows"),
    cursorX: v.optional(v.number()),
    cursorY: v.optional(v.number()),
    selectedNodeId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    await assertWorkflowAccess(ctx, args.workflowId, organizationId)

    const now = await upsertPresence(ctx, args, organizationId, identity)

    const staleCutoff = now - PRESENCE_CLEANUP_MS
    const staleMembers = await ctx.db
      .query("workflowPresence")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .filter((q) => q.lt(q.field("lastSeenAt"), staleCutoff))
      .collect()

    await Promise.all(staleMembers.map((member) => ctx.db.delete(member._id)))
  },
})

export const movePresenceCursor = mutation({
  args: {
    workflowId: v.id("workflows"),
    cursorX: v.number(),
    cursorY: v.number(),
    selectedNodeId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    await assertWorkflowAccess(ctx, args.workflowId, organizationId)

    await upsertPresence(ctx, args, organizationId, identity)
  },
})

/**
 * Best-effort removal when a tab closes or the builder unmounts. Without it a
 * ghost avatar lingers until the stale cutoff, which readers notice.
 */
export const leavePresence = mutation({
  args: {
    workflowId: v.id("workflows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    await assertWorkflowAccess(ctx, args.workflowId, organizationId)

    const existing = await ctx.db
      .query("workflowPresence")
      .withIndex("by_workflow_id_and_user_id", (q) =>
        q.eq("workflowId", args.workflowId).eq("userId", identity.subject)
      )
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    return null
  },
})

export const syncLive = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    definition: workflowDefinitionValidator,
    baseDefinition: workflowDefinitionValidator,
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    const now = Date.now()
    const name = normalizeName(args.name)
    const description = normalizeDescription(args.description)
    const existing = await assertWorkflowAccess(
      ctx,
      args.workflowId,
      organizationId
    )
    const currentDefinition = withWorkflowMetadata(
      args.workflowId,
      existing.name,
      existing.description,
      existing.definition as StoredWorkflowDefinition
    )
    const baseDefinition = withWorkflowMetadata(
      args.workflowId,
      normalizeName(args.baseDefinition.name),
      normalizeDescription(args.baseDefinition.description),
      args.baseDefinition as StoredWorkflowDefinition
    )
    const localDefinition = withWorkflowMetadata(
      args.workflowId,
      name,
      description,
      args.definition as StoredWorkflowDefinition
    )
    const mergedDefinition = mergeWorkflowDefinitions(
      baseDefinition,
      localDefinition,
      currentDefinition
    )
    const mergedName = normalizeName(mergedDefinition.name)
    const mergedDescription = normalizeDescription(mergedDefinition.description)
    const definition = withWorkflowMetadata(
      args.workflowId,
      mergedName,
      mergedDescription,
      mergedDefinition
    )

    await ctx.db.patch(args.workflowId, {
      name: mergedName,
      description: mergedDescription,
      definition,
      updatedAt: now,
      updatedBy: identity.subject,
    })

    const updated = await ctx.db.get(args.workflowId)
    return toWorkflowRecord(updated!)
  },
})

export const save = mutation({
  args: {
    workflowId: v.optional(v.id("workflows")),
    name: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    definition: workflowDefinitionValidator,
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    const now = Date.now()
    const name = normalizeName(args.name)
    const description = normalizeDescription(args.description)
    const definition = withWorkflowMetadata(
      args.workflowId,
      name,
      description,
      args.definition as StoredWorkflowDefinition
    )

    if (args.workflowId) {
      const existing = await ctx.db.get(args.workflowId)

      if (!existing || existing.organizationId !== organizationId) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        })
      }

      await ctx.db.patch(args.workflowId, {
        name,
        description,
        definition,
        updatedAt: now,
        updatedBy: identity.subject,
      })

      const updated = await ctx.db.get(args.workflowId)
      return toWorkflowRecord(updated!)
    }

    const workflowId = await ctx.db.insert("workflows", {
      organizationId,
      name,
      description,
      definition,
      createdAt: now,
      updatedAt: now,
      createdBy: identity.subject,
      updatedBy: identity.subject,
    })

    await ctx.db.patch(workflowId, {
      definition: withWorkflowMetadata(
        workflowId,
        name,
        description,
        args.definition as StoredWorkflowDefinition
      ),
    })

    const created = await ctx.db.get(workflowId)
    return toWorkflowRecord(created!)
  },
})

export const publish = mutation({
  args: {
    workflowId: v.id("workflows"),
    /**
     * Whether this becomes the org's live workflow. Components are published
     * with activate:false so they get a runnable snapshot without taking
     * activation away from the flow that actually answers conversations.
     */
    activate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    const now = Date.now()
    const workflow = await assertWorkflowAccess(
      ctx,
      args.workflowId,
      organizationId
    )
    const definition = withWorkflowMetadata(
      args.workflowId,
      workflow.name,
      workflow.description,
      workflow.definition as StoredWorkflowDefinition
    )

    const activate = args.activate ?? true

    if (activate) {
      const activeWorkflows = await ctx.db
        .query("workflows")
        .withIndex("by_organization_id_and_active", (q) =>
          q.eq("organizationId", organizationId).eq("isActive", true)
        )
        .collect()

      await Promise.all(
        activeWorkflows
          .filter((activeWorkflow) => activeWorkflow._id !== args.workflowId)
          .map((activeWorkflow) =>
            ctx.db.patch(activeWorkflow._id, {
              isActive: false,
              updatedAt: now,
              updatedBy: identity.subject,
            })
          )
      )
    }

    await ctx.db.patch(args.workflowId, {
      publishedDefinition: definition,
      ...(activate ? { isActive: true } : {}),
      publishedAt: now,
      publishedBy: identity.subject,
      updatedAt: now,
      updatedBy: identity.subject,
    })

    const published = await ctx.db.get(args.workflowId)
    return toWorkflowRecord(published!)
  },
})

export const rename = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    const workflow = await assertWorkflowAccess(
      ctx,
      args.workflowId,
      organizationId
    )
    const now = Date.now()
    const name = normalizeName(args.name)

    await ctx.db.patch(args.workflowId, {
      name,
      // The name is mirrored inside the stored definition.
      definition: withWorkflowMetadata(
        args.workflowId,
        name,
        workflow.description,
        workflow.definition as StoredWorkflowDefinition
      ),
      updatedAt: now,
      updatedBy: identity.subject,
    })

    const renamed = await ctx.db.get(args.workflowId)
    return toWorkflowRecord(renamed!)
  },
})

export const duplicate = mutation({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    const workflow = await assertWorkflowAccess(
      ctx,
      args.workflowId,
      organizationId
    )
    const now = Date.now()
    const name = normalizeName(`${workflow.name} copy`)

    // A copy is never live and carries no published snapshot: publishing is a
    // deliberate act on the copy itself.
    const copyId = await ctx.db.insert("workflows", {
      organizationId,
      name,
      description: workflow.description,
      definition: withWorkflowMetadata(
        undefined,
        name,
        workflow.description,
        cloneJson(workflow.definition) as StoredWorkflowDefinition
      ),
      createdAt: now,
      updatedAt: now,
      createdBy: identity.subject,
      updatedBy: identity.subject,
    })

    await ctx.db.patch(copyId, {
      definition: withWorkflowMetadata(
        copyId,
        name,
        workflow.description,
        cloneJson(workflow.definition) as StoredWorkflowDefinition
      ),
    })

    const created = await ctx.db.get(copyId)
    return toWorkflowRecord(created!)
  },
})

export const remove = mutation({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getOrganizationIdentity(ctx)
    const workflow = await assertWorkflowAccess(
      ctx,
      args.workflowId,
      organizationId
    )

    // Deleting the live workflow would strand conversations mid-run.
    if (workflow.isActive) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Deactivate this workflow before deleting it.",
      })
    }

    const sessions = await ctx.db
      .query("workflowSessions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect()

    await Promise.all(
      sessions
        .filter((session) => session.workflowId === args.workflowId)
        .map((session) => ctx.db.delete(session._id))
    )

    const presence = await ctx.db
      .query("workflowPresence")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .collect()

    await Promise.all(presence.map((entry) => ctx.db.delete(entry._id)))
    await ctx.db.delete(args.workflowId)

    return { deleted: true }
  },
})

export const deactivate = mutation({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const { identity, organizationId } = await getOrganizationIdentity(ctx)
    const now = Date.now()
    await assertWorkflowAccess(ctx, args.workflowId, organizationId)

    await ctx.db.patch(args.workflowId, {
      isActive: false,
      updatedAt: now,
      updatedBy: identity.subject,
    })

    const deactivated = await ctx.db.get(args.workflowId)
    return toWorkflowRecord(deactivated!)
  },
})

/**
 * Run one AI step exactly the way a published workflow would, so the builder's
 * Run panel tests the real model instead of echoing the step's own
 * instructions back as the reply.
 */
export const previewAiStep = action({
  args: {
    nodeType: v.string(),
    data: v.any(),
    variables: v.any(),
  },
  returns: v.object({
    text: v.string(),
    outputVariable: v.string(),
    sendMessage: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      })
    }

    const organizationId = getOrganizationIdFromIdentity(identity)

    if (!organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const data = isRecord(args.data) ? args.data : {}
    const variables = (
      isRecord(args.variables) ? args.variables : {}
    ) as RuntimeVariables
    const type = asString(args.nodeType)

    const openAIPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      {
        organizationId,
        service: "openai_realtime",
      }
    )
    const secretValue = openAIPlugin?.secretValue

    if (type === "kbSearch") {
      const text = await searchKnowledgeBase(ctx, {
        organizationId,
        query: buildKbQuery(data, variables),
        secretValue,
      })

      return {
        text,
        outputVariable: getOutputVariableKey(data, "kbAnswer"),
        sendMessage: asBoolean(data.sendAsMessage, true),
      }
    }

    const text = await generatePromptReply(ctx, {
      organizationId,
      instructions: buildPromptInstructions(data, variables),
      useKnowledgeBase: asBoolean(
        data.useKnowledgeBase,
        type === "playbook" || type === "agent" || type === "operator"
      ),
      variables,
      chatModel: OPENAI_CHAT_MODEL,
      secretValue,
    })

    return {
      text,
      outputVariable: getOutputVariableKey(data, "lastAiResponse"),
      sendMessage: true,
    }
  },
})

/**
 * One Agent-node turn for the builder's Run panel.
 *
 * Returns the reply, the exit the agent chose, any quick replies it offered and
 * the variables it collected, so the panel can route the run exactly the way a
 * published conversation would.
 */
export const previewAgentTurn = action({
  args: {
    data: v.any(),
    variables: v.any(),
  },
  returns: v.object({
    reply: v.string(),
    exitId: v.union(v.string(), v.null()),
    exitName: v.union(v.string(), v.null()),
    exitMessages: v.array(v.string()),
    action: v.union(
      v.literal("continue"),
      v.literal("end"),
      v.literal("callForward")
    ),
    buttons: v.array(v.object({ id: v.string(), label: v.string() })),
    variables: v.any(),
    toolCalls: v.array(v.object({ name: v.string(), result: v.string() })),
    blockedExitId: v.union(v.string(), v.null()),
    hasExits: v.boolean(),
    outputVariable: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const organizationId = identity
      ? getOrganizationIdFromIdentity(identity)
      : null

    if (!identity || !organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const data = isRecord(args.data) ? args.data : {}
    const variables = (
      isRecord(args.variables) ? args.variables : {}
    ) as RuntimeVariables

    const openAIPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      { organizationId, service: "openai_realtime" }
    )

    const result = await runAgentTurn(ctx, {
      organizationId,
      data,
      variables,
      secretValue: openAIPlugin?.secretValue,
      executeTool: async (toolName, toolArgs) =>
        await ctx.runAction(
          internal.system.assistantTools.execute.executeTool,
          {
            organizationId,
            toolName,
            args: toolArgs,
            channel: "chat",
          }
        ),
    })

    const exits = Array.isArray(data.exitConditions)
      ? data.exitConditions.filter(isRecord)
      : []
    const chosen = result.exitId
      ? exits.find((exit) => asString(exit.id) === result.exitId)
      : undefined

    return {
      ...result,
      exitName: chosen ? asString(chosen.name) || "Exit" : null,
      exitMessages: result.exitId
        ? exitMessages(data, result.exitId, {
            ...variables,
            ...result.variables,
          })
        : [],
      outputVariable: getOutputVariableKey(data, "lastAiResponse"),
    }
  },
})

/**
 * Drafts system instructions for an Agent node from its name, so the editor's
 * "generate" link has something real behind it.
 */
export const generateAgentInstructions = action({
  args: {
    agentName: v.string(),
    hint: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity()
    const organizationId = identity
      ? getOrganizationIdFromIdentity(identity)
      : null

    if (!identity || !organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const openAIPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      { organizationId, service: "openai_realtime" }
    )

    const name = args.agentName.trim() || "support agent"
    const hint = (args.hint ?? "").trim()

    const text = await generatePromptReply(ctx, {
      organizationId,
      instructions: [
        `Write the system instructions for an AI agent named "${name}" that runs inside a customer support workflow.`,
        hint ? `Build on this draft rather than replacing it:\n${hint}` : "",
        "Write it in second person, addressed to the agent. Two or three short paragraphs.",
        "Say what it is responsible for, what it must collect or confirm, and what it must never do.",
        "Return only the instructions, with no preamble and no markdown headings.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      variables: {},
      useKnowledgeBase: false,
      chatModel: OPENAI_CHAT_MODEL,
      secretValue: openAIPlugin?.secretValue,
    })

    return text.trim()
  },
})

/**
 * Run one API step for the builder's Run panel, through the same executor the
 * published runtime uses.
 */
export const previewApiStep = action({
  args: {
    data: v.any(),
    variables: v.any(),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.number(),
    variables: v.any(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Gate on org identity: this action performs an outbound request with a
    // caller-supplied URL, so it must never be reachable unauthenticated.
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null || !getOrganizationIdFromIdentity(identity)) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const result = await runApiStep(
      isRecord(args.data) ? args.data : {},
      (isRecord(args.variables) ? args.variables : {}) as RuntimeVariables
    )

    return {
      ok: result.ok,
      status: result.status,
      variables: result.variables,
      error: result.error,
    }
  },
})

/**
 * Run one JavaScript step for the builder's Run panel, in the same sandbox the
 * published runtime uses.
 */
export const previewJsStep = action({
  args: {
    code: v.string(),
    variables: v.any(),
  },
  returns: v.object({
    ok: v.boolean(),
    variables: v.any(),
    logs: v.array(v.string()),
    next: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  // Explicit annotation: the handler references `internal`, which includes this
  // module, so inference would be circular.
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean
    variables: unknown
    logs: string[]
    next?: string
    error?: string
  }> => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null || !getOrganizationIdFromIdentity(identity)) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    return await ctx.runAction(internal.system.workflowJsSteps.runSnippet, {
      code: args.code,
      variables: isRecord(args.variables) ? args.variables : {},
    })
  },
})

/**
 * Run one Tool step for the builder's Run panel, through the same assistant
 * tool executor the published runtime and the AI agent use.
 */
export const previewToolStep = action({
  args: {
    data: v.any(),
    variables: v.any(),
  },
  returns: v.object({
    ok: v.boolean(),
    result: v.string(),
    outputVariable: v.string(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean
    result: string
    outputVariable: string
    error?: string
  }> => {
    const identity = await ctx.auth.getUserIdentity()
    const organizationId = identity
      ? getOrganizationIdFromIdentity(identity)
      : null

    if (!identity || !organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const data = isRecord(args.data) ? args.data : {}
    const variables = (
      isRecord(args.variables) ? args.variables : {}
    ) as RuntimeVariables
    const toolName = asString(data.toolName).trim()
    const outputVariable = asString(data.outputVariable).trim() || "toolResult"

    if (!toolName) {
      return {
        ok: false,
        result: "",
        outputVariable,
        error: "This Tool step has no tool selected.",
      }
    }

    try {
      // No threadId in a builder preview: handoff/resolve tools report that
      // themselves rather than mutating a real conversation.
      const result: string = await ctx.runAction(
        internal.system.assistantTools.execute.executeTool,
        {
          organizationId,
          toolName,
          args: buildToolArgs(data, variables),
          channel: "chat",
        }
      )

      const unavailable = /is not available\.$/.test(result.trim())

      return {
        ok: !unavailable,
        result,
        outputVariable,
        error: unavailable ? result : undefined,
      }
    } catch (error) {
      return {
        ok: false,
        result: "",
        outputVariable,
        error: error instanceof Error ? error.message : "Tool step failed.",
      }
    }
  },
})
