"use client"

import { useOrganization } from "@clerk/nextjs"
import { Spinner } from "@workspace/ui/components/spinner"

import { AuthLayout } from "../layouts/auth-layout"
import { OrgSelectView } from "../views/org-select-view"

function OrganizationGuardLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}

export const OrganizationGuard = ({ children }: { children: React.ReactNode }) => {
  const { organization, isLoaded } = useOrganization()

  if (!isLoaded) {
    return <OrganizationGuardLoading />
  }

  if (!organization) {
    return (
      <AuthLayout>
        <OrgSelectView />
      </AuthLayout>
    )
  }

  return <>{children}</>
}