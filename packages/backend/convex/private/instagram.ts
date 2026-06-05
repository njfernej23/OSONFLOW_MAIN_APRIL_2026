import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { action, query } from "../_generated/server"

type InstagramProfileResponse = {
  id?: string
  user_id?: string
  username?: string
  error?: {
    message?: string
  }
}

const DEFAULT_INSTAGRAM_WEBHOOK_BASE_URL =
  "https://sincere-bandicoot-353.eu-west-1.convex.site"

const INSTAGRAM_GRAPH_API_VERSION =
  process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0"

const getAuthContext = async (ctx: {
  auth: { getUserIdentity: () => Promise<any> }
}) => {
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

  return {
    organizationId,
    actorId: identity.subject as string | undefined,
  }
}

const instagramApiUrl = (
  path: string,
  params?: Record<string, string | undefined>
) => {
  const url = new URL(
    `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}/${path.replace(/^\//, "")}`
  )

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

const normalizeBaseUrl = (value?: string) => {
  const trimmed =
    value?.trim() ||
    process.env.INSTAGRAM_WEBHOOK_BASE_URL ||
    process.env.TELEGRAM_WEBHOOK_BASE_URL ||
    DEFAULT_INSTAGRAM_WEBHOOK_BASE_URL

  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)
    return url.toString().replace(/\/$/, "")
  } catch {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Webhook base URL must be a valid URL",
    })
  }
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)

    const integration = await ctx.db
      .query("instagramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique()

    if (!integration) {
      return { integration: null }
    }

    return {
      integration: {
        _id: integration._id,
        _creationTime: integration._creationTime,
        instagramUserId: integration.instagramUserId,
        username: integration.username,
        webhookUrl: integration.webhookUrl,
        verifyToken: integration.verifyToken,
        isEnabled: integration.isEnabled,
        status: integration.status,
        setupError: integration.setupError,
        lastWebhookAt: integration.lastWebhookAt,
        updatedAt: integration.updatedAt,
      },
    }
  },
})

export const connect = action({
  args: {
    accessToken: v.string(),
    instagramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const accessToken = args.accessToken.trim()
    const instagramUserId = args.instagramUserId.trim()

    if (!accessToken || !instagramUserId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Instagram user ID and access token are required",
      })
    }

    const profileResponse = await fetch(
      instagramApiUrl(instagramUserId, {
        fields: "user_id,username",
        access_token: accessToken,
      })
    )
    const profile = (await profileResponse.json()) as InstagramProfileResponse

    if (!profileResponse.ok || profile.error || !profile.user_id) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          profile.error?.message ||
          "Invalid Instagram account ID or access token",
      })
    }

    const { integrationId, webhookSecret, verifyToken } =
      (await ctx.runMutation(
        (internal as any).system.instagram.upsertIntegration,
        {
          organizationId,
          actorId,
          accessToken,
          instagramUserId: profile.user_id,
          username: profile.username,
        }
      )) as {
        integrationId: string
        webhookSecret: string
        verifyToken: string
      }

    const webhookBaseUrl = normalizeBaseUrl()

    if (!webhookBaseUrl) {
      await ctx.runMutation(
        (internal as any).system.instagram.markIntegrationSetup,
        {
          integrationId,
          organizationId,
          status: "needs_webhook_url",
        }
      )

      return {
        integrationId,
        username: profile.username,
        status: "needs_webhook_url" as const,
        verifyToken,
      }
    }

    const webhookUrl = `${webhookBaseUrl}/instagram/webhook/${webhookSecret}`

    await ctx.runMutation(
      (internal as any).system.instagram.markIntegrationSetup,
      {
        integrationId,
        organizationId,
        status: "connected",
        webhookUrl,
      }
    )

    return {
      integrationId,
      username: profile.username,
      status: "connected" as const,
      webhookUrl,
      verifyToken,
    }
  },
})

export const disconnect = action({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const integration = await ctx.runQuery(
      (internal as any).system.instagram.getIntegrationByOrganizationId,
      {
        organizationId,
      }
    )

    if (!integration) {
      return { removed: false }
    }

    await ctx.runMutation(
      (internal as any).system.instagram.removeIntegration,
      {
        integrationId: integration._id,
        organizationId,
      }
    )

    return { removed: true }
  },
})
