import {
  CalendarClockIcon,
  SearchIcon,
  ServerCogIcon,
  ShieldCheckIcon,
  Table2Icon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react"

import type { AssistantTool } from "../constants"
import { automationBlueprints } from "./automation"
import { builtinBlueprints } from "./builtin"
import { googleCalendarBlueprints } from "./calendar"
import { crmBlueprints } from "./crm"
import { customBlueprints } from "./custom"
import { dataBlueprints } from "./data"
import { messagingBlueprints } from "./messaging"
import { productivityBlueprints } from "./productivity"
import { googleSheetsBlueprints } from "./sheets"
import type { ToolBlueprint, ToolEffect, ToolPresentation } from "./types"

export { CATALOG_CATEGORIES, CATALOG_CATEGORY_LABELS } from "./categories"
export type {
  CatalogCategoryId,
  CatalogIcon,
  CatalogStatus,
  ToolAuthKind,
  ToolAuthSpec,
  ToolBlueprint,
  ToolDraft,
  ToolEffect,
  ToolPresentation,
} from "./types"

export const TOOL_BLUEPRINTS: ToolBlueprint[] = [
  ...builtinBlueprints,
  ...googleSheetsBlueprints,
  ...googleCalendarBlueprints,
  ...messagingBlueprints,
  ...crmBlueprints,
  ...dataBlueprints,
  ...productivityBlueprints,
  ...automationBlueprints,
  ...customBlueprints,
]

export const BLUEPRINTS_BY_ID = TOOL_BLUEPRINTS.reduce(
  (map, blueprint) => {
    map[blueprint.id] = blueprint
    return map
  },
  {} as Record<string, ToolBlueprint>
)

/** Everything shippable today, which is what the counts in the UI mean. */
export const AVAILABLE_BLUEPRINTS = TOOL_BLUEPRINTS.filter(
  (blueprint) => blueprint.status !== "planned"
)

export const FEATURED_BLUEPRINTS = TOOL_BLUEPRINTS.filter(
  (blueprint) => blueprint.featured && blueprint.status !== "planned"
)

/** One vendor can ship several blueprints — the catalog counts vendors too. */
export const CATALOG_VENDOR_COUNT = new Set(
  AVAILABLE_BLUEPRINTS.map((blueprint) => blueprint.vendor)
).size

export const EFFECT_LABELS: Record<ToolEffect, string> = {
  read: "Reads data",
  write: "Writes data",
  notify: "Sends a message",
}

/* ── presentation for tools that already exist ─────────────────────────── */

const BUILTIN_PRESENTATION: Record<string, ToolPresentation> = {
  query: {
    icon: SearchIcon,
    tone: "info",
    brand: "#2a78d6",
    vendor: "Knowledge base",
    typeLabel: "Query",
  },
  handoff: {
    icon: UsersIcon,
    tone: "warning",
    brand: "#eda100",
    vendor: "Assistant action",
    typeLabel: "Handoff",
  },
  resolve: {
    icon: ShieldCheckIcon,
    tone: "positive",
    brand: "#1baf7a",
    vendor: "Assistant action",
    typeLabel: "Resolve",
  },
}

const FALLBACK_PRESENTATION: Record<string, ToolPresentation> = {
  google_sheets: {
    icon: Table2Icon,
    tone: "positive",
    brand: "#0f9d58",
    vendor: "Google Sheets",
    typeLabel: "Google Sheets",
  },
  google_calendar: {
    icon: CalendarClockIcon,
    tone: "info",
    brand: "#1a73e8",
    vendor: "Google Calendar",
    typeLabel: "Google Calendar",
  },
  api_request: {
    icon: ServerCogIcon,
    tone: "accent",
    brand: "#64748b",
    vendor: "HTTP endpoint",
    typeLabel: "API request",
  },
  custom_webhook: {
    icon: WebhookIcon,
    tone: "neutral",
    brand: "#64748b",
    vendor: "Your endpoint",
    typeLabel: "Webhook",
  },
}

/**
 * Works out which blueprint an installed tool came from so the library rail and
 * the editor can show the vendor's identity rather than a generic wrench.
 */
export const resolveToolPresentation = (
  tool: Pick<AssistantTool, "type" | "config" | "isBuiltin">
): ToolPresentation => {
  if (tool.isBuiltin) {
    return (
      BUILTIN_PRESENTATION[tool.type] ?? {
        icon: ShieldCheckIcon,
        tone: "neutral",
        brand: "#64748b",
        vendor: "Assistant action",
        typeLabel: "Assistant",
      }
    )
  }

  if (tool.type === "google_sheets") {
    const blueprint =
      BLUEPRINTS_BY_ID[`google_sheets_${tool.config?.operation ?? "lookup"}`]

    if (blueprint) {
      return {
        icon: blueprint.icon,
        tone: blueprint.tone,
        brand: blueprint.brand,
        vendor: blueprint.vendor,
        typeLabel: blueprint.title,
        blueprint,
      }
    }
  }

  if (tool.type === "google_calendar") {
    const blueprint =
      BLUEPRINTS_BY_ID[`google_calendar_${tool.config?.operation ?? "lookup"}`]

    if (blueprint) {
      return {
        icon: blueprint.icon,
        tone: blueprint.tone,
        brand: blueprint.brand,
        vendor: blueprint.vendor,
        typeLabel: blueprint.title,
        blueprint,
      }
    }
  }

  const endpoint = (tool.config?.url ?? tool.config?.webhookUrl ?? "")
    .trim()
    .toLowerCase()

  if (endpoint) {
    const matched = TOOL_BLUEPRINTS.find(
      (blueprint) =>
        blueprint.status === "available" &&
        blueprint.hostHints?.some((hint) => endpoint.includes(hint))
    )

    if (matched) {
      return {
        icon: matched.icon,
        tone: matched.tone,
        brand: matched.brand,
        vendor: matched.vendor,
        typeLabel: matched.title,
        blueprint: matched,
      }
    }
  }

  return (
    FALLBACK_PRESENTATION[tool.type] ?? {
      icon: ServerCogIcon,
      tone: "neutral",
      brand: "#64748b",
      vendor: "Custom",
      typeLabel: "Tool",
    }
  )
}
