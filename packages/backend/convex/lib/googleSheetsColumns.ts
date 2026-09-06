/**
 * How a Google Sheets tool's arguments are named, and how those names are
 * matched back to the sheet's own column headers.
 *
 * Both the dashboard editor and the runtime derive a Sheets tool's parameters
 * from the columns picked in its config, so this module is the single place
 * that decides what those parameters are called. Keeping two copies of the
 * rule is what let "Update row" ship with no argument for the new value: the
 * update parameter was dropped whenever its column was also a search column,
 * leaving the model a single `telefon` argument that could only ever be used
 * as a filter.
 */

export type SheetsToolOperation = "lookup" | "append" | "update" | "delete"

export type SheetsToolParameter = {
  name: string
  description: string
  type: "string" | "number" | "boolean"
  required: boolean
}

/**
 * The form a column header and a tool parameter name are compared in.
 *
 * Parameters are generated from the sheet's own headers, so a header like
 * "Xizmat Turi" becomes a parameter the model would otherwise have to
 * reproduce space for space. Anything it emits instead — `xizmat_turi`,
 * "Xizmat turi" — used to miss, and a miss is invisible: the row is still
 * written, the cell is just blank. Folding case and punctuation makes those
 * all land in the right column.
 */
export const canonicalColumnKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

/** Same fold, for matching a configured column list against a header. */
export const columnListIncludes = (columns: string[], header: string) => {
  if (columns.includes(header)) {
    return true
  }

  const target = canonicalColumnKey(header)

  if (!target) {
    return false
  }

  return columns.some((column) => canonicalColumnKey(column) === target)
}

/**
 * Reads a value out of a record keyed by column name, exact match first so a
 * sheet with two headers that differ only in punctuation stays predictable.
 * Used in both directions: a header against the model's arguments, and an
 * argument name against a row.
 */
export const resolveByColumnName = <T>(
  record: Record<string, T>,
  key: string
): T | undefined => {
  if (record[key] !== undefined) {
    return record[key]
  }

  const target = canonicalColumnKey(key)

  if (!target) {
    return undefined
  }

  for (const [candidate, value] of Object.entries(record)) {
    if (canonicalColumnKey(candidate) === target) {
      return value
    }
  }

  return undefined
}

/** Finds the sheet's own spelling of a column, so writes never invent one. */
export const resolveHeaderForColumn = (headers: string[], column: string) => {
  const target = canonicalColumnKey(column)

  return headers.find(
    (header) => header === column || canonicalColumnKey(header) === target
  )
}

/**
 * Prefix for the "value to write" half of an update tool.
 *
 * An update needs two arguments for the same column — the value that finds the
 * row and the value that replaces it — and one parameter name cannot carry
 * both. Search keeps the plain column name; the replacement is `new_<column>`.
 */
export const NEW_VALUE_PARAMETER_PREFIX = "new_"

export const newValueParameterName = (column: string) =>
  `${NEW_VALUE_PARAMETER_PREFIX}${canonicalColumnKey(column)}`

const uniqueColumns = (columns: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const column of columns) {
    const trimmed = column.trim()
    const key = canonicalColumnKey(trimmed)

    if (!trimmed || !key || seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(trimmed)
  }

  return result
}

const buildColumnParameters = (
  columns: string[],
  describe: (column: string) => string,
  requiredColumn?: string
): SheetsToolParameter[] =>
  uniqueColumns(columns).map((column) => ({
    name: canonicalColumnKey(column),
    description: describe(column),
    type: "string" as const,
    required: column === requiredColumn,
  }))

/**
 * The arguments a Sheets tool exposes to the model, derived from its columns.
 *
 * Returns an empty list when no columns are configured yet — callers decide
 * whether that means "show a blank row in the editor" or "keep what is stored".
 */
export const buildGoogleSheetsToolParameters = ({
  operation,
  searchColumns = [],
  valueColumns = [],
  updateColumns = [],
}: {
  operation: SheetsToolOperation
  searchColumns?: string[]
  valueColumns?: string[]
  updateColumns?: string[]
}): SheetsToolParameter[] => {
  if (operation === "append") {
    const columns = uniqueColumns(valueColumns)
    return buildColumnParameters(
      columns,
      (column) => `Value for the "${column}" column of the new row.`,
      columns[0]
    )
  }

  const search = uniqueColumns(searchColumns)

  if (operation !== "update") {
    return buildColumnParameters(
      search,
      (column) =>
        `Value to find the row by, matched against the "${column}" column.`,
      search[0]
    )
  }

  const searchParameters = buildColumnParameters(
    search,
    (column) =>
      `The value already stored in the "${column}" column, used to find the row to change. Never pass the new value here.`,
    search[0]
  )

  const takenNames = new Set(searchParameters.map((parameter) => parameter.name))

  const updateParameters = uniqueColumns(updateColumns).map((column) => {
    const plainName = canonicalColumnKey(column)
    // A column that also finds the row needs a second, distinct argument —
    // otherwise there is no way to say "find this phone, write that one".
    const name = takenNames.has(plainName)
      ? newValueParameterName(column)
      : plainName

    takenNames.add(name)

    return {
      name,
      description: `New value to write into the "${column}" column, replacing what is there.`,
      type: "string" as const,
      required: false,
    }
  })

  return [...searchParameters, ...updateParameters]
}

/**
 * The parameters the model actually gets for a Sheets tool.
 *
 * Derived from config rather than read from the stored list, so tools saved
 * before the update tool had a `new_<column>` argument start working without
 * anyone reopening and re-saving them.
 */
export const resolveGoogleSheetsToolParameters = <
  T extends {
    type: string
    parameters: SheetsToolParameter[]
    config?: {
      operation?: SheetsToolOperation
      searchColumns?: string[]
      valueColumns?: string[]
      updateColumns?: string[]
    } | null
  },
>(
  tool: T
): SheetsToolParameter[] => {
  if (tool.type !== "google_sheets") {
    return tool.parameters
  }

  const derived = buildGoogleSheetsToolParameters({
    operation: tool.config?.operation ?? "lookup",
    searchColumns: tool.config?.searchColumns ?? [],
    valueColumns: tool.config?.valueColumns ?? [],
    updateColumns: tool.config?.updateColumns ?? [],
  })

  return derived.length > 0 ? derived : tool.parameters
}
