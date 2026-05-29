"use client"
import * as React from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { useAuth } from "@clerk/nextjs"
import { ThemeProvider } from "next-themes"
import { LanguageProvider } from "@/lib/i18n/language-provider"

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_URL in your env file")
}
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "")

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <LanguageProvider>{children}</LanguageProvider>
      </ConvexProviderWithClerk>
    </ThemeProvider>
  )
}
