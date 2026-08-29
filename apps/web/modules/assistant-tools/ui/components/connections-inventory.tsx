"use client"

import { cn } from "@workspace/ui/lib/utils"
import { GlobeLockIcon, KeyRoundIcon } from "lucide-react"

import {
  EmptyState,
  Pill,
  toneClass,
} from "@/modules/dashboard/ui/components/console"
import { resolveToolPresentation } from "../../catalog"
import type { AssistantTool } from "../../constants"
import {
  AUTH_KIND_LABELS,
  CREDENTIAL_STATE_COPY,
  credentialState,
} from "../../lib/tool-auth"
import { BrandMark } from "./brand-mark"

/**
 * Every outside system this workspace's assistants can reach, in one list.
 *
 * Credentials live inside each tool's own config, which makes them easy to set
 * and hard to audit. This rolls them up by host so an admin can answer "what
 * are we calling, and is anything still on an example key?" without opening
 * every tool.
 */

type HostEntry = {
  host: string
  vendor: string
  brand: string
  icon: ReturnType<typeof resolveToolPresentation>["icon"]
  tools: AssistantTool[]
  authLabel: string
  needsAttention: boolean
  detail: string
}

const hostOf = (tool: AssistantTool) => {
  const raw = (tool.config?.url ?? tool.config?.webhookUrl ?? "").trim()

  if (!raw) return null

  try {
    return new URL(raw).host
  } catch {
    return null
  }
}

const buildEntries = (tools: AssistantTool[]): HostEntry[] => {
  const entries = new Map<string, HostEntry>()

  for (const tool of tools) {
    if (tool.isBuiltin || tool.type === "google_sheets") continue

    const host = hostOf(tool)

    if (!host) continue

    const presentation = resolveToolPresentation(tool)
    const auth = presentation.blueprint?.auth
    const state = credentialState(tool.config ?? {}, auth)
    const existing = entries.get(host)

    if (existing) {
      existing.tools.push(tool)
      existing.needsAttention =
        existing.needsAttention ||
        state === "missing" ||
        state === "placeholder"
      continue
    }

    entries.set(host, {
      host,
      vendor: presentation.vendor,
      brand: presentation.brand,
      icon: presentation.icon,
      tools: [tool],
      authLabel: auth ? AUTH_KIND_LABELS[auth.kind] : "Custom headers",
      needsAttention: state === "missing" || state === "placeholder",
      detail:
        state === "not_required"
          ? "No credential required"
          : CREDENTIAL_STATE_COPY[state],
    })
  }

  return [...entries.values()].sort((a, b) => a.host.localeCompare(b.host))
}

export const ConnectionsInventory = ({ tools }: { tools: AssistantTool[] }) => {
  const entries = buildEntries(tools)

  if (entries.length === 0) {
    return (
      <EmptyState
        description="Once a tool points at an endpoint it shows up here, with the credential it uses and whether that credential has actually been filled in."
        icon={GlobeLockIcon}
        title="No outbound endpoints yet"
      />
    )
  }

  return (
    <div className="divide-y divide-[var(--console-hairline-soft)]">
      {entries.map((entry) => (
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
          key={entry.host}
        >
          <BrandMark brand={entry.brand} icon={entry.icon} size="sm" />

          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs font-medium text-foreground">
              {entry.host}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {entry.vendor} · {entry.tools.length} tool
              {entry.tools.length === 1 ? "" : "s"}
            </p>
          </div>

          <span className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <KeyRoundIcon className="size-3" />
            {entry.authLabel}
          </span>

          <Pill tone={entry.needsAttention ? "warning" : "positive"}>
            {entry.detail}
          </Pill>

          <span
            aria-hidden
            className={cn(
              "console-dot",
              entry.tools.some((tool) => tool.isEnabled)
                ? toneClass.positive
                : toneClass.neutral
            )}
          />
        </div>
      ))}
    </div>
  )
}
