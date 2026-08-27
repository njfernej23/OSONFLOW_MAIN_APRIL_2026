const DEFAULT_APP_HOSTNAME = "app.osonflow.uz"
const DEFAULT_MARKETING_ORIGIN = "https://www.osonflow.uz"

const MARKETING_HOSTNAMES = new Set(["osonflow.uz", "www.osonflow.uz"])

const normalizeOrigin = (value?: string | null) =>
  value?.trim().replace(/\/$/, "") ?? ""

const getHostnameFromOrigin = (origin: string) => {
  try {
    return new URL(origin).hostname.toLowerCase()
  } catch {
    return null
  }
}

const isMarketingHostname = (hostname: string) =>
  MARKETING_HOSTNAMES.has(hostname.toLowerCase())

const isValidAppOrigin = (origin: string) => {
  const hostname = getHostnameFromOrigin(origin)

  if (!hostname) {
    return false
  }

  return !isMarketingHostname(hostname)
}

const pickFirstValidAppOrigin = (
  ...candidates: Array<string | null | undefined>
) => {
  for (const candidate of candidates) {
    const normalized = normalizeOrigin(candidate)

    if (normalized && isValidAppOrigin(normalized)) {
      return normalized
    }
  }

  return null
}

export const getAppOrigin = (fallback?: string | null) => {
  const resolved = pickFirstValidAppOrigin(
    process.env.NEXT_PUBLIC_APP_URL,
    fallback
  )

  if (resolved) {
    return resolved
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    const vercelOrigin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`

    if (isValidAppOrigin(vercelOrigin)) {
      return vercelOrigin
    }
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

const getAppHostname = () => {
  try {
    return new URL(getAppOrigin()).hostname.toLowerCase()
  } catch {
    return DEFAULT_APP_HOSTNAME
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

export const isAppHost = (hostname: string) => {
  const normalized = hostname.toLowerCase()

  if (isMarketingHostname(normalized)) {
    return false
  }

  if (normalized === DEFAULT_APP_HOSTNAME) {
    return true
  }

  return normalized === getAppHostname()
}

export const isMarketingHost = (hostname: string) => {
  const normalized = hostname.toLowerCase()

  if (isAppHost(normalized)) {
    return false
  }

  return isMarketingHostname(normalized)
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

