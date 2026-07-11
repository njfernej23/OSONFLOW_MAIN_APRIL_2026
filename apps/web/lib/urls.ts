const DEFAULT_APP_ORIGIN = "https://app.osonflow.uz"
const DEFAULT_MARKETING_ORIGIN = "https://www.osonflow.uz"

const normalizeOrigin = (value?: string | null) =>
  value?.trim().replace(/\/$/, "") ?? ""

export const getAppOrigin = (fallback?: string | null) => {
  const fromEnv = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)

  if (fromEnv) {
    return fromEnv
  }

  const normalizedFallback = normalizeOrigin(fallback)

  if (normalizedFallback) {
    return normalizedFallback
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return "http://localhost:3000"
}

export const getMarketingOrigin = (fallback?: string | null) => {
  const fromEnv = normalizeOrigin(process.env.NEXT_PUBLIC_MARKETING_URL)

  if (fromEnv) {
    return fromEnv
  }

  const normalizedFallback = normalizeOrigin(fallback)

  if (normalizedFallback) {
    return normalizedFallback
  }

  return DEFAULT_MARKETING_ORIGIN
}

export const getAppHostname = () => {
  try {
    return new URL(getAppOrigin()).hostname.toLowerCase()
  } catch {
    return new URL(DEFAULT_APP_ORIGIN).hostname.toLowerCase()
  }
}

export const appPath = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getAppOrigin()}${normalizedPath}`
}

export const marketingPath = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getMarketingOrigin()}${normalizedPath}`
}

export const isAppHost = (hostname: string) =>
  hostname.toLowerCase() === getAppHostname()

export const isMarketingHost = (hostname: string) => {
  const normalized = hostname.toLowerCase()

  if (isAppHost(normalized)) {
    return false
  }

  return normalized === "www.osonflow.uz" || normalized === "osonflow.uz"
}

export const shouldSplitByHost = (hostname: string) => {
  const normalized = hostname.toLowerCase()

  if (normalized === "localhost" || normalized === "127.0.0.1") {
    return false
  }

  if (normalized.endsWith(".vercel.app")) {
    return false
  }

  return isAppHost(normalized) || isMarketingHost(normalized)
}

/** @deprecated Use getAppOrigin instead */
export const getAppUrl = getAppOrigin
