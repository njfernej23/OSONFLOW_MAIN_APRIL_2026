"use node"

import {
  fetchGoogleSheetValues,
  type GoogleSheetsAuth,
} from "./googleSheetsAuth"
import {
  buildGvizSelectClause,
  buildGvizWhereClause,
  buildHeaderLetterMap,
  columnIndexToLetter,
  fetchWithRetry,
  queryGoogleSheetWithGviz,
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

const DEFAULT_MAX_LOOKUP_ROWS = 25
const DEFAULT_MAX_SCAN_ROWS = 5000
const DEFAULT_NO_CRITERIA_ROWS = 5

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

const cellMatches = (
  cell: string,
  value: string,
  matchMode: GoogleSheetsMatchMode
) => {
  if (matchMode === "equals") {
    return cell === value
  }
  if (matchMode === "exact") {
    return cell.toLowerCase() === value.toLowerCase()
  }
  return cell.toLowerCase().includes(value.toLowerCase())
}

export const findMatchingRows = (
  rows: SheetRowRecord[],
  searchColumns: string[],
  args: Record<string, unknown>,
  matchMode: GoogleSheetsMatchMode = "contains",
  maxLookupRows = DEFAULT_MAX_LOOKUP_ROWS
) => {
  const argMap = normalizeArgMap(args)
  const searchEntries = Object.entries(argMap).filter(
    ([key, value]) =>
      value && (searchColumns.length === 0 || searchColumns.includes(key))
  )

  if (searchEntries.length === 0) {
    return rows.slice(0, DEFAULT_NO_CRITERIA_ROWS)
  }

  const matches: SheetRowRecord[] = []
  for (const row of rows) {
    const ok = searchEntries.every(([key, value]) =>
      cellMatches(String(row[key] ?? ""), value, matchMode)
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

const buildA1RowRange = (
  sheetName: string,
  rowNumber: number,
  columnCount: number
) => {
  const endColumn = columnIndexToLetter(Math.max(columnCount - 1, 0))
  return `${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`
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

const getSearchEntries = (
  args: Record<string, unknown>,
  searchColumns: string[]
) => {
  const argMap = normalizeArgMap(args)
  return Object.entries(argMap).filter(
    ([key, value]) =>
      value && (searchColumns.length === 0 || searchColumns.includes(key))
  )
}

const shouldUseGviz = (
  auth: GoogleSheetsAuth,
  queryStrategy: GoogleSheetsQueryStrategy,
  searchEntries: Array<[string, string]>
) => {
  if (queryStrategy === "scan") return false
  // gviz works best with OAuth; API key can work for public sheets
  if (searchEntries.length === 0) return false
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
  searchEntries: Array<[string, string]>
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

/**
 * gviz does not return sheet row numbers. For update/delete we use gviz only
 * to confirm match count / uniqueness, then locate the row with a bounded
 * values scan (capped by maxScanRows) using the same match mode.
 */
const findRowsForMutation = async ({
  auth,
  spreadsheetId,
  sheetName,
  headers,
  searchEntries,
  searchColumns,
  args,
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
  headers: string[]
  searchEntries: Array<[string, string]>
  searchColumns: string[]
  args: Record<string, unknown>
  matchMode: GoogleSheetsMatchMode
  maxLookupRows: number
  maxScanRows: number
  headerRow: number
  dataRange?: string
  range: string
  preferGviz: boolean
}): Promise<SheetRowRecord[]> => {
  if (preferGviz && searchEntries.length > 0) {
    const headerLetterMap = buildHeaderLetterMap(headers)
    const where = buildGvizWhereClause({
      searchEntries,
      headerLetterMap,
      matchMode,
    })
    // Only need to know how many match — select first search column
    const firstLetter =
      headerLetterMap.get(searchEntries[0]![0]) ?? columnIndexToLetter(0)
    const tq = `SELECT ${firstLetter} WHERE ${where} LIMIT ${Math.max(maxLookupRows + 1, 2)}`
    const { rows: matched } = await queryGoogleSheetWithGviz({
      auth,
      spreadsheetId,
      sheetName,
      tq,
    })

    if (matched.length === 0) {
      return []
    }

    if (matched.length > maxLookupRows) {
      // Signal ambiguity without scanning the whole sheet
      return Array.from({ length: matched.length }, (_, index) => ({
        _sheetRowNumber: -1 - index,
      }))
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
  const { rows } = parseSheetRowsWithIndices(values, headerRow)
  return findMatchingRows(
    rows,
    searchColumns,
    args,
    matchMode,
    maxLookupRows + 1
  )
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
  const searchEntries = getSearchEntries(args, searchColumns)
  const useGviz = shouldUseGviz(auth, queryStrategy, searchEntries)

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

    const argMap = normalizeArgMap(args)
    const rowValues = headers.map((header) => {
      if (!header) return ""
      if (valueColumns.length > 0 && !valueColumns.includes(header)) {
        return ""
      }
      return argMap[header] ?? ""
    })

    const endColumn = columnIndexToLetter(Math.max(headers.length - 1, 0))
    const appendRange = `${sheetName}!A:${endColumn}`

    await sheetsRequest(
      auth,
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        appendRange
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        body: JSON.stringify({ values: [rowValues] }),
      }
    )

    return `Added a new row to ${sheetName}: ${JSON.stringify(
      Object.fromEntries(
        headers
          .map((header, index) => [header, rowValues[index] ?? ""])
          .filter(([header]) => Boolean(header))
      )
    )}`
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

      if (matches.length === 0) {
        return "No matching rows were found in the Google Sheet."
      }

      const uniqueMatches = [
        ...new Map(
          matches.map((row) => [JSON.stringify(row), row] as const)
        ).values(),
      ]

      return JSON.stringify(uniqueMatches, null, 2)
    } catch (error) {
      // Fall through to scan fallback
      console.error(
        "Google Sheets gviz lookup failed, falling back to scan:",
        error instanceof Error ? error.message : error
      )
    }
  }

  // Update/delete: gviz confirms uniqueness, then bounded scan finds row number
  if (
    (operation === "update" || operation === "delete") &&
    searchEntries.length > 0
  ) {
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

      const matches = await findRowsForMutation({
        auth,
        spreadsheetId,
        sheetName,
        headers,
        searchEntries,
        searchColumns,
        args,
        matchMode,
        maxLookupRows,
        maxScanRows,
        headerRow,
        dataRange,
        range,
        preferGviz: useGviz,
      })

      if (matches.length === 0) {
        return "No matching row was found to update or delete."
      }

      if (requireUniqueMatch && matches.length > 1) {
        return `Found ${matches.length} matching rows. Please provide more specific lookup values so only one row matches.`
      }

      const targetRow = matches[0]!
      if (targetRow._sheetRowNumber < 1) {
        return `Found multiple matching rows. Please provide more specific lookup values so only one row matches.`
      }

      if (operation === "delete") {
        const sheetId = await getSheetId(auth, spreadsheetId, sheetName)
        const startIndex = targetRow._sheetRowNumber - 1
        const endIndex = targetRow._sheetRowNumber

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
                      startIndex,
                      endIndex,
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

      // update
      const argMap = normalizeArgMap(args)
      const columnsToUpdate =
        updateColumns.length > 0
          ? updateColumns
          : Object.keys(argMap).filter((key) => !searchColumns.includes(key))

      const nextRow = { ...targetRow }
      for (const column of columnsToUpdate) {
        if (argMap[column] !== undefined && argMap[column] !== "") {
          nextRow[column] = argMap[column]!
        }
      }

      const rowValues = headers.map((header) =>
        header ? (nextRow[header] ?? "") : ""
      )
      const a1Range = buildA1RowRange(
        sheetName,
        targetRow._sheetRowNumber,
        headers.length
      )

      await sheetsRequest(
        auth,
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          a1Range
        )}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [rowValues] }),
        }
      )

      const { _sheetRowNumber, ...rowSnapshot } = nextRow
      return `Updated row ${targetRow._sheetRowNumber} in ${sheetName}: ${JSON.stringify(rowSnapshot)}`
    } catch (error) {
      console.error(
        "Google Sheets mutation path failed, falling back to scan:",
        error instanceof Error ? error.message : error
      )
    }
  }

  // Scan fallback (bounded range) — used for no-criteria lookup, API issues, or queryStrategy=scan
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
  const { headers, rows } = parseSheetRowsWithIndices(values, headerRow)

  if (operation === "lookup") {
    const matches = findMatchingRows(
      rows,
      searchColumns,
      args,
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
      return "No matching rows were found in the Google Sheet."
    }

    if (rows.length >= maxScanRows && searchEntries.length > 0) {
      // Soft hint when we may have truncated the scan
    }

    const uniqueMatches = [
      ...new Map(
        matches.map((row) => [JSON.stringify(row), row] as const)
      ).values(),
    ]

    return JSON.stringify(uniqueMatches, null, 2)
  }

  if (headers.length === 0) {
    throw new Error(
      "The sheet range must include a header row so columns can be mapped."
    )
  }

  const matches = findMatchingRows(
    rows,
    searchColumns,
    args,
    matchMode,
    maxLookupRows
  )

  if (matches.length === 0) {
    return "No matching row was found to update or delete."
  }

  if (requireUniqueMatch && matches.length > 1) {
    return `Found ${matches.length} matching rows. Please provide more specific lookup values so only one row matches.`
  }

  const targetRow = matches[0]!

  if (operation === "delete") {
    const sheetId = await getSheetId(auth, spreadsheetId, sheetName)
    const startIndex = targetRow._sheetRowNumber - 1
    const endIndex = targetRow._sheetRowNumber

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
                  startIndex,
                  endIndex,
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

  if (operation === "update") {
    const argMap = normalizeArgMap(args)
    const columnsToUpdate =
      updateColumns.length > 0
        ? updateColumns
        : Object.keys(argMap).filter((key) => !searchColumns.includes(key))

    const nextRow = { ...targetRow }
    for (const column of columnsToUpdate) {
      if (argMap[column] !== undefined && argMap[column] !== "") {
        nextRow[column] = argMap[column]!
      }
    }

    const rowValues = headers.map((header) => nextRow[header] ?? "")
    const a1Range = buildA1RowRange(
      sheetName,
      targetRow._sheetRowNumber,
      headers.length
    )

    await sheetsRequest(
      auth,
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        a1Range
      )}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        body: JSON.stringify({ values: [rowValues] }),
      }
    )

    const { _sheetRowNumber, ...rowSnapshot } = nextRow
    return `Updated row ${targetRow._sheetRowNumber} in ${sheetName}: ${JSON.stringify(rowSnapshot)}`
  }

  return "Unsupported Google Sheets operation."
}
