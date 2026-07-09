"use node"

import type { GoogleSheetsAuth } from "./googleSheetsAuth"

export type GoogleSheetsMatchMode = "contains" | "exact" | "equals"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const columnIndexToLetter = (index: number) => {
  let value = index + 1
  let letters = ""

  while (value > 0) {
    const remainder = (value - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    value = Math.floor((value - 1) / 26)
  }

  return letters
}

export const escapeGvizString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/'/g, "''")

export const buildHeaderLetterMap = (headers: string[]) => {
  const map = new Map<string, string>()

  headers.forEach((header, index) => {
    const trimmed = header.trim()
    if (!trimmed || map.has(trimmed)) return
    map.set(trimmed, columnIndexToLetter(index))
  })

  return map
}

export const buildGvizWhereClause = ({
  searchEntries,
  headerLetterMap,
  matchMode,
}: {
  searchEntries: Array<[string, string]>
  headerLetterMap: Map<string, string>
  matchMode: GoogleSheetsMatchMode
}) => {
  if (searchEntries.length === 0) {
    return ""
  }

  const parts: string[] = []

  for (const [column, value] of searchEntries) {
    const letter = headerLetterMap.get(column)
    if (!letter) {
      throw new Error(
        `Search column "${column}" was not found in the sheet header row.`
      )
    }

    const escaped = escapeGvizString(value)

    if (matchMode === "contains") {
      parts.push(`${letter} CONTAINS '${escaped}'`)
    } else if (matchMode === "equals") {
      parts.push(`${letter} = '${escaped}'`)
    } else {
      // exact: case-insensitive via lower() when possible
      parts.push(`lower(${letter}) = '${escaped.toLowerCase()}'`)
    }
  }

  return parts.join(" AND ")
}

export const buildGvizSelectClause = ({
  returnColumns,
  headerLetterMap,
  headers,
}: {
  returnColumns?: string[]
  headerLetterMap: Map<string, string>
  headers: string[]
}) => {
  const columns =
    returnColumns && returnColumns.length > 0
      ? returnColumns
      : headers.filter(Boolean)

  const letters = columns
    .map((column) => headerLetterMap.get(column))
    .filter((letter): letter is string => Boolean(letter))

  if (letters.length === 0) {
    return "*"
  }

  return letters.join(", ")
}

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      cells.push(current)
      current = ""
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

export const parseGvizCsv = (csv: string) => {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { headers: [] as string[], rows: [] as Array<Record<string, string>> }
  }

  const headers = parseCsvLine(lines[0]!).map((header) => header.trim())
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (!header) return
      record[header] = (cells[index] ?? "").trim()
    })
    return record
  })

  return { headers, rows }
}

const buildAuthHeaders = (auth: GoogleSheetsAuth): Record<string, string> => {
  if (auth.method === "oauth") {
    return { Authorization: `Bearer ${auth.accessToken}` }
  }
  return {}
}

export const fetchWithRetry = async (
  url: string,
  init: RequestInit | undefined,
  auth: GoogleSheetsAuth,
  maxAttempts = 3
) => {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...buildAuthHeaders(auth),
        ...(init?.headers as Record<string, string> | undefined),
      },
    })

    if (response.ok) {
      return response
    }

    const status = response.status
    const bodyText = await response.text().catch(() => "")
    let message = bodyText.slice(0, 500) || `Google request failed (${status}).`

    try {
      const parsed = JSON.parse(bodyText) as {
        error?: { message?: string }
      }
      if (parsed?.error?.message) {
        message = parsed.error.message
      }
    } catch {
      // keep text message
    }

    lastError = new Error(message)

    const retryable = status === 429 || status >= 500
    if (!retryable || attempt === maxAttempts) {
      throw lastError
    }

    await sleep(250 * 2 ** (attempt - 1))
  }

  throw lastError ?? new Error("Google request failed.")
}

export const queryGoogleSheetWithGviz = async ({
  auth,
  spreadsheetId,
  sheetName,
  tq,
}: {
  auth: GoogleSheetsAuth
  spreadsheetId: string
  sheetName: string
  tq: string
}) => {
  const params = new URLSearchParams({
    sheet: sheetName,
    headers: "1",
    tq,
    tqx: "out:csv",
  })

  if (auth.method === "api_key") {
    params.set("key", auth.apiKey)
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`
  const response = await fetchWithRetry(url, undefined, auth)
  const csv = await response.text()

  if (csv.includes("google.visualization.Query.setResponse")) {
    // JSONP-style error/response — try to extract error
    const errorMatch = csv.match(/"reason"\s*:\s*"([^"]+)"/)
    throw new Error(
      errorMatch?.[1]
        ? `Google Sheets query failed: ${errorMatch[1]}`
        : "Google Sheets query failed."
    )
  }

  return parseGvizCsv(csv)
}
