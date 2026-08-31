import { requireOrganizationIdentity } from "../lib/organizationIdentity"
import {
  buildGoogleCalendarAuthorizationUrl,
  exchangeGoogleCodeForTokens,
  fetchGoogleAccountEmail,
  getGoogleCalendarOAuthConfig,
  serializeGoogleCalendarSecret,
  type GoogleCalendarSecretPayload,
} from "../lib/googleCalendarOAuth"
import { parseSecretValue } from "../lib/secrets"
import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { action, mutation, query } from "../_generated/server"

const getAuthContext = async (
  ctx: Parameters<typeof requireOrganizationIdentity>[0]
) => {
  const { identity, orgId } = await requireOrganizationIdentity(ctx)

  return {
    organizationId: orgId,
    actorId: identity.subject,
  }
}

const readGoogleCalendarSecret = async (
  ctx: { db: any },
  organizationId: string
): Promise<GoogleCalendarSecretPayload | null> => {
  const plugin = await ctx.db
    .query("plugins")
    .withIndex("by_organization_id_and_service", (q: any) =>
      q.eq("organizationId", organizationId).eq("service", "google_calendar")
    )
    .unique()

  if (!plugin?.secretValue) {
    return null
  }

  return parseSecretValue<GoogleCalendarSecretPayload>(plugin.secretValue)
}

export const getConnectionStatus = query({
  args: {},
  returns: v.object({
    isConfigured: v.boolean(),
    email: v.optional(v.string()),
    oauthAvailable: v.boolean(),
  }),
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const secret = await readGoogleCalendarSecret(ctx, organizationId)

    let oauthAvailable = false
    try {
      getGoogleCalendarOAuthConfig()
      oauthAvailable = true
    } catch {
      oauthAvailable = false
    }

    if (secret?.refreshToken) {
      return {
        isConfigured: true,
        email: secret.email,
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
    const config = getGoogleCalendarOAuthConfig()
    const state = crypto.randomUUID()

    await ctx.runMutation(internal.system.googleCalendar.createOAuthState, {
      organizationId,
      actorId,
      state,
    })

    return {
      authorizationUrl: buildGoogleCalendarAuthorizationUrl({
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
    const config = getGoogleCalendarOAuthConfig()

    await ctx.runMutation(internal.system.googleCalendar.consumeOAuthState, {
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

    const secretValue = serializeGoogleCalendarSecret({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      email,
    })

    await ctx.runMutation(internal.system.googleCalendar.saveOAuthCredentials, {
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
        q
          .eq("organizationId", organizationId)
          .eq("service", "google_calendar")
      )
      .unique()

    if (plugin) {
      await ctx.db.delete(plugin._id)
    }

    return null
  },
})
