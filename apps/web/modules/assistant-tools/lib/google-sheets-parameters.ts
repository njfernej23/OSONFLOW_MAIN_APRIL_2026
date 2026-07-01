import type { AssistantTool } from "../constants"
import { createEmptyParameter } from "../constants"

type GoogleSheetsOperation = NonNullable<
  NonNullable<AssistantTool["config"]>["operation"]
>

const parameterDescription = (column: string) =>
  `Value for the "${column}" column in the sheet.`

const buildParameters = (
  columns: string[],
  requiredColumn?: string
): AssistantTool["parameters"] => {
  const uniqueColumns = [...new Set(columns.map((column) => column.trim()).filter(Boolean))]

  if (uniqueColumns.length === 0) {
    return [createEmptyParameter()]
  }

  return uniqueColumns.map((column) => ({
    name: column,
    description: parameterDescription(column),
    type: "string" as const,
    required: column === requiredColumn,
  }))
}

export const buildGoogleSheetsParameters = ({
  operation,
  searchColumns = [],
  valueColumns = [],
  updateColumns = [],
}: {
  operation: GoogleSheetsOperation
  searchColumns?: string[]
  valueColumns?: string[]
  updateColumns?: string[]
}): AssistantTool["parameters"] => {
  if (operation === "append") {
    return buildParameters(valueColumns, valueColumns[0])
  }

  if (operation === "update") {
    const searchParams = buildParameters(searchColumns, searchColumns[0])
    const existingNames = new Set(searchParams.map((parameter) => parameter.name))
    const updateParams = updateColumns
      .filter((column) => !existingNames.has(column))
      .map((column) => ({
        name: column,
        description: parameterDescription(column),
        type: "string" as const,
        required: false,
      }))

    return [...searchParams, ...updateParams]
  }

  return buildParameters(searchColumns, searchColumns[0])
}
