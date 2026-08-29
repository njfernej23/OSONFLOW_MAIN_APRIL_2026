"use client"

import { cn } from "@workspace/ui/lib/utils"
import { CheckIcon, CircleDashedIcon } from "lucide-react"

import { Meter, toneClass } from "@/modules/dashboard/ui/components/console"

/**
 * The setup checklist for the tool being edited.
 *
 * A tool that is half-configured fails at call time, inside a conversation,
 * where nobody sees it. This states what is still missing before it ships.
 */

export type ReadinessStep = {
  id: string
  label: string
  description?: string
  done: boolean
}

export const ToolReadiness = ({
  steps,
  className,
}: {
  steps: ReadinessStep[]
  className?: string
}) => {
  const done = steps.filter((step) => step.done).length
  const total = steps.length
  const isReady = done === total
  const tone = isReady ? "positive" : done === 0 ? "warning" : "accent"

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {isReady ? "Ready to call" : "Finish setup"}
        </p>
        <span className="console-numeral text-xs text-muted-foreground">
          {done}/{total}
        </span>
      </div>

      <Meter tone={tone} value={total === 0 ? 0 : (done / total) * 100} />

      <ul className="space-y-1.5">
        {steps.map((step) => (
          <li className="flex items-start gap-2.5" key={step.id}>
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                step.done
                  ? cn("console-tone-wash", toneClass.positive)
                  : "border-[var(--console-hairline)] text-muted-foreground"
              )}
            >
              {step.done ? (
                <CheckIcon className="size-2.5" />
              ) : (
                <CircleDashedIcon className="size-2.5" />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-xs font-medium",
                  step.done ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {step.label}
              </span>
              {step.description && !step.done ? (
                <span className="mt-0.5 block text-[0.7rem] leading-snug text-muted-foreground">
                  {step.description}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
