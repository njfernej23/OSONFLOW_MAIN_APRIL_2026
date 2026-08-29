import { ConvexError } from "convex/values"

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import rag from "../system/ai/rag"

/**
 * First-run guide.
 *
 * A new organization lands on /start rather than in analytics, and this module
 * answers the two questions that page needs: which setup steps are genuinely
 * done (read from real data, never from a checkbox the user ticked), and
 * whether the guide should still be shown at all.
 */

const DEFAULT_AGENT_ID = "default"

export type OnboardingStepId =
  | "ai-key"
  | "knowledge"
  | "widget"
  | "install"
  | "conversation"

const getAuthContext = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
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

  return { organizationId, actorId: identity.subject as string | undefined }
}

const countKnowledgeEntries = async (ctx: QueryCtx, organizationId: string) => {
  const namespace = await rag.getNamespace(ctx, { namespace: organizationId })

  if (!namespace) {
    return 0
  }

  // Only the first page matters: the guide needs "is there anything here yet",
  // not an exact total, and an org can have thousands of entries.
  const results = await rag.list(ctx, {
    namespaceId: namespace.namespaceId,
    paginationOpts: { numItems: 10, cursor: null },
  })

  return results.page.length
}

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)

    const [
      openAIPlugin,
      knowledgeCount,
      widgetSettings,
      firstContactSession,
      firstConversation,
    ] = await Promise.all([
      ctx.db
        .query("plugins")
        .withIndex("by_organization_id_and_service", (q) =>
          q.eq("organizationId", organizationId).eq("service", "openai_realtime")
        )
        .unique(),
      countKnowledgeEntries(ctx, organizationId),
      ctx.db
        .query("widgetSettings")
        .withIndex("by_organization_id_and_agent_id", (q) =>
          q.eq("organizationId", organizationId).eq("agentId", DEFAULT_AGENT_ID)
        )
        .first(),
      ctx.db
        .query("contactSessions")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", organizationId)
        )
        .first(),
      ctx.db
        .query("conversations")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", organizationId)
        )
        .first(),
    ])

    const onboarding = await ctx.db
      .query("organizationOnboarding")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique()

    // A widget row is created automatically at v1, so its existence proves
    // nothing. Someone having saved a draft or published again does.
    const hasCustomizedWidget = Boolean(
      widgetSettings &&
        (widgetSettings.draftUpdatedAt !== undefined ||
          (widgetSettings.publishedVersion ?? 1) > 1)
    )

    const steps = [
      {
        id: "ai-key" as const,
        done: Boolean(openAIPlugin?.secretValue),
        detail: openAIPlugin?.secretValue
          ? "Key saved"
          : "No key yet",
      },
      {
        id: "knowledge" as const,
        done: knowledgeCount > 0,
        detail:
          knowledgeCount === 0
            ? "Nothing added yet"
            : knowledgeCount >= 10
              ? "10+ sources added"
              : `${knowledgeCount} source${knowledgeCount === 1 ? "" : "s"} added`,
      },
      {
        id: "widget" as const,
        done: hasCustomizedWidget,
        detail: hasCustomizedWidget
          ? `Published v${widgetSettings?.publishedVersion ?? 1}`
          : "Still on the defaults",
      },
      {
        id: "install" as const,
        done: Boolean(firstContactSession),
        detail: firstContactSession
          ? "A visitor has opened it"
          : "No visitors yet",
      },
      {
        id: "conversation" as const,
        done: Boolean(firstConversation),
        detail: firstConversation
          ? "First conversation received"
          : "Waiting for the first one",
      },
    ]

    const completedCount = steps.filter((step) => step.done).length
    const hasFinishedGuide = Boolean(
      onboarding?.completedAt || onboarding?.skippedAt
    )

    return {
      steps,
      completedCount,
      totalCount: steps.length,
      isSetupComplete: completedCount === steps.length,
      hasFinishedGuide,
      // The dashboard sends people to the guide only until they have seen it
      // through or chosen to skip it; it never re-appears on its own.
      shouldShowGuideFirst: !hasFinishedGuide,
      completedAt: onboarding?.completedAt,
      skippedAt: onboarding?.skippedAt,
    }
  },
})

const upsertOnboarding = async (
  ctx: MutationCtx,
  organizationId: string,
  actorId: string | undefined,
  patch: { completedAt?: number; skippedAt?: number }
) => {
  const existing = await ctx.db
    .query("organizationOnboarding")
    .withIndex("by_organization_id", (q) =>
      q.eq("organizationId", organizationId)
    )
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, { ...patch, actorId })
    return
  }

  await ctx.db.insert("organizationOnboarding", {
    organizationId,
    startedAt: Date.now(),
    actorId,
    ...patch,
  })
}

/** Marks the guide finished so the dashboard stops redirecting here. */
export const finish = mutation({
  args: {},
  handler: async (ctx) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    await upsertOnboarding(ctx, organizationId, actorId, {
      completedAt: Date.now(),
      skippedAt: undefined,
    })
  },
})

/** "I'll do this later" — same effect, recorded separately. */
export const skip = mutation({
  args: {},
  handler: async (ctx) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    await upsertOnboarding(ctx, organizationId, actorId, {
      skippedAt: Date.now(),
    })
  },
})
