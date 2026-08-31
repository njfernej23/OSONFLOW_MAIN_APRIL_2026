"use node"

import {
  getGoogleCalendarOAuthConfig,
  refreshGoogleAccessToken,
  serializeGoogleCalendarSecret,
  type GoogleCalendarSecretPayload,
} from "./googleCalendarOAuth"
import { parseSecretValue } from "./secrets"
import { internal } from "../_generated/api"

export type GoogleCalendarAuth = { accessToken: string }

export const resolveGoogleCalendarAuth = async (
  ctx: {
    runQuery: (query: any, args: any) => Promise<any>
    runMutation: (mutation: any, args: any) => Promise<any>
  },
  organizationId: string
): Promise<GoogleCalendarAuth | null> => {
  const plugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId,
      service: "google_calendar",
    }
  )

  if (!plugin?.secretValue) {
    return null
  }

  const secret = parseSecretValue<GoogleCalendarSecretPayload>(
    plugin.secretValue
  )

  if (!secret?.refreshToken) {
    return null
  }

  const expiresAt = secret.expiresAt ?? 0
  const accessToken = secret.accessToken?.trim()

  if (accessToken && expiresAt > Date.now() + 60_000) {
    return { accessToken }
  }

  try {
    const config = getGoogleCalendarOAuthConfig()
    const refreshed = await refreshGoogleAccessToken({
      refreshToken: secret.refreshToken,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    })

    const nextAccessToken = refreshed.access_token?.trim()

    if (!nextAccessToken) {
      return null
    }

    const nextSecret = serializeGoogleCalendarSecret({
      ...secret,
      accessToken: nextAccessToken,
      expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    })

    await ctx.runMutation(internal.system.googleCalendar.saveOAuthCredentials, {
      organizationId,
      secretValue: nextSecret,
    })

    return { accessToken: nextAccessToken }
  } catch {
    if (accessToken) {
      return { accessToken }
    }

    return null
  }
}
