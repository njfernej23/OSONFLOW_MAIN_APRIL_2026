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
  "/privacy(.*)",
  "/terms(.*)",
])

const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy(.*)",
  "/terms(.*)",
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

// Where a signed-in user lands when no destination was requested. An
// organization that has not finished the first-run guide is moved on to
// /start by the dashboard itself, which needs data the proxy cannot read.
const DEFAULT_APP_LANDING = "/conversations"

// Every top-level segment that belongs to the authenticated app. Used only to
// decide whether an unknown URL on the marketing host is worth redirecting to
// the app host, or is simply a typo that should render our 404. Auth itself is
// still deny-by-default via isPublicRoute, so a route missing from this list
// cannot become unprotected on the app host.
const isAppRoute = createRouteMatcher([
  "/account(.*)",
  "/ai-conversations(.*)",
  "/analytics(.*)",
  "/assistant-tools(.*)",
  "/billing(.*)",
  "/conversations(.*)",
  "/create-organization(.*)",
  "/customer-memory(.*)",
  "/customization(.*)",
  "/files(.*)",
  "/integrations(.*)",
  "/leads(.*)",
  "/org-selection(.*)",
  "/org-transfer(.*)",
  "/organization-created(.*)",
  "/organization-settings(.*)",
  "/workflows(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/start(.*)",
  "/widget-preview(.*)",
])

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

  if (isMarketingHost(hostname) && isAppRoute(req)) {
    return redirectToOrigin(req, getAppOrigin())
  }

  if (isAppHost(hostname)) {
    if (req.nextUrl.pathname === "/") {
      return redirectToOrigin(req, getAppOrigin(), DEFAULT_APP_LANDING)
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

  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? ""
  const isUnknownMarketingPath =
    isMarketingHost(hostname) && !isMarketingRoute(req) && !isAppRoute(req)

  if (!isPublicRoute(req) && !isUnknownMarketingPath) {
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
      req.nextUrl.searchParams.get("redirect_url") ?? DEFAULT_APP_LANDING
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx|txt|xml|zip|webmanifest|mp4|webm|mov|m4v)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
