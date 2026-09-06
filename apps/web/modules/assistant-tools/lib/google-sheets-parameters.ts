import {
  buildGoogleSheetsToolParameters,
  type SheetsToolOperation,
} from "@workspace/backend/lib/googleSheetsColumns"

import type { AssistantTool } from "../constants"
import { createEmptyParameter } from "../constants"

/**
 * The editor's view of a Sheets tool's arguments.
 *
 * The rule itself lives with the runtime that reads these arguments back, so
 * the parameters shown here are exactly the ones the model will be handed —
 * including the `new_<column>` argument an update needs when the same column
 * both finds the row and gets rewritten.
 */
export const buildGoogleSheetsParameters = ({
  operation,
  searchColumns = [],
  valueColumns = [],
  updateColumns = [],
}: {
  operation: SheetsToolOperation | undefined
  searchColumns?: string[]
  valueColumns?: string[]
  updateColumns?: string[]
}): AssistantTool["parameters"] => {
  const parameters = buildGoogleSheetsToolParameters({
    operation: operation ?? "lookup",
    searchColumns,
    valueColumns,
    updateColumns,
  })

  return parameters.length > 0 ? parameters : [createEmptyParameter()]
}
