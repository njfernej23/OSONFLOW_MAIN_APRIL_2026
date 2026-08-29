"use client"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Completed-steps donut. Reads at a glance from the rail without needing the
 * numbers, and animates the stroke rather than the layout so a step completing
 * never shifts anything around it.
 */
export const ProgressRing = ({
  value,
  total,
  size = 56,
  className,
}: {
  value: number
  total: number
  size?: number
  className?: string
}) => {
  const safeTotal = Math.max(total, 1)
  const fraction = Math.min(Math.max(value / safeTotal, 0), 1)
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const isComplete = value >= safeTotal

  return (
    <span
      aria-label={`${value} of ${total} steps complete`}
      className={cn("relative inline-flex shrink-0", className)}
      role="img"
      style={{ height: size, width: size }}
    >
      <svg className="-rotate-90" height={size} width={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="var(--console-hairline)"
          strokeWidth={stroke}
        />
        <circle
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={
            isComplete ? "var(--console-positive)" : "var(--primary)"
          }
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </svg>
      <span className="console-numeral absolute inset-0 flex items-center justify-center text-[11px]">
        {value}
        <span className="text-muted-foreground/70">/{total}</span>
      </span>
    </span>
  )
}
