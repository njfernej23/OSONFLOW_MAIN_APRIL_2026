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
    <div className="flex h-full w-full items-center justify-center bg-transparent p-6">
      <div className="surface-frosted flex w-full max-w-[440px] flex-col items-center gap-4 rounded-[32px] px-10 py-12 text-center">
        <p className="text-[18px] font-semibold text-foreground">
          This voicechat couldn’t load
        </p>
        <p className="text-sm text-muted-foreground">
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
