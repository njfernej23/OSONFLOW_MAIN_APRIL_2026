"use client"

import { useAuth } from "@clerk/nextjs"
import { Spinner } from "@workspace/ui/components/spinner"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

function AuthGuardLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoaded || isSignedIn) {
      return
    }

    const params = new URLSearchParams({ redirect_url: pathname })
    router.replace(`/sign-in?${params.toString()}`)
  }, [isLoaded, isSignedIn, pathname, router])

  if (!isLoaded || !isSignedIn) {
    return <AuthGuardLoading />
  }

  return <>{children}</>
}
