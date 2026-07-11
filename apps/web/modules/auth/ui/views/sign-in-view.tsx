"use client"

import { useAuth } from "@clerk/nextjs"
import { Spinner } from "@workspace/ui/components/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { CustomSignInForm } from "../components/custom-sign-in-form"

export const SignInView = () => {
  const { isLoaded, isSignedIn, orgId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect_url") ?? "/analytics"

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (pathname.startsWith("/sign-in/tasks/")) {
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
  }, [isLoaded, isSignedIn, orgId, pathname, redirectUrl, router, searchParams])

  if (
    !isLoaded ||
    pathname.startsWith("/sign-in/tasks/") ||
    isSignedIn
  ) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return <CustomSignInForm />
}
