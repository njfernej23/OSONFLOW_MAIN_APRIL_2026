"use node"

import {
  fetchGoogleSheetValues,
  type GoogleSheetsAuth,
} from "./googleSheetsAuth"
import {
  canonicalColumnKey,
  columnListIncludes,
  newValueParameterName,
  resolveByColumnName,
  resolveHeaderForColumn,
} from "./googleSheetsColumns"
import {
  buildGvizSelectClause,
  buildGvizWhereClause,
  buildHeaderLetterMap,
  columnIndexToLetter,
  fetchWithRetry,
  queryGoogleSheetWithGviz,
  resolveHeaderLetter,
  type GoogleSheetsMatchMode,
} from "./googleSheetsQuery"

export type GoogleSheetsOperation = "lookup" | "append" | "update" | "delete"
export type GoogleSheetsQueryStrategy = "gviz" | "scan"
export type { GoogleSheetsMatchMode }

export type SheetRowRecord = {
  _sheetRowNumber: number
  [column: string]: string | number
}

export type GoogleSheetsOperationOptions = {
  auth: GoogleSheetsAuth
  spreadsheetId: string
  range: string
  operation: GoogleSheetsOperation
  searchColumns?: string[]
  valueColumns?: string[]
  updateColumns?: string[]
  returnColumns?: string[]
  matchMode?: GoogleSheetsMatchMode
  queryStrategy?: GoogleSheetsQueryStrategy
  headerRow?: number
  dataRange?: string
  maxLookupRows?: number
  maxScanRows?: number
  requireUniqueMatch?: boolean
  args: Record<string, unknown>
}

type SheetRangeParts = {
  sheetName: string
  range: string
}

type SearchEntry = [string, string]

const DEFAULT_MAX_LOOKUP_ROWS = 25
const DEFAULT_MAX_SCAN_ROWS = 5000

const parseSheetRange = (range: string): SheetRangeParts => {
  const trimmed = range.trim() || "Sheet1"

  if (trimmed.includes("!")) {
    const [sheetName] = trimmed.split("!")
    return {
      sheetName: sheetName?.trim() || "Sheet1",
      range: trimmed,
    }
  }

  return {
    sheetName: trimmed,
    range: trimmed,
  }
}

const resolveReadRange = ({
  sheetName,
  range,
  dataRange,
  headerRow,
  maxScanRows,
}: {
  sheetName: string
  range: string
  dataRange?: string
  headerRow: number
  maxScanRows: number
}) => {
  if (dataRange?.trim()) {
    const trimmed = dataRange.trim()
    return trimmed.includes("!") ? trimmed : `${sheetName}!${trimmed}`
  }

  if (range.includes("!")) {
    return range
  }

  // Bound unbounded tab reads for scan fallback
  const endRow = Math.max(headerRow + maxScanRows, headerRow + 1)
  return `${sheetName}!A${headerRow}:ZZ${endRow}`
}

export const parseSheetRowsWithIndices = (
  values: string[][],
  headerRow = 1
) => {
  if (values.length === 0) {
    return { headers: [] as string[], rows: [] as SheetRowRecord[] }
  }

  const [headerRowValues, ...dataRows] = values
  const headers = (headerRowValues ?? []).map((header) => header.trim())

  const rows = dataRows.map((row, index) => {
    const record: SheetRowRecord = {
      _sheetRowNumber: headerRow + 1 + index,
    }
    headers.forEach((header, columnIndex) => {
      if (!header) return
      record[header] = (row[columnIndex] ?? "").trim()
    })
    return record
  })

  return { headers, rows }
}

const normalizeArgMap = (args: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(args).map(([key, value]) => [key, String(value ?? "").trim()])
  )

const describeColumns = (columns: string[]) =>
  columns.filter(Boolean).join(", ")

const describeCriteria = (searchEntries: SearchEntry[]) =>
  searchEntries.length === 0
    ? "the values provided"
    : searchEntries.map(([key, value]) => `${key}: ${value}`).join(", ")

const projectReturnColumns = (
  row: Record<string, string>,
  returnColumns?: string[]
) => {
  if (!returnColumns || returnColumns.length === 0) {
    return row
  }

  const projected: Record<string, string> = {}
  for (const column of returnColumns) {
    if (column in row) {
      projected[column] = row[column] ?? ""
    }
  }
  return Object.keys(projected).length > 0 ? projected : row
}

export const formatSheetLookupContext = (
  matches: Array<Record<string, string>>,
  args: Record<string, unknown>,
  maxChars = 12_000
) => {
  const criteria = Object.entries(normalizeArgMap(args))
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ")

  const formattedRows = matches
    .map((row, index) => {
      const fields = Object.entries(row)
        .map(([key, value]) => `  - ${key}: ${value}`)
        .join("\n")
      return `Row ${index + 1}:\n${fields}`
    })
    .join("\n\n")

  const full = [
    `Sheet lookup found ${matches.length} matching row(s).`,
    "Use every field listed below when answering — do not omit fields or claim data is missing when it appears here.",
    "",
    `Search criteria: ${criteria || "none provided"}`,
    "",
    formattedRows,
  ].join("\n")

  if (full.length <= maxChars) {
    return full
  }

  return `${full.slice(0, maxChars)}\n\n[Results truncated for size. Ask for a more specific search if needed.]`
}

const MIN_PHONE_DIGITS = 7

const digitsOnly = (value: string) => value.replace(/\D/g, "")

/**
 * Whether a value is a bare number or a formatted one — a phone number, an
 * order id, an amount. Spreadsheets store these as numbers, so what comes back
 * ("940431330") and what the visitor says ("+998 94 043 13 30") are the same
 * value written two ways.
 */
const isNumericLike = (value: string) => {
  const trimmed = value.trim()

  if (!trimmed) {
    return false
  }

  return /^[+(]?[\d\s()\-.+]+$/.test(trimmed) && digitsOnly(trimmed).length > 0
}

/**
 * Compares two numeric values by their digits, so separators and a country
 * code cannot hide a match. Requires enough digits that the comparison is
 * about one specific record: a two-digit quantity column must never match a
 * phone number that happens to end in the same pair.
 */
const numericEquivalent = (cell: string, value: string) => {
  const cellDigits = digitsOnly(cell)
  const valueDigits = digitsOnly(value)

  if (
    cellDigits.length < MIN_PHONE_DIGITS ||
    valueDigits.length < MIN_PHONE_DIGITS
  ) {
    return cellDigits === valueDigits && cellDigits.length > 0
  }

  return (
    cellDigits === valueDigits ||
    cellDigits.endsWith(valueDigits) ||
    valueDigits.endsWith(cellDigits)
  )
}

const cellMatches = (
  cell: string,
  value: string,
  matchMode: GoogleSheetsMatchMode
) => {
  if (matchMode === "equals") {
    return cell === value
  }

  const numeric = isNumericLike(cell) && isNumericLike(value)

  if (matchMode === "exact") {
    return (
      cell.toLowerCase() === value.toLowerCase() ||
      (numeric && numericEquivalent(cell, value))
    )
  }

  return (
    cell.toLowerCase().includes(value.toLowerCase()) ||
    (numeric && numericEquivalent(cell, value))
  )
}

export const findMatchingRows = (
  rows: SheetRowRecord[],
  searchEntries: SearchEntry[],
  matchMode: GoogleSheetsMatchMode = "contains",
  maxLookupRows = DEFAULT_MAX_LOOKUP_ROWS
) => {
  if (searchEntries.length === 0) {
    return []
  }

  const matches: SheetRowRecord[] = []
  for (const row of rows) {
    const ok = searchEntries.every(([key, value]) =>
      cellMatches(String(resolveByColumnName(row, key) ?? ""), value, matchMode)
    )
    if (ok) {
      matches.push(row)
      if (matches.length >= maxLookupRows) {
        break
      }
    }
  }

  return matches
}

const sheetsRequest = async (
  auth: GoogleSheetsAuth,
  url: string,
  init?: RequestInit
) => {
  const requestUrl =
    auth.method === "api_key"
      ? `${url}${url.includes("?") ? "&" : "?"}key=${auth.apiKey}`
      : url

  const response = await fetchWithRetry(
    requestUrl,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
    },
    auth
  )

  return (await response.json().catch(() => null)) as Record<string, unknown>
}

const getSheetId = async (
  auth: GoogleSheetsAuth,
  spreadsheetId: string,
  sheetName: string
) => {
  const payload = await sheetsRequest(
    auth,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`
  )

  const sheets = (payload?.sheets ?? []) as Array<{
    properties?: { sheetId?: number; title?: string }
  }>

  const match = sheets.find((sheet) => sheet.properties?.title === sheetName)

  if (match?.properties?.sheetId === undefined) {
    throw new Error(`Sheet "${sheetName}" was not found in this spreadsheet.`)
  }

  return match.properties.sheetId
}

const fetchHeaderRow = async ({
  auth,
  spreadsheetId,
  sheetName,
  headerRow,
}: {
  auth: GoogleSheetsAuth
  spreadsheetId: string
  sheetName: string
  headerRow: number
}) => {
  const values = await fetchGoogleSheetValues({
    spreadsheetId,
    range: `${sheetName}!${headerRow}:${headerRow}`,
    auth,
  })
  return (values[0] ?? []).map((header) => header.trim())
}

/**
 * The arguments an update tool uses to find its row, separated from the ones
 * carrying the new values.
 *
 * `new_<column>` exists precisely because a column can be on both sides of an
 * update — "find the row with this phone number, write that one" — so those
 * arguments are never read as filters.
 */
const getSearchEntries = (
  argMap: Record<string, string>,
  searchColumns: string[],
  excludedNames: Set<string>
): SearchEntry[] =>
  Object.entries(argMap).filter(
    ([key, value]) =>
      value &&
      !excludedNames.has(canonicalColumnKey(key)) &&
      (searchColumns.length === 0 || columnListIncludes(searchColumns, key))
  )

/** The `new_<column>` argument names an update tool declares. */
const getNewValueParameterNames = (updateColumns: string[]) =>
  new Set(updateColumns.map((column) => newValueParameterName(column)))

/**
 * The values an update should write, keyed by the sheet column they belong to.
 *
 * A column that also finds the row is only written when its `new_<column>`
 * argument is present: the plain argument is the filter, and treating it as
 * the new value would rewrite the cell with what was already in it.
 */
const resolveUpdateValues = ({
  argMap,
  searchColumns,
  updateColumns,
}: {
  argMap: Record<string, string>
  searchColumns: string[]
  updateColumns: string[]
}) => {
  const values = new Map<string, string>()

  const columns =
    updateColumns.length > 0
      ? updateColumns
      : // No update columns configured: every argument that is not a filter is
        // taken as a value to write, which is how these tools behaved before
        // the column pickers existed.
        Object.keys(argMap).map((key) =>
          key.startsWith("new_") ? key.slice("new_".length) : key
        )

  for (const column of columns) {
    if (!column.trim()) {
      continue
    }

    const explicit = resolveByColumnName(argMap, newValueParameterName(column))

    if (explicit !== undefined && explicit !== "") {
      values.set(column, explicit)
      continue
    }

    if (columnListIncludes(searchColumns, column)) {
      continue
    }

    const direct = resolveByColumnName(argMap, column)

    if (direct !== undefined && direct !== "") {
      values.set(column, direct)
    }
  }

  return values
}

const shouldUseGviz = (
  queryStrategy: GoogleSheetsQueryStrategy,
  searchEntries: SearchEntry[]
) => {
  if (queryStrategy === "scan") return false
  if (searchEntries.length === 0) return false

  // A gviz query cannot compare a numeric cell with a text literal, and it has
  // no way to ignore the separators in a typed phone number. Both are what the
  // local scan is for, so anything numeric skips the server-side query rather
  // than failing over to it after a wasted round trip.
  if (searchEntries.some(([, value]) => isNumericLike(value))) return false

  return true
}

const lookupViaGviz = async ({
  auth,
  spreadsheetId,
  sheetName,
  headers,
  searchEntries,
  returnColumns,
  matchMode,
  maxLookupRows,
}: {
  auth: GoogleSheetsAuth
  spreadsheetId: string
  sheetName: string
  headers: string[]
  searchEntries: SearchEntry[]
  returnColumns?: string[]
  matchMode: GoogleSheetsMatchMode
  maxLookupRows: number
}) => {
  const headerLetterMap = buildHeaderLetterMap(headers)
  const select = buildGvizSelectClause({
    returnColumns,
    headerLetterMap,
    headers,
  })
  const where = buildGvizWhereClause({
    searchEntries,
    headerLetterMap,
    matchMode,
  })

  const tq = `SELECT ${select} WHERE ${where} LIMIT ${maxLookupRows}`
  const { rows } = await queryGoogleSheetWithGviz({
    auth,
    spreadsheetId,
    sheetName,
    tq,
  })

  return rows.map((row) => projectReturnColumns(row, returnColumns))
}

type MutationTarget = {
  headers: string[]
  matches: SheetRowRecord[]
  ambiguousCount?: number
  scanTruncated: boolean
}

/**
 * Locates the row an update or delete should act on.
 *
 * gviz does not return sheet row numbers, so it can only rule the sheet out
 * early: no match, or too many. The row itself always comes from a bounded
 * values scan, and a failed gviz probe degrades to that scan rather than
 * failing the whole operation.
 */
const resolveMutationTarget = async ({
  auth,
  spreadsheetId,
  sheetName,
  searchEntries,
  matchMode,
  maxLookupRows,
  maxScanRows,
  headerRow,
  dataRange,
  range,
  preferGviz,
}: {
  auth: GoogleSheetsAuth
  spreadsheetId: string
  sheetName: string
  searchEntries: SearchEntry[]
  matchMode: GoogleSheetsMatchMode
  maxLookupRows: number
  maxScanRows: number
  headerRow: number
  dataRange?: string
  range: string
  preferGviz: boolean
}): Promise<MutationTarget> => {
  let headers: string[] = []

  try {
    headers = await fetchHeaderRow({ auth, spreadsheetId, sheetName, headerRow })
  } catch (error) {
    console.error(
      "Google Sheets header read failed, falling back to the scan range:",
      error instanceof Error ? error.message : error
    )
  }

  if (preferGviz && headers.length > 0) {
    try {
      const headerLetterMap = buildHeaderLetterMap(headers)
      const where = buildGvizWhereClause({
        searchEntries,
        headerLetterMap,
        matchMode,
      })
      const firstLetter =
        resolveHeaderLetter(headerLetterMap, searchEntries[0]![0]) ??
        columnIndexToLetter(0)
      const tq = `SELECT ${firstLetter} WHERE ${where} LIMIT ${Math.max(
        maxLookupRows + 1,
        2
      )}`
      const { rows: matched } = await queryGoogleSheetWithGviz({
        auth,
        spreadsheetId,
        sheetName,
        tq,
      })

      // An empty server-side result is not proof of absence — a value stored
      // with different spacing only matches on the scan below — so only the
      // "too many to be one record" answer short-circuits.
      if (matched.length > maxLookupRows) {
        return {
          headers,
          matches: [],
          ambiguousCount: matched.length,
          scanTruncated: false,
        }
      }
    } catch (error) {
      console.error(
        "Google Sheets gviz probe failed, scanning instead:",
        error instanceof Error ? error.message : error
      )
    }
  }

  const readRange = resolveReadRange({
    sheetName,
    range,
    dataRange,
    headerRow,
    maxScanRows,
  })
  const values = await fetchGoogleSheetValues({
    spreadsheetId,
    range: readRange,
    auth,
  })
  const parsed = parseSheetRowsWithIndices(values, headerRow)

  return {
    headers: headers.length > 0 ? headers : parsed.headers,
    matches: findMatchingRows(
      parsed.rows,
      searchEntries,
      matchMode,
      maxLookupRows + 1
    ),
    scanTruncated: parsed.rows.length >= maxScanRows,
  }
}

const appendedRowNumber = (payload: Record<string, unknown> | null) => {
  const updatedRange = (
    payload?.updates as { updatedRange?: string } | undefined
  )?.updatedRange

  const match = updatedRange?.match(/![A-Z]+(\d+)/)

  return match?.[1] ? Number(match[1]) : null
}

export const executeGoogleSheetsOperation = async ({
  auth,
  spreadsheetId,
  range,
  operation,
  searchColumns = [],
  valueColumns = [],
  updateColumns = [],
  returnColumns = [],
  matchMode = "contains",
  queryStrategy = "gviz",
  headerRow = 1,
  dataRange,
  maxLookupRows = DEFAULT_MAX_LOOKUP_ROWS,
  maxScanRows = DEFAULT_MAX_SCAN_ROWS,
  requireUniqueMatch = true,
  args,
}: GoogleSheetsOperationOptions) => {
  if (auth.method === "api_key" && operation !== "lookup") {
    throw new Error(
      "Add, update, and delete require Connect Google account. API keys only support lookups."
    )
  }

  const { sheetName } = parseSheetRange(range)
  const argMap = normalizeArgMap(args)
  const searchEntries = getSearchEntries(
    argMap,
    searchColumns,
    operation === "update"
      ? getNewValueParameterNames(updateColumns)
      : new Set<string>()
  )
  const useGviz = shouldUseGviz(queryStrategy, searchEntries)
  const searchColumnLabel = describeColumns(searchColumns)

  // A read or a write with nothing to match on is refused rather than defaulted
  // to "the first few rows". Answering an empty lookup with real rows hands the
  // sheet's contents to whoever asked for nothing, and an empty delete would
  // otherwise resolve to whichever row happened to come first.
  if (operation !== "append" && searchEntries.length === 0) {
    const columnHint = searchColumnLabel
      ? ` This tool finds the row by: ${searchColumnLabel}.`
      : ""

    return operation === "lookup"
      ? `No search values were provided. Ask the user for at least one of this tool's search fields, then look the record up.${columnHint}`
      : `No search values were provided. Ask the user which existing record they mean, then call this tool again with the value already stored in the sheet.${columnHint} Do not add a new row instead.`
  }

  // Append: header row only — never pull the full sheet
  if (operation === "append") {
    const headers = await fetchHeaderRow({
      auth,
      spreadsheetId,
      sheetName,
      headerRow,
    })

    if (headers.length === 0 || headers.every((header) => !header)) {
      throw new Error(
        "The sheet range must include a header row so columns can be mapped."
      )
    }

    const rowValues = headers.map((header) => {
      if (!header) return ""
      if (valueColumns.length > 0 && !columnListIncludes(valueColumns, header)) {
        return ""
      }
      return resolveByColumnName(argMap, header) ?? ""
    })

    const endColumn = columnIndexToLetter(Math.max(headers.length - 1, 0))
    const appendRange = `${sheetName}!A:${endColumn}`

    const payload = await sheetsRequest(
      auth,
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        appendRange
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        body: JSON.stringify({ values: [rowValues] }),
      }
    )

    const rowNumber = appendedRowNumber(payload)
    const written = JSON.stringify(
      Object.fromEntries(
        headers
          .map((header, index) => [header, rowValues[index] ?? ""])
          .filter(([header]) => Boolean(header))
      )
    )

    return `Added ${
      rowNumber ? `row ${rowNumber}` : "a new row"
    } to ${sheetName}: ${written}. This record now exists — if the user corrects any of these values, change this row with the update tool instead of adding another one.`
  }

  // Lookup via gviz (server-side WHERE) when possible
  if (operation === "lookup" && useGviz) {
    try {
      const headers = await fetchHeaderRow({
        auth,
        spreadsheetId,
        sheetName,
        headerRow,
      })

      if (headers.length === 0) {
        throw new Error(
          "The sheet range must include a header row so columns can be mapped."
        )
      }

      const matches = await lookupViaGviz({
        auth,
        spreadsheetId,
        sheetName,
        headers,
        searchEntries,
        returnColumns,
        matchMode,
        maxLookupRows,
      })

      if (matches.length > 0) {
        const uniqueMatches = [
          ...new Map(
            matches.map((row) => [JSON.stringify(row), row] as const)
          ).values(),
        ]

        return JSON.stringify(uniqueMatches, null, 2)
      }

      // An empty server-side result is not proof: a value stored as a number,
      // or one written with different spacing, only matches on the scan below.
    } catch (error) {
      // Fall through to scan fallback
      console.error(
        "Google Sheets gviz lookup failed, falling back to scan:",
        error instanceof Error ? error.message : error
      )
    }
  }

  if (operation === "lookup") {
    const readRange = resolveReadRange({
      sheetName,
      range,
      dataRange,
      headerRow,
      maxScanRows,
    })

    const values = await fetchGoogleSheetValues({
      spreadsheetId,
      range: readRange,
      auth,
    })
    const { rows } = parseSheetRowsWithIndices(values, headerRow)

    const matches = findMatchingRows(
      rows,
      searchEntries,
      matchMode,
      maxLookupRows
    ).map(({ _sheetRowNumber, ...row }) =>
      projectReturnColumns(
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, String(value ?? "")])
        ),
        returnColumns
      )
    )

    if (matches.length === 0) {
      return rows.length >= maxScanRows
        ? `No matching rows were found in the first ${maxScanRows} rows of ${sheetName}, which is as far as this tool reads. Tell the user the record could not be found rather than guessing.`
        : "No matching rows were found in the Google Sheet."
    }

    const uniqueMatches = [
      ...new Map(
        matches.map((row) => [JSON.stringify(row), row] as const)
      ).values(),
    ]

    return JSON.stringify(uniqueMatches, null, 2)
  }

  // Update / delete: one path, so the row that is found is always the row that
  // is written. A write that throws after Google already applied it must
  // surface — retrying a delete would remove whichever row shifted up into its
  // place — so nothing below this point is caught and retried.
  const { headers, matches, ambiguousCount, scanTruncated } =
    await resolveMutationTarget({
      auth,
      spreadsheetId,
      sheetName,
      searchEntries,
      matchMode,
      maxLookupRows,
      maxScanRows,
      headerRow,
      dataRange,
      range,
      preferGviz: useGviz,
    })

  if (headers.length === 0) {
    throw new Error(
      "The sheet range must include a header row so columns can be mapped."
    )
  }

  const otherColumns = describeColumns(
    headers.filter((header) => header && !columnListIncludes(searchColumns, header))
  )

  if (ambiguousCount !== undefined || (requireUniqueMatch && matches.length > 1)) {
    const count = ambiguousCount ?? matches.length
    return `${count} rows in ${sheetName} match ${describeCriteria(
      searchEntries
    )}, so it is not clear which one the user means. Ask the user for a value that tells those records apart${
      otherColumns ? ` (for example ${otherColumns})` : ""
    }, then call this tool again. Do not guess, and do not add a new row.`
  }

  if (matches.length === 0) {
    const truncationNote = scanTruncated
      ? ` Only the first ${maxScanRows} rows of the sheet were checked.`
      : ""

    return `No row in ${sheetName} matched ${describeCriteria(
      searchEntries
    )}.${truncationNote} The record may be stored under a different value — ask the user to confirm ${
      searchColumnLabel || "the details you searched with"
    } and try again. Do not add a new row unless the user explicitly asks to create a new record.`
  }

  const targetRow = matches[0]!

  if (operation === "delete") {
    const sheetId = await getSheetId(auth, spreadsheetId, sheetName)

    await sheetsRequest(
      auth,
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: targetRow._sheetRowNumber - 1,
                  endIndex: targetRow._sheetRowNumber,
                },
              },
            },
          ],
        }),
      }
    )

    const { _sheetRowNumber, ...rowSnapshot } = targetRow
    return `Deleted row ${_sheetRowNumber} from ${sheetName}: ${JSON.stringify(rowSnapshot)}`
  }

  const updateValues = resolveUpdateValues({
    argMap,
    searchColumns,
    updateColumns,
  })

  if (updateValues.size === 0) {
    const changeable = describeColumns(
      updateColumns.length > 0 ? updateColumns : headers.filter(Boolean)
    )

    return `The row was found, but no new values were provided, so nothing was changed. Ask the user what the corrected value should be and call this tool again with it${
      changeable ? ` — this tool can change: ${changeable}` : ""
    }.`
  }

  // Resolved against the sheet's own header, never the argument's spelling, so
  // a canonical match cannot invent a column that the write then misses.
  const nextRow: SheetRowRecord = { ...targetRow }
  const changedColumns: string[] = []
  const writes: Array<{ range: string; values: string[][] }> = []

  for (const [column, value] of updateValues) {
    const header = resolveHeaderForColumn(headers, column)
    const columnIndex = header ? headers.indexOf(header) : -1

    if (!header || columnIndex < 0) {
      continue
    }

    nextRow[header] = value
    changedColumns.push(header)
    writes.push({
      range: `${sheetName}!${columnIndexToLetter(columnIndex)}${targetRow._sheetRowNumber}`,
      values: [[value]],
    })
  }

  if (writes.length === 0) {
    return `The row was found, but none of the values provided match a column in ${sheetName}. Its columns are: ${describeColumns(
      headers.filter(Boolean)
    )}.`
  }

  // Only the changed cells are written. Rewriting the whole row would blank a
  // column the sheet has but the header row does not name, and would overwrite
  // a formula with the value it had last rendered to.
  await sheetsRequest(
    auth,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: writes,
      }),
    }
  )

  const { _sheetRowNumber, ...rowSnapshot } = nextRow
  return `Updated row ${targetRow._sheetRowNumber} in ${sheetName} (changed ${describeColumns(
    changedColumns
  )}). The row now reads: ${JSON.stringify(rowSnapshot)}`
}
