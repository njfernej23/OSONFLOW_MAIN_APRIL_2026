"use client"

import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { DASHBOARD_MAP } from "../../lib/steps"

/**
 * "Where is everything?"
 *
 * The sidebar names a feature; this names the job. It is the part of the guide
 * people come back to, so it stays reachable from the sidebar rather than only
 * appearing once on the first visit.
 */
export const DashboardMap = () => (
  <div className="flex flex-col gap-6">
    {DASHBOARD_MAP.map((group) => (
      <section key={group.label}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="console-section-title">{group.label}</h3>
          <p className="text-xs text-muted-foreground">{group.hint}</p>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {group.entries.map((entry) => (
            <Link
              className="console-inset console-interactive group flex min-w-0 flex-col px-4 py-3.5"
              href={entry.href}
              key={entry.href}
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {entry.title}
                </span>
                <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {entry.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    ))}
  </div>
)
