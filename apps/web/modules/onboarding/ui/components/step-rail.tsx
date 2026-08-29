"use client"

import { CheckIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { ONBOARDING_STEPS, type OnboardingStepId } from "../../lib/steps"
import { ProgressRing } from "./progress-ring"

/**
 * The progress rail.
 *
 * Steps stay clickable even before they are reached — an owner who already has
 * the widget installed should be able to jump straight to the part they care
 * about rather than being marched through a locked sequence.
 *
 * It is a vertical path on a wide screen and a horizontal strip on a phone, so
 * the guide never spends half a small viewport on navigation.
 */

const Marker = ({
  index,
  isDone,
  isActive,
}: {
  index: number
  isDone: boolean
  isActive: boolean
}) => (
  <span
    className={cn(
      "relative z-10 flex size-[23px] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-200",
      isDone
        ? "border-transparent bg-[var(--console-positive)] text-white"
        : isActive
          ? "border-primary bg-background text-primary ring-4 ring-primary/15"
          : "border-[var(--console-hairline)] bg-background text-muted-foreground group-hover:border-foreground/40"
    )}
  >
    {isDone ? (
      <CheckIcon className="size-3" />
    ) : (
      <span className="console-numeral text-[10px]">{index + 1}</span>
    )}
  </span>
)

export const StepRail = ({
  activeStep,
  doneById,
  completedCount,
  totalCount,
  onSelect,
}: {
  activeStep: OnboardingStepId
  doneById: Record<OnboardingStepId, boolean>
  completedCount: number
  totalCount: number
  onSelect: (stepId: OnboardingStepId) => void
}) => {
  const headline =
    completedCount === totalCount
      ? "You're live"
      : completedCount === 0
        ? "Let's begin"
        : "Nearly there"

  return (
    <nav aria-label="Setup steps" className="console-card p-4">
      <div className="flex items-center gap-3.5">
        <ProgressRing total={totalCount} value={completedCount} />
        <div className="min-w-0">
          <p className="console-eyebrow">Setup</p>
          <p className="mt-1 text-sm leading-tight font-semibold">{headline}</p>
        </div>
      </div>

      {/* Wide screens: a vertical path. */}
      <ol className="relative mt-5 hidden lg:block">
        <span
          aria-hidden
          className="absolute top-3 bottom-3 left-[11px] w-px bg-[var(--console-hairline-soft)]"
        />

        {ONBOARDING_STEPS.map((step, index) => {
          const isDone = doneById[step.id]
          const isActive = step.id === activeStep

          return (
            <li key={step.id}>
              <button
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-[10px] py-2 pr-2 text-left transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
                onClick={() => onSelect(step.id)}
                type="button"
              >
                <Marker index={index} isActive={isActive} isDone={isDone} />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-xs",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {step.railLabel}
                </span>
                {isActive ? (
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>

      {/* Phones: one scrollable strip, so the pane stays above the fold. */}
      <ol className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
        {ONBOARDING_STEPS.map((step, index) => {
          const isDone = doneById[step.id]
          const isActive = step.id === activeStep

          return (
            <li className="shrink-0" key={step.id}>
              <button
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/[0.07] font-semibold text-foreground"
                    : "border-[var(--console-hairline-soft)] bg-muted/35 font-medium text-muted-foreground"
                )}
                onClick={() => onSelect(step.id)}
                type="button"
              >
                <Marker index={index} isActive={isActive} isDone={isDone} />
                {step.railLabel}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
