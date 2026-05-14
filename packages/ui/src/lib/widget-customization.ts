export type WidgetLauncherIcon = "chat" | "sparkles" | "question"
export type WidgetAnimation = "slide-up" | "scale" | "fade" | "pop"

export type WidgetThemeSettings = {
  primaryColor: string
  headerGradientStart: string
  headerGradientEnd: string
  userBubbleColor: string
  botBubbleColor: string
  borderRadius: number
  logoUrl: string
  backgroundImageUrl: string
  assistantName: string
}

export type WidgetAppearanceSettings = {
  launcherColor: string
  launcherLabel: string
  launcherIcon: WidgetLauncherIcon
  launcherIconUrl: string
  animation: WidgetAnimation
  poweredByText: string
  showPoweredBy: boolean
  showHelpCenter: boolean
}

export const DEFAULT_WIDGET_THEME: WidgetThemeSettings = {
  primaryColor: "#000000",
  headerGradientStart: "#000000",
  headerGradientEnd: "#000000",
  userBubbleColor: "#000000",
  botBubbleColor: "#ECF1F7",
  borderRadius: 16,
  logoUrl: "",
  backgroundImageUrl: "",
  assistantName: "Support Assistant",
}

export const DEFAULT_WIDGET_APPEARANCE: WidgetAppearanceSettings = {
  launcherColor: "#000000",
  launcherLabel: "Chat with us",
  launcherIcon: "question",
  launcherIconUrl: "",
  animation: "scale",
  poweredByText: "Osonflow",
  showPoweredBy: true,
  showHelpCenter: true,
}

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/

export const normalizeHexColor = (value: string): string | null => {
  if (!HEX_COLOR_REGEX.test(value)) {
    return null
  }

  if (value.length === 4) {
    const [hash, r, g, b] = value
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  return value.toLowerCase()
}

export const clampBorderRadius = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_WIDGET_THEME.borderRadius
  }

  return Math.max(0, Math.min(32, value))
}

export const mergeWidgetTheme = (
  theme?: Partial<WidgetThemeSettings> | null
): WidgetThemeSettings => {
  const merged = {
    ...DEFAULT_WIDGET_THEME,
    ...(theme ?? {}),
  }

  return {
    ...merged,
    borderRadius: clampBorderRadius(merged.borderRadius),
  }
}

export const mergeWidgetAppearance = (
  appearance?: Partial<WidgetAppearanceSettings> | null
): WidgetAppearanceSettings => {
  return {
    ...DEFAULT_WIDGET_APPEARANCE,
    ...(appearance ?? {}),
  }
}

export const getContrastingTextColor = (
  color: string,
  fallback = "#ffffff"
): string => {
  const normalizedHex = normalizeHexColor(color)
  if (!normalizedHex) {
    return fallback
  }

  const red = parseInt(normalizedHex.slice(1, 3), 16)
  const green = parseInt(normalizedHex.slice(3, 5), 16)
  const blue = parseInt(normalizedHex.slice(5, 7), 16)

  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance > 0.6 ? "#111111" : "#ffffff"
}
