import { internalMutation } from "../_generated/server"
import { v } from "convex/values"
import type { Doc } from "../_generated/dataModel"

type WidgetSettingsSnapshot = Doc<"widgetSettingsVersions">["settings"]

function stripVapiSettings(
  snapshot: WidgetSettingsSnapshot | undefined
): WidgetSettingsSnapshot | undefined {
  if (!snapshot || !("vapiSettings" in snapshot)) {
    return snapshot
  }

  const { vapiSettings: _, ...rest } = snapshot
  return rest
}

export const run = internalMutation({
  args: {},
  returns: v.object({
    widgetSettingsUpdated: v.number(),
    widgetSettingsVersionsUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let widgetSettingsUpdated = 0
    let widgetSettingsVersionsUpdated = 0

    const widgetSettingsRows = await ctx.db.query("widgetSettings").collect()

    for (const row of widgetSettingsRows) {
      const patch: {
        draft?: WidgetSettingsSnapshot
        vapiSettings?: undefined
      } = {}
      const cleanedDraft = stripVapiSettings(row.draft)

      if (row.draft && cleanedDraft !== row.draft) {
        patch.draft = cleanedDraft
      }

      if ("vapiSettings" in row) {
        patch.vapiSettings = undefined
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch("widgetSettings", row._id, patch)
        widgetSettingsUpdated += 1
      }
    }

    const versionRows = await ctx.db.query("widgetSettingsVersions").collect()

    for (const row of versionRows) {
      const cleanedSettings = stripVapiSettings(row.settings)

      if (cleanedSettings !== row.settings) {
        await ctx.db.patch("widgetSettingsVersions", row._id, {
          settings: cleanedSettings,
        })
        widgetSettingsVersionsUpdated += 1
      }
    }

    return {
      widgetSettingsUpdated,
      widgetSettingsVersionsUpdated,
    }
  },
})
