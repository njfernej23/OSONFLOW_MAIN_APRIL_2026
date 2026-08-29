import type { ComponentType } from "react"

import type { ConsoleTone } from "@/modules/dashboard/ui/components/console"
import type {
  AssistantTool,
  BuiltinToolType,
  IntegrationToolType,
} from "../constants"

/**
 * The catalog is the product surface for "what can my assistant do?".
 *
 * Every entry is either shippable today — it compiles down to one of the tool
 * types the runtime already executes (`google_sheets`, `api_request`,
 * `custom_webhook`) — or explicitly marked as roadmap. Nothing here fakes a
 * capability: a `planned` blueprint has no draft and cannot be installed.
 *
 * Adding an offering is a data change: append a blueprint to one of the
 * category files and it shows up in the catalog, in search, in the category
 * filters, in the detail sheet and in the installed-tool presentation
 * (brand mark + vendor) without touching a component.
 */

export type CatalogIcon = ComponentType<{ className?: string }>

export type CatalogStatus = "included" | "available" | "planned"

export type CatalogCategoryId =
  | "assistant"
  | "data"
  | "messaging"
  | "crm"
  | "productivity"
  | "automation"
  | "custom"

/** What the tool does to the system on the other end — shown as a badge. */
export type ToolEffect = "read" | "write" | "notify"

export type ToolAuthKind =
  | "none"
  | "bearer"
  | "header"
  | "basic"
  | "query"
  | "secret_url"
  | "google_oauth"

/**
 * How the endpoint is authenticated. The editor turns this into a labelled,
 * masked credential field instead of asking an operator to hand-write JSON.
 */
export type ToolAuthSpec = {
  kind: ToolAuthKind
  /** What the operator is being asked for, in the vendor's own words. */
  label: string
  /** Where that credential comes from. */
  hint?: string
  /** Header that carries the credential when `kind` is `header`. */
  headerName?: string
  /** Where the credential is issued. */
  docsUrl?: string
}

/** The editor payload a blueprint expands into when it is installed. */
export type ToolDraft = {
  type: IntegrationToolType
  name: string
  description: string
  parameters: AssistantTool["parameters"]
  config: NonNullable<AssistantTool["config"]>
  enabledForVoice: boolean
}

export type ToolBlueprint = {
  id: string
  title: string
  vendor: string
  category: CatalogCategoryId
  summary: string
  status: CatalogStatus
  icon: CatalogIcon
  tone: ConsoleTone
  /** Vendor hue, used for the brand mark. Must read on light and dark. */
  brand: string
  tags: string[]
  effect: ToolEffect
  /** Three or four specifics for the detail sheet. */
  highlights?: string[]
  /** How the endpoint is authenticated, if at all. */
  auth?: ToolAuthSpec
  /** Surfaced in the spotlight row at the top of the catalog. */
  featured?: boolean
  /** Shown in the editor once the tool exists — what still needs filling in. */
  setupHint?: string
  /** Placeholder for the endpoint field, so the shape of the URL is obvious. */
  endpointPlaceholder?: string
  /** Provider documentation for the endpoint this blueprint calls. */
  docsUrl?: string
  /** Substrings used to recognise an installed tool as this blueprint. */
  hostHints?: string[]
  /** Sheets blueprints need the workspace Google connection. */
  requiresGoogle?: boolean
  /** Set on `included` blueprints — the built-in tool row they configure. */
  builtinType?: BuiltinToolType
  /** Present on `available` blueprints only. */
  draft?: () => ToolDraft
}

export type ToolPresentation = {
  icon: CatalogIcon
  tone: ConsoleTone
  brand: string
  vendor: string
  typeLabel: string
  blueprint?: ToolBlueprint
}
