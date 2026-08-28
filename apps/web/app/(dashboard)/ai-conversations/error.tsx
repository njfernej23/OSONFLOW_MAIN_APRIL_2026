"use client"

import { Button } from "@workspace/ui/components/button"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const AIConversationsError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) => {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="console-page flex h-full w-full items-center justify-center p-6">
      <div className="console-card flex w-full max-w-[26rem] flex-col items-center gap-4 px-8 py-10 text-center">
        <p className="text-[0.95rem] font-semibold text-foreground">
          This voicechat couldn’t load
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Try again, or go back to the AI voicechats list.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button
            onClick={() => router.push("/ai-conversations")}
            variant="outline"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AIConversationsError
