import { widgetSettingsSchema } from "../schemas"
import type { FormSchema } from "../types"

export const WIDGET_SETTINGS_EXPORT_TYPE = "osonflow-widget-settings" as const
export const WIDGET_SETTINGS_EXPORT_VERSION = 1 as const

export type WidgetSettingsExport = {
  type: typeof WIDGET_SETTINGS_EXPORT_TYPE
  version: typeof WIDGET_SETTINGS_EXPORT_VERSION
  exportedAt: string
  settings: FormSchema
}

export const createWidgetSettingsExport = (
  settings: FormSchema
): WidgetSettingsExport => ({
  type: WIDGET_SETTINGS_EXPORT_TYPE,
  version: WIDGET_SETTINGS_EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  settings,
})

export const serializeWidgetSettingsExport = (settings: FormSchema) =>
  JSON.stringify(createWidgetSettingsExport(settings), null, 2)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const parseWidgetSettingsImport = (raw: string): FormSchema => {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("Clipboard content is not valid JSON.")
  }

  const settings = isRecord(parsed) && "settings" in parsed ? parsed.settings : parsed

  const result = widgetSettingsSchema.safeParse(settings)

  if (!result.success) {
    throw new Error("Settings JSON is missing required fields or has invalid values.")
  }

  return result.data
}

export const hasConvexHostedImageUrl = (settings: FormSchema) => {
  const urls = [
    settings.theme.logoUrl,
    settings.theme.backgroundImageUrl,
    settings.appearance.launcherIconUrl,
  ]

  return urls.some((url) => url.includes(".convex.cloud/api/storage"))
}
