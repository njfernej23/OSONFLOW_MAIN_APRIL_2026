"use client"

import { useAuth, useOrganization } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { Spinner } from "@workspace/ui/components/spinner"

import { AuthLayout } from "../layouts/auth-layout"
import { OrgSelectView } from "../views/org-select-view"

/*
 * Routes whose whole purpose is to establish an organization. Gating them on
 * already having one is circular: creating an org briefly leaves the session
 * without an active one, and the guard would answer by offering to create an
 * organization — which is why the create form appeared a second time while the
 * first one had already succeeded in the background.
 */
const ORG_SETUP_PREFIXES = [
  "/create-organization",
  "/organization-created",
  "/org-transfer",
]

function OrganizationGuardLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}

export const OrganizationGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  /*
   * `useAuth().orgId` is the session claim that becomes the `org_id` in the
   * JWT Convex verifies, so gating on it keeps the client and the backend
   * looking at the same organization. `useOrganization().organization` updates
   * optimistically ahead of that claim, which is what let org-scoped queries
   * run in the window where the token carried no organization at all — the
   * backend answered UNAUTHORIZED and the dashboard fell into its error state.
   */
  const { isLoaded: authLoaded, orgId } = useAuth()
  const { isLoaded: organizationLoaded } = useOrganization()

  const isOrgSetupRoute = ORG_SETUP_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isOrgSetupRoute) {
    return <>{children}</>
  }

  if (!authLoaded || !organizationLoaded) {
    return <OrganizationGuardLoading />
  }

  if (!orgId) {
    return (
      <AuthLayout>
        <OrgSelectView />
      </AuthLayout>
    )
  }

  /*
   * Keyed on the organization so switching tears the subtree down instead of
   * leaving live Convex subscriptions that were opened for the previous one.
   */
  return <Fragment key={orgId}>{children}</Fragment>
}
