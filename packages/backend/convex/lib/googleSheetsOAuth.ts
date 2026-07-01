import { ConvexError } from "convex/values"

export const GOOGLE_SHEETS_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
] as const

type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

type GoogleTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

type GoogleUserInfoResponse = {
  email?: string
  error?: {
    message?: string
  }
}

export type GoogleSheetsSecretPayload = {
  authMethod?: "oauth" | "api_key"
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  email?: string
}

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const raw = await response.text()

  if (!raw.trim()) {
    throw new ConvexError(
      `Google returned an empty response (HTTP ${response.status})`
    )
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ConvexError(
      `Google returned an unexpected response (HTTP ${response.status})`
    )
  }
}

export const getGoogleSheetsOAuthConfig = (): GoogleOAuthConfig => {
  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET?.trim()
  const redirectUri = process.env.GOOGLE_SHEETS_OAUTH_REDIRECT_URI?.trim()

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ConvexError(
      "Google Sheets OAuth is not configured. Set GOOGLE_SHEETS_CLIENT_ID, GOOGLE_SHEETS_CLIENT_SECRET, and GOOGLE_SHEETS_OAUTH_REDIRECT_URI in Convex."
    )
  }

  return { clientId, clientSecret, redirectUri }
}

export const buildGoogleSheetsAuthorizationUrl = ({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string
  redirectUri: string
  state: string
}) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SHEETS_OAUTH_SCOPES.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export const exchangeGoogleCodeForTokens = async ({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}) => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const body = await readJsonResponse<GoogleTokenResponse>(response)

  if (!response.ok || !body.access_token) {
    throw new ConvexError(
      body.error_description || body.error || "Google token exchange failed"
    )
  }

  return body
}

export const refreshGoogleAccessToken = async ({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string
  clientId: string
  clientSecret: string
}) => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  })

  const body = await readJsonResponse<GoogleTokenResponse>(response)

  if (!response.ok || !body.access_token) {
    throw new ConvexError(
      body.error_description || body.error || "Google token refresh failed"
    )
  }

  return body
}

export const fetchGoogleAccountEmail = async (accessToken: string) => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const body = await readJsonResponse<GoogleUserInfoResponse>(response)

  if (!response.ok) {
    return undefined
  }

  return body.email?.trim() || undefined
}

export const serializeGoogleSheetsSecret = (
  payload: GoogleSheetsSecretPayload
) => JSON.stringify(payload)

export const isGoogleSheetsOAuthConfigured = (payload: GoogleSheetsSecretPayload | null) =>
  payload?.authMethod === "oauth" && Boolean(payload.refreshToken)
