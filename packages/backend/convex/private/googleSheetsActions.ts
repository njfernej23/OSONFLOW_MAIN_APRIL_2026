"use node"

import { ConvexError, v } from "convex/values"
import { action } from "../_generated/server"
import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { resolveGoogleSheetsAuth } from "../lib/googleSheetsAuth"
import {
  listGoogleSpreadsheets,
  listSpreadsheetTabs,
} from "../lib/googleSheetsDrive"

const getAuthContext = async (ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
}) => {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const organizationId = getOrganizationIdFromIdentity(identity) as string

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return { organizationId }
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
    const accessToken = await requireOAuthAccessToken(ctx, organizationId)

    try {
      return await listSpreadsheetTabs(accessToken, spreadsheetId)
    } catch (error) {
      throw new ConvexError(
        error instanceof Error
          ? error.message
          : "Unable to load tabs for this spreadsheet."
      )
    }
  },
})
