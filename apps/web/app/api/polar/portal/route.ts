import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import {
  ensurePolarCustomerForOrganization,
  getAppUrl,
  getPolar,
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

  const polar = getPolar()
  const user = await currentUser()

  await ensurePolarCustomerForOrganization(polar, {
    orgId,
    userId,
    userEmail: user?.primaryEmailAddress?.emailAddress,
    userName: user?.fullName,
  })

  const session = await polar.customerSessions.create({
    externalCustomerId: orgId,
    returnUrl: new URL("/billing", getAppUrl(request.nextUrl.origin)).toString(),
  })

  return NextResponse.redirect(session.customerPortalUrl)
}
