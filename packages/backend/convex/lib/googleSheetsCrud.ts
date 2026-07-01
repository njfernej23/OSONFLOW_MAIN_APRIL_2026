"use node"

import {
  fetchGoogleSheetValues,
  type GoogleSheetsAuth,
} from "./googleSheetsAuth"

export type GoogleSheetsOperation = "lookup" | "append" | "update" | "delete"

export type SheetRowRecord = {
  _sheetRowNumber: number
  [column: string]: string | number
}

type SheetRangeParts = {
  sheetName: string
  range: string
}

const parseSheetRange = (range: string): SheetRangeParts => {
  const trimmed = range.trim() || "Sheet1"

  if (trimmed.includes("!")) {
    const [sheetName, rest] = trimmed.split("!")
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

const columnIndexToLetter = (index: number) => {
  let value = index + 1
  let letters = ""

  while (value > 0) {
    const remainder = (value - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    value = Math.floor((value - 1) / 26)
  }

  return letters
}

export const parseSheetRowsWithIndices = (values: string[][]) => {
  if (values.length === 0) {
    return { headers: [] as string[], rows: [] as SheetRowRecord[] }
  }

  const [headerRow, ...dataRows] = values
  const headers = (headerRow ?? []).map((header) => header.trim())

  const rows = dataRows.map((row, index) => {
    const record: SheetRowRecord = { _sheetRowNumber: index + 2 }
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

export const findMatchingRows = (
  rows: SheetRowRecord[],
  searchColumns: string[],
  args: Record<string, unknown>
) => {
  const argMap = normalizeArgMap(args)
  const searchEntries = Object.entries(argMap).filter(
    ([key, value]) => value && (searchColumns.length === 0 || searchColumns.includes(key))
  )

  if (searchEntries.length === 0) {
    return rows.slice(0, 5)
  }

  return rows.filter((row) =>
    searchEntries.every(([key, value]) => {
      const cell = String(row[key] ?? "").toLowerCase()
      return cell.includes(value.toLowerCase())
    })
  )
}

const buildAuthHeaders = (auth: GoogleSheetsAuth): Record<string, string> => {
  if (auth.method === "oauth") {
    return { Authorization: `Bearer ${auth.accessToken}` }
  }

  return {}
}

const withApiKey = (url: string, auth: GoogleSheetsAuth) =>
  auth.method === "api_key"
    ? `${url}${url.includes("?") ? "&" : "?"}key=${auth.apiKey}`
    : url

const sheetsRequest = async (
  auth: GoogleSheetsAuth,
  url: string,
  init?: RequestInit
) => {
  const response = await fetch(withApiKey(url, auth), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(auth),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.error?.message || "Google Sheets request failed."
    throw new Error(message)
  }

  return payload
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

const buildRowFromArgs = (
  headers: string[],
  args: Record<string, unknown>,
  columns?: string[]
) => {
  const argMap = normalizeArgMap(args)
  const targetColumns =
    columns && columns.length > 0
      ? columns
      : headers.length > 0
        ? headers
        : Object.keys(argMap)

  return targetColumns.map((column) => argMap[column] ?? "")
}

const buildA1RowRange = (
  sheetName: string,
  rowNumber: number,
  columnCount: number
) => {
  const endColumn = columnIndexToLetter(Math.max(columnCount - 1, 0))
  return `${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`
}

export const executeGoogleSheetsOperation = async ({
  auth,
  spreadsheetId,
  range,
  operation,
  searchColumns = [],
  valueColumns = [],
  updateColumns = [],
  args,
}: {
  auth: GoogleSheetsAuth
  spreadsheetId: string
  range: string
  operation: GoogleSheetsOperation
  searchColumns?: string[]
  valueColumns?: string[]
  updateColumns?: string[]
  args: Record<string, unknown>
}) => {
  if (auth.method === "api_key" && operation !== "lookup") {
    throw new Error(
      "Add, update, and delete require Connect Google account. API keys only support lookups."
    )
  }

  const { sheetName } = parseSheetRange(range)
  const values = await fetchGoogleSheetValues({
    spreadsheetId,
    range,
    auth,
  })
  const { headers, rows } = parseSheetRowsWithIndices(values)

  if (operation === "lookup") {
    const matches = findMatchingRows(rows, searchColumns, args).map(
      ({ _sheetRowNumber, ...row }) => row
    )

    if (matches.length === 0) {
      return "No matching rows were found in the Google Sheet."
    }

    return JSON.stringify(matches, null, 2)
  }

  if (headers.length === 0) {
    throw new Error(
      "The sheet range must include a header row so columns can be mapped."
    )
  }

  if (operation === "append") {
    const argMap = normalizeArgMap(args)
    const rowValues = headers.map((header) => {
      if (valueColumns.length > 0 && !valueColumns.includes(header)) {
        return ""
      }

      return argMap[header] ?? ""
    })

    await sheetsRequest(
      auth,
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        `${sheetName}!A:Z`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        body: JSON.stringify({ values: [rowValues] }),
      }
    )

    return `Added a new row to ${sheetName}: ${JSON.stringify(
      Object.fromEntries(headers.map((header, index) => [header, rowValues[index] ?? ""]))
    )}`
  }

  const matches = findMatchingRows(rows, searchColumns, args)

  if (matches.length === 0) {
    return "No matching row was found to update or delete."
  }

  if (matches.length > 1) {
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
