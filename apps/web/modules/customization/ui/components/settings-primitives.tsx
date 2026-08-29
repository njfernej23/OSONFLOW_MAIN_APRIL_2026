"use client"

import type { ComponentType, ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * The field vocabulary for the widget customization tab.
 *
 * Every editor section is built from these four shapes — a titled group, a
 * label/control row, a set of choice cards and a numeric scrubber — so a
 * setting looks the same wherever it lives. Colours, radii and hairlines all
 * come from the console token set; nothing here invents its own.
 */

type IconType = ComponentType<{ className?: string }>

/* ── groups ─────────────────────────────────────────────────────────────── */

export const SettingsGroup = ({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  icon?: IconType
  actions?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <section className={cn("min-w-0", className)}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="console-medallion mt-px size-8 shrink-0">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="console-section-title">{title}</h3>
          {description ? (
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
    <div className="mt-4 min-w-0 space-y-3">{children}</div>
  </section>
)

/** Hairline divider between groups inside one tab. */
export const SettingsDivider = () => <div className="console-rule my-7" />

/* ── rows ───────────────────────────────────────────────────────────────── */

/**
 * A label/description on the left, a control on the right. Used for switches
 * and anything else that reads as a single decision.
 */
export const SettingRow = ({
  label,
  description,
  control,
  children,
  className,
  tone = "default",
}: {
  label: ReactNode
  description?: ReactNode
  /** Rendered on the trailing edge, vertically centred. */
  control?: ReactNode
  /** Rendered under the label, full width — for a revealed sub-form. */
  children?: ReactNode
  className?: string
  tone?: "default" | "quiet"
}) => (
  <div
    className={cn(
      tone === "quiet" ? "console-card-quiet" : "console-inset",
      "px-4 py-3.5",
      className
    )}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-none font-medium text-foreground">
          {label}
        </p>
        {description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {control ? <div className="shrink-0 pt-0.5">{control}</div> : null}
    </div>
    {children ? <div className="mt-4 min-w-0">{children}</div> : null}
  </div>
)

/* ── choice cards ───────────────────────────────────────────────────────── */

export type OptionCard<T extends string> = {
  value: T
  label: string
  hint?: string
  icon?: ReactNode
  /** A small rendered sample instead of an icon — a swatch, a type specimen. */
  preview?: ReactNode
}

export const OptionCards = <T extends string>({
  options,
  value,
  onChange,
  columns = 3,
  className,
}: {
  options: OptionCard<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 2 | 3 | 4
  className?: string
}) => (
  <div
    className={cn(
      "grid gap-2",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-2 sm:grid-cols-3",
      columns === 4 && "grid-cols-2 sm:grid-cols-4",
      className
    )}
    role="radiogroup"
  >
    {options.map((option) => {
      const isSelected = option.value === value

      return (
        <button
          aria-checked={isSelected}
          className={cn(
            "console-inset flex min-w-0 flex-col items-start gap-2 px-3 py-3 text-left transition-all duration-150",
            "hover:border-[var(--console-hairline)] hover:bg-muted/45",
            isSelected &&
              "border-primary/45 bg-primary/[0.06] ring-1 ring-primary/20"
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          {option.preview ? (
            <span className="w-full min-w-0">{option.preview}</span>
          ) : option.icon ? (
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-[8px] border transition-colors",
                isSelected
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-[var(--console-hairline-soft)] bg-background text-muted-foreground"
              )}
            >
              {option.icon}
            </span>
          ) : null}
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate text-xs font-medium",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {option.label}
            </span>
            {option.hint ? (
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/70">
                {option.hint}
              </span>
            ) : null}
          </span>
        </button>
      )
    })}
  </div>
)

/* ── numeric scrubber ───────────────────────────────────────────────────── */

/**
 * A slider paired with the live value. Every dimension in the widget (radius,
 * offsets, launcher size, delays) uses this rather than a bare number input,
 * so magnitudes stay comparable across sections.
 */
export const NumberScrubber = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  description,
  disabled,
  marks,
  className,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  label: string
  description?: string
  disabled?: boolean
  /** Optional quick-jump values rendered as chips under the track. */
  marks?: number[]
  className?: string
}) => {
  const safeValue = Number.isFinite(value) ? value : min

  return (
    <div className={cn("min-w-0", disabled && "opacity-55", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <span className="console-numeral text-xs text-muted-foreground">
          {safeValue}
          {unit ? (
            <span className="ml-0.5 text-[10px] text-muted-foreground/70">
              {unit}
            </span>
          ) : null}
        </span>
      </div>
      <input
        aria-label={label}
        className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--console-hairline)] accent-[var(--primary)] outline-none disabled:cursor-not-allowed"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={safeValue}
      />
      {marks?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {marks.map((mark) => (
            <button
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                mark === safeValue
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-[var(--console-hairline-soft)] bg-muted/35 text-muted-foreground hover:text-foreground"
              )}
              disabled={disabled}
              key={mark}
              onClick={() => onChange(mark)}
              type="button"
            >
              {mark}
              {unit}
            </button>
          ))}
        </div>
      ) : null}
      {description ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

/* ── inline notice ──────────────────────────────────────────────────────── */

export const SettingsNotice = ({
  icon: Icon,
  title,
  children,
  tone = "info",
}: {
  icon?: IconType
  title: string
  children?: ReactNode
  tone?: "info" | "warning" | "accent"
}) => (
  <div
    className={cn(
      "console-inset flex items-start gap-3 px-4 py-3.5",
      tone === "warning" && "border-[color-mix(in_srgb,var(--console-warning)_36%,transparent)] bg-[color-mix(in_srgb,var(--console-warning)_8%,transparent)]",
      tone === "accent" && "border-primary/25 bg-primary/[0.06]"
    )}
  >
    {Icon ? (
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "warning"
            ? "console-tone-warning"
            : tone === "accent"
              ? "text-primary"
              : "console-tone-info"
        )}
      />
    ) : null}
    <div className="min-w-0">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      {children ? (
        <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      ) : null}
    </div>
  </div>
)
