"use client"

import { useAuth, useSession } from "@clerk/nextjs"
import { Spinner } from "@workspace/ui/components/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { CustomSignInForm } from "../components/custom-sign-in-form"

export const SignInView = () => {
  const { isLoaded, isSignedIn, orgId } = useAuth()
  const { session, isLoaded: isSessionLoaded } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect_url") ?? "/analytics"

  const hasPendingSession = session?.status === "pending"
  const shouldRedirectToOrgSelection =
    pathname.startsWith("/sign-in/tasks/") || hasPendingSession

  useEffect(() => {
    if (!isLoaded || !isSessionLoaded) {
      return
    }

    if (shouldRedirectToOrgSelection) {
      const params = searchParams.toString()
      router.replace(params ? `/org-selection?${params}` : "/org-selection")
      return
    }

    if (!isSignedIn) {
      return
    }

    if (!orgId) {
      router.replace("/org-selection")
      return
    }

    router.replace(redirectUrl)
  }, [
    isLoaded,
    isSessionLoaded,
    isSignedIn,
    orgId,
    pathname,
    redirectUrl,
    router,
    searchParams,
    shouldRedirectToOrgSelection,
  ])

  if (!isLoaded || !isSessionLoaded || shouldRedirectToOrgSelection || isSignedIn) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return <CustomSignInForm />
}
