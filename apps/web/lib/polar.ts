import { Polar } from "@polar-sh/sdk"

export const polarServer =
  process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production"

export const getPolar = () =>
  new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    server: polarServer,
  })

export const polarProductIds = {
  pro: process.env.POLAR_PRO_PRODUCT_ID ?? process.env.POLAR_PRODUCT_ID_PRO ?? "",
}

export const getAppUrl = (origin?: string | null) => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return origin ?? "http://localhost:3000"
}

export const getClientIp = (headers: Headers) => {
  const forwardedFor = headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim()
  }

  return headers.get("x-real-ip") ?? undefined
}
