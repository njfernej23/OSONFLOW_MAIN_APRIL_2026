import type { ConsoleTone } from "@/modules/dashboard/ui/components/console"
import type { AssistantTool } from "../constants"
import type {
  CatalogCategoryId,
  CatalogIcon,
  ToolAuthSpec,
  ToolBlueprint,
  ToolEffect,
} from "./types"

type Parameter = AssistantTool["parameters"][number]

export const json = (value: unknown) => JSON.stringify(value, null, 2)

/** Required string parameter — the common case. */
export const p = (name: string, description: string): Parameter => ({
  name,
  description,
  type: "string",
  required: true,
})

/** Optional parameter, with an explicit type when it is not a string. */
export const opt = (
  name: string,
  description: string,
  type: Parameter["type"] = "string"
): Parameter => ({ name, description, type, required: false })

export const num = (
  name: string,
  description: string,
  required = true
): Parameter => ({ name, description, type: "number", required })

/* ── shared auth specs ──────────────────────────────────────────────────── */

export const bearerAuth = (
  label: string,
  hint?: string,
  docsUrl?: string
): ToolAuthSpec => ({ kind: "bearer", label, hint, docsUrl })

export const headerAuth = (
  headerName: string,
  label: string,
  hint?: string,
  docsUrl?: string
): ToolAuthSpec => ({ kind: "header", headerName, label, hint, docsUrl })

export const secretUrlAuth = (label: string, hint?: string): ToolAuthSpec => ({
  kind: "secret_url",
  label,
  hint,
})

export const noAuth = (hint?: string): ToolAuthSpec => ({
  kind: "none",
  label: "No credential",
  hint,
})

/* ── blueprint factory ──────────────────────────────────────────────────── */

type RestBlueprintSpec = {
  id: string
  title: string
  vendor: string
  brand: string
  category: CatalogCategoryId
  icon: CatalogIcon
  tone: ConsoleTone
  summary: string
  tags: string[]
  effect: ToolEffect
  highlights?: string[]
  auth?: ToolAuthSpec
  featured?: boolean
  setupHint?: string
  endpoint?: string
  endpointPlaceholder?: string
  docsUrl?: string
  hostHints?: string[]
  voice?: boolean
  /** `custom_webhook` for post-anything endpoints, otherwise `api_request`. */
  transport?: "api_request" | "custom_webhook"
  tool: {
    name: string
    description: string
    method?: "GET" | "POST"
    headers?: Record<string, string>
    /** Object bodies are serialised as JSON; a string is used verbatim. */
    body?: unknown
    parameters: Parameter[]
  }
}

/**
 * Builds an HTTP-backed blueprint. Every offering in the catalog goes through
 * here so the installed draft, the request preview and the detail sheet all
 * describe the same call.
 */
export const restBlueprint = (spec: RestBlueprintSpec): ToolBlueprint => {
  const transport = spec.transport ?? "api_request"
  const method = spec.tool.method ?? "POST"

  return {
    id: spec.id,
    title: spec.title,
    vendor: spec.vendor,
    brand: spec.brand,
    category: spec.category,
    summary: spec.summary,
    status: "available",
    icon: spec.icon,
    tone: spec.tone,
    tags: spec.tags,
    effect: spec.effect,
    highlights: spec.highlights,
    auth: spec.auth,
    featured: spec.featured,
    setupHint: spec.setupHint,
    endpointPlaceholder: spec.endpointPlaceholder,
    docsUrl: spec.docsUrl,
    hostHints: spec.hostHints,
    draft: () => ({
      type: transport,
      name: spec.tool.name,
      description: spec.tool.description,
      parameters: spec.tool.parameters,
      config:
        transport === "custom_webhook"
          ? {
              webhookUrl: spec.endpoint ?? "",
              webhookMethod: method,
            }
          : {
              url: spec.endpoint ?? "",
              method,
              headersJson: json(spec.tool.headers ?? {}),
              ...(method === "POST" && spec.tool.body !== undefined
                ? {
                    bodyTemplate:
                      typeof spec.tool.body === "string"
                        ? spec.tool.body
                        : json(spec.tool.body),
                  }
                : {}),
            },
      enabledForVoice: spec.voice ?? false,
    }),
  }
}

type PlannedSpec = {
  id: string
  title: string
  vendor: string
  brand: string
  category: CatalogCategoryId
  icon: CatalogIcon
  summary: string
  tags: string[]
  effect: ToolEffect
  highlights?: string[]
}

/** A capability on the roadmap: visible, searchable, never installable. */
export const plannedBlueprint = (spec: PlannedSpec): ToolBlueprint => ({
  ...spec,
  status: "planned",
  tone: "neutral",
})
