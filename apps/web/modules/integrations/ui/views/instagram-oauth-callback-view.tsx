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

  return "Failed to connect Instagram account"
}

export const InstagramOAuthCallbackView = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const connectWithOAuthCode = useAction(
    (api as any).private.instagram.connectWithOAuthCode
  ) as (args: { code: string; state: string }) => Promise<{
    username?: string
    status: "connected" | "needs_webhook_url"
  }>
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
            "Instagram authorization was cancelled"
        )
        router.replace("/integrations?section=instagram")
        return
      }

      const code = searchParams.get("code")?.replace(/#_$/, "") ?? ""
      const state = searchParams.get("state") ?? ""

      if (!code || !state) {
        toast.error("Missing Instagram authorization response")
        router.replace("/integrations?section=instagram")
        return
      }

      const exchangeKey = `instagram-oauth:${code}:${state}`
      if (typeof window !== "undefined") {
        const existingExchange = window.sessionStorage.getItem(exchangeKey)
        if (existingExchange === "done" || existingExchange === "pending") {
          router.replace("/integrations?section=instagram")
          return
        }
        window.sessionStorage.setItem(exchangeKey, "pending")
      }

      try {
        const result = await connectWithOAuthCode({ code, state })

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(exchangeKey, "done")
        }

        if (result.status === "connected") {
          toast.success(
            result.username
              ? `Connected @${result.username}`
              : "Instagram account connected"
          )
        } else {
          toast.info(
            "Instagram account saved. Add a webhook base URL to receive DMs."
          )
        }
      } catch (connectError) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(exchangeKey)
        }
        toast.error(getConnectErrorMessage(connectError))
      }

      router.replace("/integrations?section=instagram")
    }

    void completeOAuth()
  }, [connectWithOAuthCode, router, searchParams])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Connecting Instagram</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Finishing authorization and saving your account...
        </p>
      </div>
    </div>
  )
}
