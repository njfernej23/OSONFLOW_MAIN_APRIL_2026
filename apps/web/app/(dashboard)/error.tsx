"use client"

import { Button } from "@workspace/ui/components/button"
import { useEffect } from "react"

const DashboardError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent p-6">
      <div className="surface-frosted flex w-full max-w-[440px] flex-col items-center gap-4 rounded-[32px] px-10 py-12 text-center">
        <p className="text-[18px] font-semibold text-foreground">
          This page couldn’t load
        </p>
        <p className="text-sm text-muted-foreground">
          Reload to try again, or go back.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>Reload</Button>
          <Button onClick={() => window.history.back()} variant="outline">
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DashboardError
