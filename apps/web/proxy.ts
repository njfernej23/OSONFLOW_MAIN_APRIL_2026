import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import {
  getAppOrigin,
  getMarketingOrigin,
  isAppHost,
  isMarketingHost,
  shouldSplitByHost,
} from "@/lib/urls"

const isMarketingRoute = createRouteMatcher([
  "/",
  "/product(.*)",
  "/automation(.*)",
  "/channels(.*)",
  "/pricing(.*)",
])

const isPublicRoute = createRouteMatcher([
  "/",
  "/product(.*)",
  "/automation(.*)",
  "/channels(.*)",
  "/pricing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/org-selection(.*)",
])

const isOrgFreeRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/org-selection(.*)",
])

const isAuthEntryRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])

const redirectToOrigin = (
  req: NextRequest,
  origin: string,
  pathname = req.nextUrl.pathname
) => {
  const url = new URL(pathname, origin)
  url.search = req.nextUrl.search
  return NextResponse.redirect(url)
}

const maybeRedirectByHost = (req: NextRequest) => {
  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? ""

  if (!shouldSplitByHost(hostname) || req.nextUrl.pathname.startsWith("/api/")) {
    return null
  }

  if (isMarketingHost(hostname) && !isMarketingRoute(req)) {
    return redirectToOrigin(req, getAppOrigin())
  }

  if (isAppHost(hostname)) {
    if (req.nextUrl.pathname === "/") {
      return redirectToOrigin(req, getAppOrigin(), "/analytics")
    }

    if (isMarketingRoute(req)) {
      return redirectToOrigin(req, getMarketingOrigin())
    }
  }

  return null
}

export const proxy = clerkMiddleware(async (auth, req) => {
  const hostRedirect = maybeRedirectByHost(req)

  if (hostRedirect) {
    return hostRedirect
  }

  const { userId, orgId, sessionStatus } = await auth()

  if (req.nextUrl.pathname.startsWith("/sign-in/tasks/")) {
    const orgSelection = new URL("/org-selection", req.url)
    orgSelection.search = req.nextUrl.search
    return NextResponse.redirect(orgSelection)
  }

  if (!isPublicRoute(req)) {
    if (sessionStatus === "pending") {
      const orgSelection = new URL("/org-selection", req.url)
      orgSelection.search = req.nextUrl.search
      return NextResponse.redirect(orgSelection)
    }

    await auth.protect()
  }

  if (userId && isAuthEntryRoute(req)) {
    if (!orgId) {
      return NextResponse.redirect(new URL("/org-selection", req.url))
    }

    const redirectUrl =
      req.nextUrl.searchParams.get("redirect_url") ?? "/analytics"
    return NextResponse.redirect(new URL(redirectUrl, req.url))
  }

  if (userId && !orgId && !isOrgFreeRoute(req)) {
    const searchParams = new URLSearchParams({ redirectUrl: req.url })
    const orgSelection = new URL(
      `/org-selection?${searchParams.toString()}`,
      req.url
    )
    return NextResponse.redirect(orgSelection)
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
