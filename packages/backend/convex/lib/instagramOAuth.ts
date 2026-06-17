import { ConvexError } from "convex/values"

export const INSTAGRAM_OAUTH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
] as const

type InstagramOAuthConfig = {
  appId: string
  appSecret: string
  redirectUri: string
}

type InstagramTokenExchangeResponse = {
  access_token?: string
  user_id?: string | number
  data?: Array<{
    access_token?: string
    user_id?: string | number
    permissions?: string
  }>
  error_type?: string
  error_message?: string
  error?: {
    message?: string
  }
}

type InstagramLongLivedTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: {
    message?: string
  }
}

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const raw = await response.text()

  if (!raw.trim()) {
    throw new ConvexError(
      `Instagram returned an empty response (HTTP ${response.status})`
    )
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ConvexError(
      `Instagram returned an unexpected response (HTTP ${response.status})`
    )
  }
}

export const getInstagramOAuthConfig = (): InstagramOAuthConfig => {
  const appId = process.env.INSTAGRAM_APP_ID?.trim()
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim()
  const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI?.trim()

  if (!appId || !appSecret || !redirectUri) {
    throw new ConvexError(
      "Instagram OAuth is not configured. Set INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and INSTAGRAM_OAUTH_REDIRECT_URI in Convex."
    )
  }

  return { appId, appSecret, redirectUri }
}

export const buildInstagramAuthorizationUrl = ({
  appId,
  redirectUri,
  state,
}: {
  appId: string
  redirectUri: string
  state: string
}) => {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_OAUTH_SCOPES.join(","),
    state,
  })

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`
}

const parseTokenExchangeResponse = (body: InstagramTokenExchangeResponse) => {
  if ("data" in body && Array.isArray(body.data) && body.data[0]) {
    const entry = body.data[0]
    const accessToken = entry.access_token?.trim()
    const userId = entry.user_id

    if (!accessToken || userId === undefined || userId === null) {
      throw new ConvexError("Instagram did not return an access token")
    }

    return {
      accessToken,
      userId: String(userId),
    }
  }

  const accessToken = body.access_token?.trim()
  const userId = body.user_id

  if (!accessToken || userId === undefined || userId === null) {
    throw new ConvexError(
      body.error_message ||
        body.error?.message ||
        "Instagram did not return an access token"
    )
  }

  return {
    accessToken,
    userId: String(userId),
  }
}

export const exchangeInstagramCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
}: {
  appId: string
  appSecret: string
  redirectUri: string
  code: string
}) => {
  const formBody = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  })

  const body = await readJsonResponse<InstagramTokenExchangeResponse>(response)

  if (!response.ok) {
    throw new ConvexError(
      body.error_message ||
        body.error?.message ||
        `Failed to exchange Instagram authorization code (HTTP ${response.status})`
    )
  }

  const shortLived = parseTokenExchangeResponse(body)

  try {
    const longLived = await exchangeInstagramShortLivedToken({
      appSecret,
      accessToken: shortLived.accessToken,
    })

    return {
      accessToken: longLived.accessToken,
      userId: shortLived.userId,
      expiresIn: longLived.expiresIn,
    }
  } catch (error) {
    console.warn(
      "Instagram long-lived token exchange failed, using short-lived token:",
      error instanceof Error ? error.message : error
    )

    return {
      accessToken: shortLived.accessToken,
      userId: shortLived.userId,
      expiresIn: undefined,
    }
  }
}

export const exchangeInstagramShortLivedToken = async ({
  appSecret,
  accessToken,
}: {
  appSecret: string
  accessToken: string
}) => {
  const url = new URL("https://graph.instagram.com/access_token")
  url.searchParams.set("grant_type", "ig_exchange_token")
  url.searchParams.set("client_secret", appSecret)
  url.searchParams.set("access_token", accessToken)

  const response = await fetch(url.toString())
  const body = await readJsonResponse<InstagramLongLivedTokenResponse>(response)

  if (!response.ok || !body.access_token) {
    throw new ConvexError(
      body.error?.message ||
        `Failed to exchange Instagram token for a long-lived token (HTTP ${response.status})`
    )
  }

  return {
    accessToken: body.access_token,
    expiresIn:
      typeof body.expires_in === "number" ? body.expires_in : undefined,
  }
}

export const subscribeInstagramMessagingWebhooks = async ({
  accessToken,
  apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0",
}: {
  accessToken: string
  apiVersion?: string
}) => {
  const url = new URL(
    `https://graph.instagram.com/${apiVersion}/me/subscribed_apps`
  )
  url.searchParams.set("subscribed_fields", "messages")
  url.searchParams.set("access_token", accessToken)

  const response = await fetch(url.toString(), { method: "POST" })
  const body = await readJsonResponse<{
    success?: boolean
    error?: { message?: string }
  }>(response)

  if (!response.ok || !body.success) {
    throw new ConvexError(
      body.error?.message ||
        `Failed to subscribe Instagram account to message webhooks (HTTP ${response.status})`
    )
  }

  return { success: true as const }
}

export const getInstagramIncomingWebhookUrl = (webhookBaseUrl: string) =>
  `${webhookBaseUrl.replace(/\/$/, "")}/instagram/webhook/incoming`
