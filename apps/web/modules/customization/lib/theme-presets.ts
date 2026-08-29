import type { FormSchema } from "../types"

/**
 * Curated starting points for the brand kit.
 *
 * A preset only ever writes colour, radius and typeface — never copy, help
 * content or anything an operator has authored — so applying one is always a
 * reversible visual decision rather than a reset of the widget.
 */
export type ThemePreset = {
  id: string
  name: string
  description: string
  /** Swatches shown on the preset card, left to right. */
  swatches: string[]
  theme: Pick<
    FormSchema["theme"],
    | "primaryColor"
    | "headerGradientStart"
    | "headerGradientEnd"
    | "userBubbleColor"
    | "botBubbleColor"
    | "borderRadius"
    | "fontFamily"
    | "headerBannerTextColor"
    | "headerBannerAccentColor"
    | "headerBannerStyle"
  >
  launcherColor: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "onyx",
    name: "Onyx",
    description: "Neutral black on paper. The safest match for most brands.",
    swatches: ["#000000", "#1c1c1e", "#ecf1f7"],
    theme: {
      primaryColor: "#000000",
      headerGradientStart: "#000000",
      headerGradientEnd: "#1c1c1e",
      userBubbleColor: "#000000",
      botBubbleColor: "#ecf1f7",
      borderRadius: 16,
      fontFamily: "sans",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#ffffff",
      headerBannerStyle: "pill",
    },
    launcherColor: "#000000",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep navy with a cool indigo fade. Reads as enterprise SaaS.",
    swatches: ["#0f172a", "#1e3a8a", "#eef2ff"],
    theme: {
      primaryColor: "#1e3a8a",
      headerGradientStart: "#0f172a",
      headerGradientEnd: "#1e3a8a",
      userBubbleColor: "#1e3a8a",
      botBubbleColor: "#eef2ff",
      borderRadius: 18,
      fontFamily: "sans",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#93c5fd",
      headerBannerStyle: "pill",
    },
    launcherColor: "#1e3a8a",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Violet to fuchsia. Confident and product-led.",
    swatches: ["#4c1d95", "#a21caf", "#f5f3ff"],
    theme: {
      primaryColor: "#6d28d9",
      headerGradientStart: "#4c1d95",
      headerGradientEnd: "#a21caf",
      userBubbleColor: "#6d28d9",
      botBubbleColor: "#f5f3ff",
      borderRadius: 22,
      fontFamily: "rounded",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#f0abfc",
      headerBannerStyle: "gradient",
    },
    launcherColor: "#6d28d9",
  },
  {
    id: "harbor",
    name: "Harbor",
    description: "Teal and sky. Calm, common in fintech and healthcare.",
    swatches: ["#0f766e", "#0ea5e9", "#ecfeff"],
    theme: {
      primaryColor: "#0f766e",
      headerGradientStart: "#0f766e",
      headerGradientEnd: "#0ea5e9",
      userBubbleColor: "#0f766e",
      botBubbleColor: "#ecfeff",
      borderRadius: 16,
      fontFamily: "sans",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#99f6e4",
      headerBannerStyle: "pill",
    },
    launcherColor: "#0f766e",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    description: "Forest green with a soft mint reply bubble.",
    swatches: ["#14532d", "#15803d", "#ecfdf5"],
    theme: {
      primaryColor: "#15803d",
      headerGradientStart: "#14532d",
      headerGradientEnd: "#15803d",
      userBubbleColor: "#15803d",
      botBubbleColor: "#ecfdf5",
      borderRadius: 14,
      fontFamily: "sans",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#bbf7d0",
      headerBannerStyle: "plain",
    },
    launcherColor: "#15803d",
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber to rust. High energy, retail and hospitality.",
    swatches: ["#9a3412", "#ea580c", "#fff7ed"],
    theme: {
      primaryColor: "#c2410c",
      headerGradientStart: "#9a3412",
      headerGradientEnd: "#ea580c",
      userBubbleColor: "#c2410c",
      botBubbleColor: "#fff7ed",
      borderRadius: 20,
      fontFamily: "rounded",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#fed7aa",
      headerBannerStyle: "gradient",
    },
    launcherColor: "#c2410c",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Ink on ivory with a serif brand mark. Publishing and legal.",
    swatches: ["#1c1917", "#78716c", "#faf9f7"],
    theme: {
      primaryColor: "#1c1917",
      headerGradientStart: "#292524",
      headerGradientEnd: "#57534e",
      userBubbleColor: "#1c1917",
      botBubbleColor: "#faf9f7",
      borderRadius: 8,
      fontFamily: "serif",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#e7e5e4",
      headerBannerStyle: "plain",
    },
    launcherColor: "#1c1917",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Monospaced and graphite. Developer tools and infrastructure.",
    swatches: ["#111827", "#374151", "#f3f4f6"],
    theme: {
      primaryColor: "#111827",
      headerGradientStart: "#111827",
      headerGradientEnd: "#374151",
      userBubbleColor: "#111827",
      botBubbleColor: "#f3f4f6",
      borderRadius: 6,
      fontFamily: "mono",
      headerBannerTextColor: "#ffffff",
      headerBannerAccentColor: "#9ca3af",
      headerBannerStyle: "plain",
    },
    launcherColor: "#111827",
  },
]

/** True when every colour and radius in the preset already matches the form. */
export const isPresetActive = (
  preset: ThemePreset,
  theme: FormSchema["theme"],
  launcherColor: string
): boolean => {
  const matchesTheme = (
    Object.keys(preset.theme) as Array<keyof ThemePreset["theme"]>
  ).every((key) => {
    const presetValue = preset.theme[key]
    const themeValue = theme[key]

    if (typeof presetValue === "string" && typeof themeValue === "string") {
      return presetValue.toLowerCase() === themeValue.toLowerCase()
    }

    return presetValue === themeValue
  })

  return (
    matchesTheme &&
    launcherColor.toLowerCase() === preset.launcherColor.toLowerCase()
  )
}
