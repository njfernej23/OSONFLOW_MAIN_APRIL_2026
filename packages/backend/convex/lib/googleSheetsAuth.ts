"use node"

import {
  getGoogleSheetsOAuthConfig,
  refreshGoogleAccessToken,
  serializeGoogleSheetsSecret,
  type GoogleSheetsSecretPayload,
} from "./googleSheetsOAuth"
import { parseSecretValue } from "./secrets"
import { internal } from "../_generated/api"

export type GoogleSheetsAuth =
  | { method: "oauth"; accessToken: string }
  | { method: "api_key"; apiKey: string }

export const resolveGoogleSheetsAuth = async (
  ctx: {
    runQuery: (query: any, args: any) => Promise<any>
    runMutation: (mutation: any, args: any) => Promise<any>
  },
  organizationId: string
): Promise<GoogleSheetsAuth | null> => {
  const plugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId,
      service: "google_sheets",
    }
  )

  if (!plugin?.secretValue) {
    return null
  }

  const secret = parseSecretValue<GoogleSheetsSecretPayload>(plugin.secretValue)

  if (!secret) {
    return null
  }

  if (secret.authMethod === "oauth" && secret.refreshToken) {
    const expiresAt = secret.expiresAt ?? 0
    const accessToken = secret.accessToken?.trim()

    if (accessToken && expiresAt > Date.now() + 60_000) {
      return { method: "oauth", accessToken }
    }

    try {
      const config = getGoogleSheetsOAuthConfig()
      const refreshed = await refreshGoogleAccessToken({
        refreshToken: secret.refreshToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      })

      const nextAccessToken = refreshed.access_token?.trim()

      if (!nextAccessToken) {
        return null
      }

      const nextSecret = serializeGoogleSheetsSecret({
        ...secret,
        authMethod: "oauth",
        accessToken: nextAccessToken,
        expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      })

      await ctx.runMutation(internal.system.googleSheets.saveOAuthCredentials, {
        organizationId,
        secretValue: nextSecret,
      })

      return { method: "oauth", accessToken: nextAccessToken }
    } catch {
      if (accessToken) {
        return { method: "oauth", accessToken }
      }

      return null
    }
  }

  if (secret.apiKey?.trim()) {
    return { method: "api_key", apiKey: secret.apiKey.trim() }
  }

  return null
}

export const fetchGoogleSheetValues = async ({
  spreadsheetId,
  range,
  auth,
}: {
  spreadsheetId: string
  range: string
  auth: GoogleSheetsAuth
}) => {
  const encodedRange = encodeURIComponent(range)
  const url =
    auth.method === "api_key"
      ? `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${auth.apiKey}`
      : `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`

  const response = await fetch(url, {
    headers:
      auth.method === "oauth"
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.error?.message || "Unable to read the configured Google Sheet."
    throw new Error(message)
  }

  return (payload?.values as string[][]) ?? []
}
