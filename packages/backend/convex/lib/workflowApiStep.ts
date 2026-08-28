/**
 * Execution for the workflow API block.
 *
 * Shared by the published runtime (system/workflowApiSteps) and the builder's
 * Run panel preview (private/workflows.previewApiStep) so a request behaves
 * identically in the test panel and in production.
 */
import {
  asString,
  isRecord,
  renderTemplate,
  type JsonRecord,
  type RuntimeVariables,
} from "./workflowEngine"
import { OutboundUrlError, safeFetch } from "./outboundUrl"

export const API_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const

export type ApiMethod = (typeof API_METHODS)[number]

export type ApiStepResult = {
  ok: boolean
  status: number
  body: string
  /** Flattened response fields, ready to merge into workflow variables. */
  variables: RuntimeVariables
  error?: string
}

const REQUEST_TIMEOUT_MS = 15_000
const MAX_BODY_CHARS = 20_000
const MAX_FLATTEN_DEPTH = 3
const MAX_FLATTEN_KEYS = 60

const normalizeMethod = (value: unknown): ApiMethod => {
  const method = asString(value).trim().toUpperCase()
  return (API_METHODS as readonly string[]).includes(method)
    ? (method as ApiMethod)
    : "GET"
}

const normalizeHeaders = (
  value: unknown,
  variables: RuntimeVariables
): Record<string, string> => {
  if (!Array.isArray(value)) {
    return {}
  }

  const headers: Record<string, string> = {}

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const key = renderTemplate(asString(entry.key), variables).trim()

    if (!key) {
      continue
    }

    headers[key] = renderTemplate(asString(entry.value), variables).trim()
  }

  return headers
}

/**
 * Expose response fields as dotted variables ({{apiResponse.user.name}}) so a
 * downstream Condition or Message can read them without a JSON step.
 */
const flattenJson = (
  value: unknown,
  prefix: string,
  out: RuntimeVariables,
  depth = 0
) => {
  if (Object.keys(out).length >= MAX_FLATTEN_KEYS) {
    return
  }

  if (value === null || value === undefined) {
    out[prefix] = ""
    return
  }

  if (typeof value !== "object") {
    out[prefix] = String(value)
    return
  }

  if (depth >= MAX_FLATTEN_DEPTH) {
    out[prefix] = JSON.stringify(value)
    return
  }

  if (Array.isArray(value)) {
    out[`${prefix}.length`] = String(value.length)
    value.slice(0, 10).forEach((entry, index) => {
      flattenJson(entry, `${prefix}.${index}`, out, depth + 1)
    })
    return
  }

  for (const [key, entry] of Object.entries(value)) {
    flattenJson(entry, `${prefix}.${key}`, out, depth + 1)
  }
}

export const runApiStep = async (
  data: JsonRecord,
  variables: RuntimeVariables
): Promise<ApiStepResult> => {
  const url = renderTemplate(asString(data.url), variables).trim()
  const responseVariable =
    asString(data.responseVariable).trim() || "apiResponse"
  const statusVariable = asString(data.statusVariable).trim() || "apiStatus"

  if (!url) {
    return {
      ok: false,
      status: 0,
      body: "",
      variables: { [statusVariable]: "0", [responseVariable]: "" },
      error: "This API step has no URL.",
    }
  }

  const method = normalizeMethod(data.method)
  const headers = normalizeHeaders(data.headers, variables)
  const rawBody = renderTemplate(asString(data.body), variables).trim()
  const sendsBody = method !== "GET" && method !== "DELETE" && rawBody.length > 0

  if (sendsBody && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json"
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    // safeFetch re-validates every redirect hop, so a workflow author cannot
    // point this block at loopback, RFC1918, or cloud metadata endpoints.
    const response = await safeFetch(url, {
      method,
      headers,
      body: sendsBody ? rawBody : undefined,
      signal: controller.signal,
    })

    const text = (await response.text()).slice(0, MAX_BODY_CHARS)
    const nextVariables: RuntimeVariables = {
      [statusVariable]: String(response.status),
      [responseVariable]: text,
    }

    try {
      flattenJson(JSON.parse(text), responseVariable, nextVariables)
    } catch {
      // Not JSON — the raw body variable is the whole result.
    }

    return {
      ok: response.ok,
      status: response.status,
      body: text,
      variables: nextVariables,
      error: response.ok
        ? undefined
        : `Request failed with status ${response.status}.`,
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError"
    const message = aborted
      ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
      : error instanceof OutboundUrlError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Request failed."

    return {
      ok: false,
      status: 0,
      body: "",
      variables: { [statusVariable]: "0", [responseVariable]: "" },
      error: message,
    }
  } finally {
    clearTimeout(timeout)
  }
}
