import { ConvexError } from "convex/values"
import type { Doc } from "../_generated/dataModel"

type AssistantToolConfig = NonNullable<Doc<"assistantTools">["config"]>
type AssistantToolType = Doc<"assistantTools">["type"]

export const validateAssistantToolConfig = (
  type: AssistantToolType,
  config: AssistantToolConfig | undefined
) => {
  if (type === "google_sheets") {
    if (!config?.spreadsheetId?.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Google Sheets tools require a spreadsheet ID.",
      })
    }

    const operation = config.operation ?? "lookup"
    if (!config.range?.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Google Sheets tools require a sheet tab / range.",
      })
    }

    if (
      (operation === "lookup" ||
        operation === "update" ||
        operation === "delete") &&
      (!config.searchColumns || config.searchColumns.length === 0)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Select at least one search column for this Sheets operation.",
      })
    }

    if (
      operation === "append" &&
      (!config.valueColumns || config.valueColumns.length === 0)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Select at least one value column for Add row.",
      })
    }

    if (
      operation === "update" &&
      (!config.updateColumns || config.updateColumns.length === 0)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Select at least one update column for Update row.",
      })
    }

    if (
      config.maxLookupRows !== undefined &&
      (config.maxLookupRows < 1 || config.maxLookupRows > 200)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "maxLookupRows must be between 1 and 200.",
      })
    }

    if (
      config.maxScanRows !== undefined &&
      (config.maxScanRows < 100 || config.maxScanRows > 50_000)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "maxScanRows must be between 100 and 50000.",
      })
    }

    if (
      config.headerRow !== undefined &&
      (config.headerRow < 1 || config.headerRow > 100)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "headerRow must be between 1 and 100.",
      })
    }
  }

  if (type === "google_calendar" && !config?.calendarId?.trim()) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Google Calendar tools require a calendar ID.",
    })
  }

  if (type === "api_request") {
    if (!config?.url?.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "API Request tools require a URL.",
      })
    }

    if (config.headersJson?.trim()) {
      try {
        const parsed = JSON.parse(config.headersJson) as unknown
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error("invalid")
        }
      } catch {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "headersJson must be a valid JSON object.",
        })
      }
    }
  }

  if (type === "custom_webhook" && !config?.webhookUrl?.trim()) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Custom tools require a webhook URL.",
    })
  }
}
