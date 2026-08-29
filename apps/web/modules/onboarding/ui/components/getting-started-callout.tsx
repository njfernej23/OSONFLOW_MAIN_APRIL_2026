"use client"

import Link from "next/link"
import { api } from "@workspace/backend/_generated/api"
import { useQuery } from "convex/react"
import { ArrowRightIcon, CompassIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Meter } from "@/modules/dashboard/ui/components/console"

/**
 * A quiet pointer back to the guide, for someone who skipped it and is now
 * looking at a page full of numbers wondering what to do. Disappears for good
 * once setup is finished.
 */
export const GettingStartedCallout = () => {
  const status = useQuery(api.private.onboarding.getStatus)

  if (!status || status.isSetupComplete) {
    return null
  }

  const remaining = status.totalCount - status.completedCount

  return (
    <div className="console-card flex flex-col gap-3 border-primary/30 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <span className="console-medallion size-9 shrink-0">
        <CompassIcon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Your assistant isn&apos;t live yet
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {remaining} step{remaining === 1 ? "" : "s"} left before customers can
          talk to it. These numbers stay empty until then.
        </p>
      </div>

      <div className="w-full shrink-0 sm:w-40">
        <p className="flex items-baseline justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">Setup</span>
          <span className="console-numeral">
            {status.completedCount}/{status.totalCount}
          </span>
        </p>
        <Meter
          className="mt-1.5"
          value={Math.round((status.completedCount / status.totalCount) * 100)}
        />
      </div>

      <Button asChild className="shrink-0 gap-1.5" size="sm">
        <Link href="/start">
          Continue setup
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Button>
    </div>
  )
}
