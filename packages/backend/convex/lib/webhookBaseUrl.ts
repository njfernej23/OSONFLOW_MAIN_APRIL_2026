import { ConvexError } from "convex/values"

const normalizeUrl = (value?: string) => {
  const trimmed = value?.trim()

  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)
    return url.toString().replace(/\/$/, "")
  } catch {
    return undefined
  }
}

const deriveSiteUrlFromCloudUrl = () => {
  const cloudUrl =
    process.env.CONVEX_CLOUD_URL?.trim() || process.env.CONVEX_URL?.trim()

  if (!cloudUrl) {
    return undefined
  }

  try {
    const url = new URL(cloudUrl)

    if (!url.hostname.endsWith(".convex.cloud")) {
      return undefined
    }

    url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site")
    url.pathname = ""
    url.search = ""
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return undefined
  }
}

export const getWebhookBaseUrl = (...preferredEnvVars: string[]) => {
  for (const envVarName of [
    ...preferredEnvVars,
    "CHANNEL_WEBHOOK_BASE_URL",
    "TELEGRAM_WEBHOOK_BASE_URL",
    "INSTAGRAM_WEBHOOK_BASE_URL",
    "WHATSAPP_WEBHOOK_BASE_URL",
    "META_WEBHOOK_BASE_URL",
    "CONVEX_SITE_URL",
  ]) {
    const normalized = normalizeUrl(process.env[envVarName])

    if (normalized) {
      return normalized
    }
  }

  return deriveSiteUrlFromCloudUrl()
}

const DEFAULT_TELEGRAM_WEBHOOK_BASE_URL =
  "https://nautical-gazelle-675.eu-west-1.convex.site"

export const getTelegramWebhookBaseUrl = () =>
  getWebhookBaseUrl("TELEGRAM_WEBHOOK_BASE_URL") ??
  DEFAULT_TELEGRAM_WEBHOOK_BASE_URL

export const requireWebhookBaseUrl = (...preferredEnvVars: string[]) => {
  const baseUrl = getWebhookBaseUrl(...preferredEnvVars)

  if (!baseUrl) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message:
        "Webhook base URL is not configured. Set CHANNEL_WEBHOOK_BASE_URL in your Convex environment variables.",
    })
  }

  return baseUrl
}
