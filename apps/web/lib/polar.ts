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

export const buildOrganizationBillingEmail = (
  userEmail: string | undefined,
  orgId: string
) => {
  const orgSuffix = orgId.replace(/[^a-zA-Z0-9]/g, "").slice(-16)

  if (!userEmail?.includes("@")) {
    return `billing+${orgSuffix}@osonflow.app`
  }

  const [localPart, domain] = userEmail.split("@")

  if (!localPart || !domain) {
    return `billing+${orgSuffix}@osonflow.app`
  }

  return `${localPart}+${orgSuffix}@${domain}`
}

export const isPolarNotFoundError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  if ("statusCode" in error && error.statusCode === 404) {
    return true
  }

  return "name" in error && error.name === "ResourceNotFound"
}

export const ensurePolarCustomerForOrganization = async (
  polar: Polar,
  args: {
    orgId: string
    userId: string
    userEmail?: string | null
    userName?: string | null
  }
) => {
  try {
    return await polar.customers.getExternal({ externalId: args.orgId })
  } catch (error) {
    if (!isPolarNotFoundError(error)) {
      throw error
    }
  }

  return await polar.customers.create({
    type: "individual",
    externalId: args.orgId,
    email: buildOrganizationBillingEmail(args.userEmail, args.orgId),
    name: args.userName ?? undefined,
    metadata: {
      organizationId: args.orgId,
      clerkUserId: args.userId,
      ...(args.userEmail ? { contactEmail: args.userEmail } : {}),
    },
  })
}

export const organizationHasActivePolarSubscription = async (
  polar: Polar,
  orgId: string
) => {
  try {
    const state = await polar.customers.getStateExternal({ externalId: orgId })
    return state.activeSubscriptions.length > 0
  } catch (error) {
    if (isPolarNotFoundError(error)) {
      return false
    }

    throw error
  }
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
