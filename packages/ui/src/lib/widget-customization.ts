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
  voiceLauncherLabel: string
  launcherIcon: WidgetLauncherIcon
  launcherIconUrl: string
  launcherPromptEnabled: boolean
  launcherPromptText: string
  launcherPromptDelaySeconds: number
  animation: WidgetAnimation
  poweredByText: string
  showPoweredBy: boolean
  showHelpCenter: boolean
  showChatHistoryDownload: boolean
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
  voiceLauncherLabel: "Talk with us",
  launcherIcon: "question",
  launcherIconUrl: "",
  launcherPromptEnabled: true,
  launcherPromptText: "Need help? Talk with us",
  launcherPromptDelaySeconds: 5,
  animation: "scale",
  poweredByText: "Osonflow",
  showPoweredBy: true,
  showHelpCenter: true,
  showChatHistoryDownload: true,
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

export const clampLauncherPromptDelaySeconds = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_WIDGET_APPEARANCE.launcherPromptDelaySeconds
  }

  return Math.max(0, Math.min(120, value))
}

// These values are set by organization admins and end up inside inline styles,
// CSS custom properties and `url()` expressions, so anything that is not a
// plain hex colour or an http(s)/data image URL falls back to the default
// rather than being passed through to the DOM.
const sanitizeColor = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback
  }

  return normalizeHexColor(value.trim()) ?? fallback
}

const SAFE_IMAGE_URL_PROTOCOLS = new Set(["http:", "https:"])

export const sanitizeImageUrl = (value: unknown): string => {
  if (typeof value !== "string") {
    return ""
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  // Reject anything that could terminate a CSS url() or style declaration.
  if (/[()"'\\\s;]/.test(trimmed)) {
    return ""
  }

  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? "" : trimmed
  }

  // Raster formats only. An inline SVG carries scripts, which execute if the
  // URL ever reaches a context richer than `<img src>` or CSS `url()`.
  if (
    /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(
      trimmed
    )
  ) {
    return trimmed
  }

  try {
    return SAFE_IMAGE_URL_PROTOCOLS.has(new URL(trimmed).protocol)
      ? trimmed
      : ""
  } catch {
    return ""
  }
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
    primaryColor: sanitizeColor(
      merged.primaryColor,
      DEFAULT_WIDGET_THEME.primaryColor
    ),
    headerGradientStart: sanitizeColor(
      merged.headerGradientStart,
      DEFAULT_WIDGET_THEME.headerGradientStart
    ),
    headerGradientEnd: sanitizeColor(
      merged.headerGradientEnd,
      DEFAULT_WIDGET_THEME.headerGradientEnd
    ),
    userBubbleColor: sanitizeColor(
      merged.userBubbleColor,
      DEFAULT_WIDGET_THEME.userBubbleColor
    ),
    botBubbleColor: sanitizeColor(
      merged.botBubbleColor,
      DEFAULT_WIDGET_THEME.botBubbleColor
    ),
    logoUrl: sanitizeImageUrl(merged.logoUrl),
    backgroundImageUrl: sanitizeImageUrl(merged.backgroundImageUrl),
    borderRadius: clampBorderRadius(merged.borderRadius),
  }
}

export const mergeWidgetAppearance = (
  appearance?: Partial<WidgetAppearanceSettings> | null
): WidgetAppearanceSettings => {
  const merged = {
    ...DEFAULT_WIDGET_APPEARANCE,
    ...(appearance ?? {}),
  }

  return {
    ...merged,
    launcherColor: sanitizeColor(
      merged.launcherColor,
      DEFAULT_WIDGET_APPEARANCE.launcherColor
    ),
    launcherIconUrl: sanitizeImageUrl(merged.launcherIconUrl),
    launcherPromptDelaySeconds: clampLauncherPromptDelaySeconds(
      Number(merged.launcherPromptDelaySeconds)
    ),
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
