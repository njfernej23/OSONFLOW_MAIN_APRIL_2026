"use node"

import { ConvexError, v } from "convex/values"
import { action } from "../_generated/server"
import { requireOrganizationIdentity } from "../lib/organizationIdentity"
import { resolveGoogleSheetsAuth } from "../lib/googleSheetsAuth"
import {
  listGoogleSpreadsheets,
  listSpreadsheetColumnHeaders,
  listSpreadsheetColumnHeadersWithApiKey,
  listSpreadsheetTabs,
  listSpreadsheetTabsWithApiKey,
} from "../lib/googleSheetsDrive"

const getAuthContext = async (
  ctx: Parameters<typeof requireOrganizationIdentity>[0]
) => {
  const { identity, orgId } = await requireOrganizationIdentity(ctx)

  return {
    organizationId: orgId,
  }
}

const requireOAuthAccessToken = async (
  ctx: Parameters<typeof resolveGoogleSheetsAuth>[0],
  organizationId: string
) => {
  const auth = await resolveGoogleSheetsAuth(ctx, organizationId)

  if (!auth || auth.method !== "oauth") {
    throw new ConvexError(
      "Connect your Google account to browse spreadsheets. API keys cannot list your Drive files."
    )
  }

  return auth.accessToken
}

export const listSpreadsheets = action({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const accessToken = await requireOAuthAccessToken(ctx, organizationId)

    try {
      return await listGoogleSpreadsheets(accessToken)
    } catch (error) {
      throw new ConvexError(
        error instanceof Error
          ? error.message
          : "Unable to load spreadsheets from Google Drive."
      )
    }
  },
})

export const listSpreadsheetTabsForPicker = action({
  args: {
    spreadsheetId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const spreadsheetId = args.spreadsheetId.trim()

    if (!spreadsheetId) {
      return []
    }

    const { organizationId } = await getAuthContext(ctx)
    const auth = await resolveGoogleSheetsAuth(ctx, organizationId)

    if (!auth) {
      throw new ConvexError(
        "Connect Google Sheets or save an API key to browse spreadsheet tabs."
      )
    }

    try {
      if (auth.method === "oauth") {
        return await listSpreadsheetTabs(auth.accessToken, spreadsheetId)
      }

      return await listSpreadsheetTabsWithApiKey(auth.apiKey, spreadsheetId)
    } catch (error) {
      throw new ConvexError(
        error instanceof Error
          ? error.message
          : "Unable to load tabs for this spreadsheet."
      )
    }
  },
})

export const listSpreadsheetColumnHeadersForPicker = action({
  args: {
    spreadsheetId: v.string(),
    sheetName: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const spreadsheetId = args.spreadsheetId.trim()
    const sheetName = args.sheetName.trim()

    if (!spreadsheetId || !sheetName) {
      return []
    }

    const { organizationId } = await getAuthContext(ctx)
    const auth = await resolveGoogleSheetsAuth(ctx, organizationId)

    if (!auth) {
      throw new ConvexError(
        "Connect Google Sheets or save an API key to load column headers."
      )
    }

    try {
      if (auth.method === "oauth") {
        return await listSpreadsheetColumnHeaders(
          auth.accessToken,
          spreadsheetId,
          sheetName
        )
      }

      return await listSpreadsheetColumnHeadersWithApiKey(
        auth.apiKey,
        spreadsheetId,
        sheetName
      )
    } catch (error) {
      throw new ConvexError(
        error instanceof Error
          ? error.message
          : "Unable to load column headers for this sheet tab."
      )
    }
  },
})
