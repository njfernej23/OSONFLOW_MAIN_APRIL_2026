import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import {
  buildGoogleSheetsAuthorizationUrl,
  exchangeGoogleCodeForTokens,
  fetchGoogleAccountEmail,
  getGoogleSheetsOAuthConfig,
  serializeGoogleSheetsSecret,
  type GoogleSheetsSecretPayload,
} from "../lib/googleSheetsOAuth"
import { parseSecretValue } from "../lib/secrets"
import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { action, mutation, query } from "../_generated/server"

const getAuthContext = async (ctx: {
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

  return {
    organizationId,
    actorId: identity.subject,
  }
}

const readGoogleSheetsSecret = async (
  ctx: { db: any },
  organizationId: string
): Promise<GoogleSheetsSecretPayload | null> => {
  const plugin = await ctx.db
    .query("plugins")
    .withIndex("by_organization_id_and_service", (q: any) =>
      q.eq("organizationId", organizationId).eq("service", "google_sheets")
    )
    .unique()

  if (!plugin?.secretValue) {
    return null
  }

  return parseSecretValue<GoogleSheetsSecretPayload>(plugin.secretValue)
}

export const getConnectionStatus = query({
  args: {},
  returns: v.object({
    isConfigured: v.boolean(),
    authMethod: v.optional(v.union(v.literal("oauth"), v.literal("api_key"))),
    email: v.optional(v.string()),
    oauthAvailable: v.boolean(),
  }),
  handler: async (ctx) => {
    const organizationId = await getAuthContext(ctx)
    const secret = await readGoogleSheetsSecret(ctx, organizationId.organizationId)

    let oauthAvailable = false
    try {
      getGoogleSheetsOAuthConfig()
      oauthAvailable = true
    } catch {
      oauthAvailable = false
    }

    if (!secret) {
      return {
        isConfigured: false,
        oauthAvailable,
      }
    }

    if (secret.authMethod === "oauth" && secret.refreshToken) {
      return {
        isConfigured: true,
        authMethod: "oauth" as const,
        email: secret.email,
        oauthAvailable,
      }
    }

    if (secret.apiKey) {
      return {
        isConfigured: true,
        authMethod: "api_key" as const,
        oauthAvailable,
      }
    }

    return {
      isConfigured: false,
      oauthAvailable,
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
    const config = getGoogleSheetsOAuthConfig()
    const state = crypto.randomUUID()

    await ctx.runMutation(internal.system.googleSheets.createOAuthState, {
      organizationId,
      actorId,
      state,
    })

    return {
      authorizationUrl: buildGoogleSheetsAuthorizationUrl({
        clientId: config.clientId,
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
    email: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx)
    const config = getGoogleSheetsOAuthConfig()

    await ctx.runMutation(internal.system.googleSheets.consumeOAuthState, {
      state: args.state,
      organizationId,
    })

    const tokens = await exchangeGoogleCodeForTokens({
      code: args.code.trim(),
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    })

    if (!tokens.refresh_token) {
      throw new ConvexError(
        "Google did not return a refresh token. Disconnect the app in your Google Account settings and try again."
      )
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token!)
    const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000

    const secretValue = serializeGoogleSheetsSecret({
      authMethod: "oauth",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      email,
    })

    await ctx.runMutation(internal.system.googleSheets.saveOAuthCredentials, {
      organizationId,
      secretValue,
    })

    return { email }
  },
})

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const { organizationId } = await getAuthContext(ctx)

    const plugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", organizationId).eq("service", "google_sheets")
      )
      .unique()

    if (plugin) {
      await ctx.db.delete(plugin._id)
    }

    return null
  },
})

export const upsertApiKey = mutation({
  args: {
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { organizationId } = await getAuthContext(ctx)
    const apiKey = args.apiKey.trim()

    if (!apiKey) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Google Sheets API key is required",
      })
    }

    const secretValue = serializeGoogleSheetsSecret({
      authMethod: "api_key",
      apiKey,
    })

    await ctx.runMutation(internal.system.googleSheets.saveOAuthCredentials, {
      organizationId,
      secretValue,
    })

    return null
  },
})
