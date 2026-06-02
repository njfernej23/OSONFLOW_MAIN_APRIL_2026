import { ConvexError, v } from "convex/values"
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

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

  const organizationId = identity.orgId as string | undefined

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

    await ctx.db.patch(args.workflowId, {
      publishedDefinition: definition,
      isActive: true,
      publishedAt: now,
      publishedBy: identity.subject,
      updatedAt: now,
      updatedBy: identity.subject,
    })

    const published = await ctx.db.get(args.workflowId)
    return toWorkflowRecord(published!)
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
