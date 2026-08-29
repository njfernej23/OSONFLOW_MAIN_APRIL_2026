"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import type { ToolAuthSpec } from "../../catalog"

/**
 * Structured editor over the `headersJson` string the runtime already reads.
 *
 * Credentials get their own masked field instead of sitting in a raw JSON
 * textarea, which is the difference between a config box and something an
 * operations team is willing to type a production token into. Everything still
 * serialises back to the same JSON object, so the stored shape is unchanged.
 */

type AuthMode = "none" | "bearer" | "basic"

type HeaderRow = { id: string; key: string; value: string }

type RequestHeadersEditorProps = {
  value: string
  onChange: (value: string) => void
  /** What the vendor calls this credential, so the field is not just "token". */
  authSpec?: ToolAuthSpec
}

const rowId = () => Math.random().toString(36).slice(2, 10)

const parseHeaders = (raw: string) => {
  let parsed: Record<string, string> = {}

  try {
    const candidate = JSON.parse(raw?.trim() ? raw : "{}") as unknown

    if (
      typeof candidate === "object" &&
      candidate !== null &&
      !Array.isArray(candidate)
    ) {
      parsed = Object.fromEntries(
        Object.entries(candidate as Record<string, unknown>).map(
          ([key, entry]) => [key, String(entry ?? "")]
        )
      )
    }
  } catch {
    return {
      authMode: "none" as AuthMode,
      credential: "",
      rows: [],
      invalid: true,
    }
  }

  const authorization = parsed.Authorization ?? parsed.authorization ?? ""
  let authMode: AuthMode = "none"
  let credential = ""

  if (authorization.startsWith("Bearer ")) {
    authMode = "bearer"
    credential = authorization.slice("Bearer ".length)
  } else if (authorization.startsWith("Basic ")) {
    authMode = "basic"
    credential = authorization.slice("Basic ".length)
  }

  const rows: HeaderRow[] = Object.entries(parsed)
    .filter(([key]) => {
      if (authMode === "none") return true
      return key.toLowerCase() !== "authorization"
    })
    .map(([key, entry]) => ({ id: rowId(), key, value: entry }))

  return { authMode, credential, rows, invalid: false }
}

const serializeHeaders = (
  authMode: AuthMode,
  credential: string,
  rows: HeaderRow[]
) => {
  const headers: Record<string, string> = {}

  if (authMode === "bearer" && credential.trim()) {
    headers.Authorization = `Bearer ${credential.trim()}`
  }

  if (authMode === "basic" && credential.trim()) {
    headers.Authorization = `Basic ${credential.trim()}`
  }

  for (const row of rows) {
    if (!row.key.trim()) continue
    headers[row.key.trim()] = row.value
  }

  return JSON.stringify(headers, null, 2)
}

/**
 * Mount this with a `key` tied to the tool being edited: the initial parse is
 * the only hydration, so typing never fights a re-parse of its own output.
 */
export const RequestHeadersEditor = ({
  value,
  onChange,
  authSpec,
}: RequestHeadersEditorProps) => {
  const initial = useMemo(() => parseHeaders(value), [])
  const [authMode, setAuthMode] = useState<AuthMode>(initial.authMode)
  const [credential, setCredential] = useState(initial.credential)
  const [rows, setRows] = useState<HeaderRow[]>(initial.rows)
  const [showCredential, setShowCredential] = useState(false)
  const [isRawMode, setIsRawMode] = useState(initial.invalid)
  const [rawError, setRawError] = useState<string | null>(
    initial.invalid ? "Stored headers are not valid JSON." : null
  )

  const commit = (
    nextMode: AuthMode,
    nextCredential: string,
    nextRows: HeaderRow[]
  ) => {
    setAuthMode(nextMode)
    setCredential(nextCredential)
    setRows(nextRows)
    onChange(serializeHeaders(nextMode, nextCredential, nextRows))
  }

  if (isRawMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Headers JSON</Label>
          <Button
            onClick={() => {
              const parsed = parseHeaders(value)
              if (parsed.invalid) {
                setRawError("Fix the JSON before switching back.")
                return
              }
              setAuthMode(parsed.authMode)
              setCredential(parsed.credential)
              setRows(parsed.rows)
              setRawError(null)
              setIsRawMode(false)
            }}
            size="xs"
            type="button"
            variant="ghost"
          >
            Use guided editor
          </Button>
        </div>
        <Textarea
          className="font-mono text-xs"
          onChange={(event) => {
            onChange(event.target.value)
            try {
              JSON.parse(event.target.value || "{}")
              setRawError(null)
            } catch {
              setRawError("Not valid JSON yet.")
            }
          }}
          rows={5}
          value={value}
        />
        {rawError ? (
          <p className="console-tone-warning flex items-center gap-1.5 text-xs">
            <TriangleAlertIcon className="size-3.5" />
            {rawError}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {authSpec && authSpec.kind !== "none" ? (
        <div className="console-inset flex flex-wrap items-start justify-between gap-2 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium">{authSpec.label}</p>
            {authSpec.hint ? (
              <p className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">
                {authSpec.hint}
              </p>
            ) : null}
          </div>
          {authSpec.docsUrl ? (
            <a
              className="inline-flex shrink-0 items-center gap-1 text-[0.7rem] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              href={authSpec.docsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Where to get it
              <ExternalLinkIcon className="size-3" />
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Authentication</Label>
          <Button
            onClick={() => setIsRawMode(true)}
            size="xs"
            type="button"
            variant="ghost"
          >
            Edit as JSON
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
          <Select
            onValueChange={(next: AuthMode) => commit(next, credential, rows)}
            value={authMode}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No auth header</SelectItem>
              <SelectItem value="bearer">Bearer token</SelectItem>
              <SelectItem value="basic">Basic (base64)</SelectItem>
            </SelectContent>
          </Select>

          {authMode === "none" ? (
            <p className="console-inset flex items-center px-3 text-xs text-muted-foreground">
              Add an API key as a custom header below if the provider expects
              one.
            </p>
          ) : (
            <div className="relative">
              <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9 pl-9 font-mono text-xs"
                onChange={(event) => commit(authMode, event.target.value, rows)}
                placeholder={
                  authMode === "bearer" ? "sk_live_…" : "base64(user:password)"
                }
                type={showCredential ? "text" : "password"}
                value={credential}
              />
              <button
                aria-label={
                  showCredential ? "Hide credential" : "Show credential"
                }
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowCredential((current) => !current)}
                type="button"
              >
                {showCredential ? (
                  <EyeOffIcon className="size-3.5" />
                ) : (
                  <EyeIcon className="size-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Request headers</Label>
          <Button
            onClick={() =>
              commit(authMode, credential, [
                ...rows,
                { id: rowId(), key: "", value: "" },
              ])
            }
            size="xs"
            type="button"
            variant="outline"
          >
            <PlusIcon />
            Add header
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="console-inset px-3 py-3 text-xs text-muted-foreground">
            Only{" "}
            <code className="font-mono">Content-Type: application/json</code> is
            sent by default.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                className={cn(
                  "grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]"
                )}
                key={row.id}
              >
                <Input
                  className="font-mono text-xs"
                  onChange={(event) =>
                    commit(
                      authMode,
                      credential,
                      rows.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, key: event.target.value }
                          : entry
                      )
                    )
                  }
                  placeholder="X-Api-Key"
                  value={row.key}
                />
                <Input
                  className="font-mono text-xs"
                  onChange={(event) =>
                    commit(
                      authMode,
                      credential,
                      rows.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, value: event.target.value }
                          : entry
                      )
                    )
                  }
                  placeholder="value"
                  value={row.value}
                />
                <Button
                  aria-label={`Remove header ${row.key || index + 1}`}
                  onClick={() =>
                    commit(
                      authMode,
                      credential,
                      rows.filter((_, entryIndex) => entryIndex !== index)
                    )
                  }
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
