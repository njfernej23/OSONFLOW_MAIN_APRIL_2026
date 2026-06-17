import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import {
  ensurePolarCustomerForOrganization,
  getAppUrl,
  getClientIp,
  getPolar,
  organizationHasActivePolarSubscription,
  polarProductIds,
} from "@/lib/polar"

export const GET = async (request: NextRequest) => {
  const { orgId, userId } = await auth()

  if (!userId) {
    const signInUrl = new URL("/sign-in", request.nextUrl.origin)
    signInUrl.searchParams.set("redirect_url", "/billing")
    return NextResponse.redirect(signInUrl)
  }

  if (!orgId) {
    return NextResponse.redirect(
      new URL("/org-selection", request.nextUrl.origin)
    )
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Missing POLAR_ACCESS_TOKEN" },
      { status: 500 }
    )
  }

  if (!polarProductIds.pro) {
    return NextResponse.json(
      { error: "Missing POLAR_PRO_PRODUCT_ID" },
      { status: 500 }
    )
  }

  const polar = getPolar()
  const appUrl = getAppUrl(request.nextUrl.origin)

  if (await organizationHasActivePolarSubscription(polar, orgId)) {
    return NextResponse.redirect(new URL("/billing", appUrl))
  }

  const user = await currentUser()
  const customer = await ensurePolarCustomerForOrganization(polar, {
    orgId,
    userId,
    userEmail: user?.primaryEmailAddress?.emailAddress,
    userName: user?.fullName,
  })

  const successUrl = new URL("/billing", appUrl)
  successUrl.searchParams.set("checkout_id", "{CHECKOUT_ID}")

  const checkout = await polar.checkouts.create({
    products: [polarProductIds.pro],
    customerId: customer.id,
    customerIpAddress: getClientIp(request.headers),
    metadata: {
      organizationId: orgId,
      plan: "pro",
    },
    customerMetadata: {
      clerkUserId: userId,
      organizationId: orgId,
      ...(user?.primaryEmailAddress?.emailAddress
        ? { contactEmail: user.primaryEmailAddress.emailAddress }
        : {}),
    },
    successUrl: successUrl.toString(),
    returnUrl: new URL("/billing", appUrl).toString(),
  })

  return NextResponse.redirect(checkout.url)
}
