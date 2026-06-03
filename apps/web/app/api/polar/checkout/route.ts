import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import { getAppUrl, getClientIp, getPolar, polarProductIds } from "@/lib/polar"

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

  const user = await currentUser()
  const appUrl = getAppUrl(request.nextUrl.origin)
  const successUrl = new URL("/billing", appUrl)
  successUrl.searchParams.set("checkout_id", "{CHECKOUT_ID}")

  const checkout = await getPolar().checkouts.create({
    products: [polarProductIds.pro],
    externalCustomerId: orgId,
    customerEmail: user?.primaryEmailAddress?.emailAddress,
    customerName: user?.fullName,
    customerIpAddress: getClientIp(request.headers),
    metadata: {
      organizationId: orgId,
      plan: "pro",
    },
    customerMetadata: {
      clerkUserId: userId,
      organizationId: orgId,
    },
    successUrl: successUrl.toString(),
    returnUrl: new URL("/billing", appUrl).toString(),
  })

  return NextResponse.redirect(checkout.url)
}
