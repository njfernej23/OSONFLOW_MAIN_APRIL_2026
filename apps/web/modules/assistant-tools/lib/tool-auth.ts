import type { AssistantTool } from "../constants"
import type { ToolAuthKind, ToolAuthSpec } from "../catalog"

/**
 * Credential plumbing shared by the editor, the readiness checklist and the
 * detail sheet.
 *
 * The runtime stores headers as a JSON string, which is fine as a wire format
 * and hostile as a UI. These helpers let the surface talk about "the Stripe
 * restricted key" while the stored shape stays exactly what the executor reads.
 */

export const AUTH_KIND_LABELS: Record<ToolAuthKind, string> = {
  none: "No credential",
  bearer: "Bearer token",
  header: "Custom header",
  basic: "Basic auth",
  query: "Credential in the URL",
  secret_url: "Secret URL",
  google_oauth: "Google account",
}

/** Values shipped in a blueprint template that are placeholders, not secrets. */
const PLACEHOLDER_HINTS = [
  "your",
  "xxxx",
  "example",
  "base64_of",
  "<",
  "…",
  "1234567890",
]

const looksLikePlaceholder = (value: string) => {
  const normalized = value.trim().toLowerCase()

  if (!normalized) return true

  return PLACEHOLDER_HINTS.some((hint) => normalized.includes(hint))
}

export const parseHeadersJson = (raw?: string): Record<string, string> => {
  if (!raw?.trim()) return {}

  try {
    const parsed = JSON.parse(raw) as unknown

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
        key,
        String(value ?? ""),
      ])
    )
  } catch {
    return {}
  }
}

export type CredentialState = "not_required" | "missing" | "placeholder" | "set"

/**
 * Whether the credential this blueprint asks for has actually been supplied.
 *
 * A template ships with `Bearer re_your_api_key` so the shape is obvious; that
 * is not a credential, and saying so is the difference between a tool that
 * works and one that 401s inside a live conversation.
 */
export const credentialState = (
  config: NonNullable<AssistantTool["config"]>,
  auth?: ToolAuthSpec
): CredentialState => {
  if (!auth || auth.kind === "none" || auth.kind === "google_oauth") {
    return "not_required"
  }

  if (auth.kind === "secret_url" || auth.kind === "query") {
    const url = (config.url ?? config.webhookUrl ?? "").trim()

    if (!url) return "missing"
    return looksLikePlaceholder(url) ? "placeholder" : "set"
  }

  const headers = parseHeadersJson(config.headersJson)
  const headerName =
    auth.kind === "header"
      ? (auth.headerName ?? "Authorization")
      : "Authorization"

  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === headerName.toLowerCase()
  )

  if (!entry) return "missing"

  const value = entry[1]
  const secret =
    auth.kind === "bearer"
      ? value.replace(/^Bearer\s+/i, "")
      : auth.kind === "basic"
        ? value.replace(/^Basic\s+/i, "")
        : value

  if (!secret.trim()) return "missing"

  return looksLikePlaceholder(secret) ? "placeholder" : "set"
}

export const CREDENTIAL_STATE_COPY: Record<
  Exclude<CredentialState, "not_required">,
  string
> = {
  missing: "No credential set",
  placeholder: "Still the example value",
  set: "Credential set",
}
