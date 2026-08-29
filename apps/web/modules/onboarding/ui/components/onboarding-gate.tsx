"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@workspace/backend/_generated/api"
import { useQuery } from "convex/react"

/**
 * Sends a team that has never been through the guide to /start instead of
 * leaving them on whichever dashboard page they happened to open.
 *
 * It fires at most once per page load, so it steers the first visit without
 * trapping anyone: click away from the guide and you stay away.
 */

// Pages that must stay reachable even before setup — paying, leaving, or
// fixing the organization itself should never be blocked by a tour.
const EXEMPT_PREFIXES = [
  "/start",
  "/account",
  "/billing",
  "/create-organization",
  "/organization-created",
  "/organization-settings",
  "/org-selection",
  "/org-transfer",
]

export const OnboardingGate = () => {
  const pathname = usePathname()
  const router = useRouter()
  const status = useQuery(api.private.onboarding.getStatus)
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (hasRedirected.current) {
      return
    }

    if (!status || !status.shouldShowGuideFirst) {
      return
    }

    if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return
    }

    hasRedirected.current = true
    router.replace("/start")
  }, [pathname, router, status])

  return null
}
