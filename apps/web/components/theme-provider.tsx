"use client"
import * as React from "react"
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { useAuth } from "@clerk/nextjs"
import { ThemeProvider } from "next-themes"
import { LanguageProvider } from "@/lib/i18n/language-provider"

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_URL in your env file")
}
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "")

function useConvexClerkAuth() {
  const { isLoaded, isSignedIn, getToken, orgId, orgRole } = useAuth()

  const fetchAccessToken = React.useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const skipCache = forceRefreshToken || Boolean(orgId)

        return await getToken({ template: "convex", skipCache })
      } catch {
        return null
      }
    },
    [getToken, orgId, orgRole]
  )

  return React.useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn]
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ConvexProviderWithAuth client={convex} useAuth={useConvexClerkAuth}>
        <LanguageProvider>{children}</LanguageProvider>
      </ConvexProviderWithAuth>
    </ThemeProvider>
  )
}
