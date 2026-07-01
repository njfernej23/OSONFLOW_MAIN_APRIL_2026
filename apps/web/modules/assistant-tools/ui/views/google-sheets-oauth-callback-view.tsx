"use client"

import { useAction } from "convex/react"
import { ConvexError } from "convex/values"
import { api } from "@workspace/backend/_generated/api"
import { Loader2Icon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

const getConnectErrorMessage = (error: unknown) => {
  if (error instanceof ConvexError) {
    if (typeof error.data === "string") {
      return error.data
    }

    if (
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data &&
      typeof error.data.message === "string"
    ) {
      return error.data.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Failed to connect Google account"
}

export const GoogleSheetsOAuthCallbackView = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const connectWithOAuthCode = useAction(api.private.googleSheets.connectWithOAuthCode)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true

    const completeOAuth = async () => {
      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        toast.error(
          errorDescription?.replaceAll("+", " ") ||
            "Google authorization was cancelled"
        )
        router.replace("/assistant-tools")
        return
      }

      const code = searchParams.get("code") ?? ""
      const state = searchParams.get("state") ?? ""

      if (!code || !state) {
        toast.error("Missing Google authorization response")
        router.replace("/assistant-tools")
        return
      }

      const exchangeKey = `google-sheets-oauth:${code}:${state}`
      if (typeof window !== "undefined") {
        const existingExchange = window.sessionStorage.getItem(exchangeKey)
        if (existingExchange === "done" || existingExchange === "pending") {
          router.replace("/assistant-tools")
          return
        }
        window.sessionStorage.setItem(exchangeKey, "pending")
      }

      try {
        const result = await connectWithOAuthCode({ code, state })

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(exchangeKey, "done")
        }

        toast.success(
          result.email
            ? `Connected Google account (${result.email})`
            : "Google account connected"
        )
      } catch (connectError) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(exchangeKey)
        }
        toast.error(getConnectErrorMessage(connectError))
      }

      router.replace("/assistant-tools")
    }

    void completeOAuth()
  }, [connectWithOAuthCode, router, searchParams])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Connecting Google Sheets</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Finishing authorization and saving your account...
        </p>
      </div>
    </div>
  )
}
