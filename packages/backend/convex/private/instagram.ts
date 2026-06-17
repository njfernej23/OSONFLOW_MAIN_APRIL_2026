import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import {
  buildInstagramAuthorizationUrl,
  exchangeInstagramCodeForToken,
  getInstagramOAuthConfig,
} from "../lib/instagramOAuth"
import { getWebhookBaseUrl } from "../lib/webhookBaseUrl"
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

type InstagramSenderProfileResponse = {
  name?: string
  username?: string
  profile_pic?: string
  follower_count?: number
  error?: {
    message?: string
  }
}

type ConnectInstagramResult = {
  integrationId: string
  username?: string
  status: "connected" | "needs_webhook_url"
  webhookUrl?: string
  verifyToken: string
}

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

  const organizationId = getOrganizationIdFromIdentity(identity)

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

const fetchInstagramProfile = async ({
  accessToken,
  instagramUserId,
}: {
  accessToken: string
  instagramUserId: string
}) => {
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

  return {
    instagramUserId: profile.user_id,
    username: profile.username,
  }
}

const finalizeInstagramConnection = async (
  ctx: { runMutation: (reference: any, args: any) => Promise<any> },
  {
    organizationId,
    actorId,
    accessToken,
    instagramUserId,
    username,
  }: {
    organizationId: string
    actorId?: string
    accessToken: string
    instagramUserId: string
    username?: string
  }
): Promise<ConnectInstagramResult> => {
  const { integrationId, webhookSecret, verifyToken } =
    (await ctx.runMutation(
      (internal as any).system.instagram.upsertIntegration,
      {
        organizationId,
        actorId,
        accessToken,
        instagramUserId,
        username,
      }
    )) as {
      integrationId: string
      webhookSecret: string
      verifyToken: string
    }

  const webhookBaseUrl = getWebhookBaseUrl("INSTAGRAM_WEBHOOK_BASE_URL")

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
      username,
      status: "needs_webhook_url",
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
    username,
    status: "connected",
    webhookUrl,
    verifyToken,
  }
}

const fetchSenderProfile = async ({
  accessToken,
  senderId,
}: {
  accessToken: string
  senderId: string
}) => {
  const fieldSets = [
    "name,username,profile_pic,follower_count",
    "name,username,profile_pic",
    "username",
  ]
  let lastError = "Instagram did not return profile data"

  for (const fields of fieldSets) {
    const response = await fetch(
      instagramApiUrl(senderId, {
        fields,
        access_token: accessToken,
      })
    )
    const body = (await response.json()) as InstagramSenderProfileResponse

    if (!response.ok || body.error) {
      lastError =
        body.error?.message ||
        `Profile lookup failed with HTTP ${response.status}`
      continue
    }

    const fullName = body.name?.trim()
    const username = body.username?.trim()
    const profilePicUrl = body.profile_pic?.trim()
    const followerCount =
      typeof body.follower_count === "number" ? body.follower_count : undefined

    if (!fullName && !username && !profilePicUrl && followerCount === undefined) {
      continue
    }

    return {
      fullName: fullName || undefined,
      username: username || undefined,
      profilePicUrl: profilePicUrl || undefined,
      followerCount,
    }
  }

  throw new ConvexError({
    code: "BAD_REQUEST",
    message: lastError,
  })
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

export const getOAuthAuthorizationUrl = action({
  args: {},
  returns: v.object({
    authorizationUrl: v.string(),
  }),
  handler: async (ctx) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const config = getInstagramOAuthConfig()
    const state = crypto.randomUUID()

    await ctx.runMutation(
      (internal as any).system.instagram.createOAuthState,
      {
        organizationId,
        actorId,
        state,
      }
    )

    return {
      authorizationUrl: buildInstagramAuthorizationUrl({
        appId: config.appId,
        redirectUri: config.redirectUri,
        state,
      }),
    }
  },
})

export const connectWithOAuthCode = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  returns: v.object({
    integrationId: v.string(),
    username: v.optional(v.string()),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_webhook_url")
    ),
    webhookUrl: v.optional(v.string()),
    verifyToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx)
    const code = args.code.trim()
    const state = args.state.trim()

    if (!code || !state) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Instagram authorization code and state are required",
      })
    }

    const { actorId } = (await ctx.runMutation(
      (internal as any).system.instagram.consumeOAuthState,
      {
        state,
        organizationId,
      }
    )) as { actorId?: string }

    const config = getInstagramOAuthConfig()
    const tokenData = await exchangeInstagramCodeForToken({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri,
      code,
    })

    const profile = await fetchInstagramProfile({
      accessToken: tokenData.accessToken,
      instagramUserId: tokenData.userId,
    })

    return await finalizeInstagramConnection(ctx, {
      organizationId,
      actorId,
      accessToken: tokenData.accessToken,
      instagramUserId: profile.instagramUserId,
      username: profile.username,
    })
  },
})

export const connect = action({
  args: {
    accessToken: v.string(),
    instagramUserId: v.string(),
  },
  returns: v.object({
    integrationId: v.string(),
    username: v.optional(v.string()),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_webhook_url")
    ),
    webhookUrl: v.optional(v.string()),
    verifyToken: v.string(),
  }),
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

    const profile = await fetchInstagramProfile({
      accessToken,
      instagramUserId,
    })

    return await finalizeInstagramConnection(ctx, {
      organizationId,
      actorId,
      accessToken,
      instagramUserId: profile.instagramUserId,
      username: profile.username,
    })
  },
})

export const refreshContactProfile = action({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx)
    const refreshContext = (await ctx.runQuery(
      (internal as any).system.instagram.getInstagramContactRefreshContext,
      {
        conversationId: args.conversationId,
        organizationId,
      }
    )) as
      | {
          contact: {
            _id: string
            senderId: string
          }
          integration: {
            accessToken: string
          }
        }
      | null

    if (!refreshContext) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Instagram contact not found for this conversation",
      })
    }

    const profile = await fetchSenderProfile({
      accessToken: refreshContext.integration.accessToken,
      senderId: refreshContext.contact.senderId,
    })

    await ctx.runMutation(
      (internal as any).system.instagram.updateInstagramContactProfile,
      {
        contactId: refreshContext.contact._id,
        organizationId,
        ...profile,
      }
    )

    return profile
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
