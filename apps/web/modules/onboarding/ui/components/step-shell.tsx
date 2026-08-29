"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRightIcon, CheckIcon, ClockIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { OnboardingStepCopy } from "../../lib/steps"

/**
 * One step, one screen.
 *
 * Every pane gets the same frame — job title, one sentence of why, the actual
 * control, then a single primary action — so moving between steps never feels
 * like landing on a different product.
 */
export const StepShell = ({
  step,
  isDone,
  detail,
  children,
  footer,
}: {
  step: OnboardingStepCopy
  isDone: boolean
  detail?: string
  children: ReactNode
  footer?: ReactNode
}) => {
  const Icon = step.icon

  return (
    <section
      className="console-card animate-in overflow-hidden duration-300 fade-in-0 slide-in-from-bottom-2"
      key={step.id}
    >
      <header className="flex flex-col gap-4 border-b border-[var(--console-hairline-soft)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-[12px] border transition-colors",
              isDone
                ? "border-transparent bg-[var(--console-positive)] text-white"
                : "border-[var(--console-hairline)] bg-muted/45 text-foreground"
            )}
          >
            {isDone ? (
              <CheckIcon className="size-5" />
            ) : (
              <Icon className="size-5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg leading-tight font-semibold tracking-tight text-foreground">
                {step.title}
              </h2>
              {isDone ? (
                <span className="console-tone-wash console-tone-positive rounded-full border px-2 py-0.5 text-[10px] font-medium">
                  Done
                </span>
              ) : step.estimate === "—" ? null : (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {step.estimate}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {step.summary}
            </p>
            {!isDone ? (
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-foreground/65">
                {step.why}
              </p>
            ) : null}
            {isDone && detail ? (
              <p className="console-tone-positive mt-2 flex items-center gap-1.5 text-xs">
                <span aria-hidden className="console-dot console-tone-positive" />
                {detail}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-7 sm:py-6">{children}</div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--console-hairline-soft)] px-5 py-3.5 sm:px-7">
        <Link
          className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          href={step.fullPageHref}
        >
          {step.fullPageLabel}
          <ArrowUpRightIcon className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
        </Link>
        {footer ? (
          <div className="flex flex-wrap items-center gap-2">{footer}</div>
        ) : null}
      </footer>
    </section>
  )
}

/** A labelled field row used inside the panes. */
export const StepField = ({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <div className={cn("min-w-0", className)}>
    <label className="text-xs font-medium text-foreground">{label}</label>
    <div className="mt-2">{children}</div>
    {hint ? (
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
    ) : null}
  </div>
)
