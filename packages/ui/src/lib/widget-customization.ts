export type WidgetLauncherIcon = "chat" | "sparkles" | "question"
export type WidgetAnimation = "slide-up" | "scale" | "fade" | "pop"

/** What the home hero shows in its brand slot. */
export type WidgetBrandMode = "none" | "image" | "text"
export type WidgetBrandFont = "sans" | "serif" | "mono" | "display"
export type WidgetBrandStyle = "plain" | "pill" | "gradient"
/** Typeface applied to every widget surface. */
export type WidgetFontFamily = "sans" | "serif" | "mono" | "rounded"
export type WidgetLauncherPosition = "bottom-right" | "bottom-left"
/** How often the widget is allowed to open itself. */
export type WidgetAutoOpenFrequency = "session" | "visitor" | "always"

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
  fontFamily: WidgetFontFamily
  headerBrandMode: WidgetBrandMode
  headerBannerImageUrl: string
  headerBannerText: string
  headerBannerTextColor: string
  headerBannerAccentColor: string
  headerBannerFont: WidgetBrandFont
  headerBannerStyle: WidgetBrandStyle
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
  launcherPosition: WidgetLauncherPosition
  launcherOffsetX: number
  launcherOffsetY: number
  launcherSize: number
  autoOpenEnabled: boolean
  autoOpenDelaySeconds: number
  autoOpenFrequency: WidgetAutoOpenFrequency
  notificationSoundEnabled: boolean
}

/** Visitor-facing strings an organization can rewrite without a code change. */
export type WidgetCopySettings = {
  homeGreeting: string
  homeHeadline: string
  startChatLabel: string
  inputPlaceholder: string
  onlineLabel: string
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
  fontFamily: "sans",
  headerBrandMode: "image",
  headerBannerImageUrl: "",
  headerBannerText: "",
  headerBannerTextColor: "#ffffff",
  headerBannerAccentColor: "#ffffff",
  headerBannerFont: "sans",
  headerBannerStyle: "pill",
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
  launcherPosition: "bottom-right",
  launcherOffsetX: 20,
  launcherOffsetY: 20,
  launcherSize: 48,
  autoOpenEnabled: false,
  autoOpenDelaySeconds: 8,
  autoOpenFrequency: "session",
  notificationSoundEnabled: true,
}

export const DEFAULT_WIDGET_COPY: WidgetCopySettings = {
  homeGreeting: "Hi there 👋",
  homeHeadline: "Let me know how we can help!",
  startChatLabel: "Start a chat",
  inputPlaceholder: "Type your message…",
  onlineLabel: "Online · replies instantly",
}

/** Typeface stacks the widget maps `theme.fontFamily` onto. */
export const WIDGET_FONT_STACKS: Record<WidgetFontFamily, string> = {
  sans: '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif:
    '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ui-serif, serif',
  mono: '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  rounded:
    '"SF Pro Rounded", ui-rounded, "Nunito", "Quicksand", "Segoe UI", sans-serif',
}

/** Typeface stacks for the home hero brand text. */
export const WIDGET_BRAND_FONT_STACKS: Record<WidgetBrandFont, string> = {
  sans: WIDGET_FONT_STACKS.sans,
  serif: WIDGET_FONT_STACKS.serif,
  mono: WIDGET_FONT_STACKS.mono,
  display: '"Playfair Display", "Iowan Old Style", Georgia, ui-serif, serif',
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

/** Distance in px between the launcher and the host page edge. */
export const LAUNCHER_OFFSET_RANGE = { min: 0, max: 160 } as const
/** Diameter in px of the round launcher button. */
export const LAUNCHER_SIZE_RANGE = { min: 40, max: 76 } as const
export const AUTO_OPEN_DELAY_RANGE = { min: 0, max: 300 } as const

const clampToRange = (
  value: number,
  { min, max }: { min: number; max: number },
  fallback: number
): number => {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.round(Math.max(min, Math.min(max, value)))
}

export const clampLauncherOffset = (value: number): number =>
  clampToRange(
    Number(value),
    LAUNCHER_OFFSET_RANGE,
    DEFAULT_WIDGET_APPEARANCE.launcherOffsetX
  )

export const clampLauncherSize = (value: number): number =>
  clampToRange(
    Number(value),
    LAUNCHER_SIZE_RANGE,
    DEFAULT_WIDGET_APPEARANCE.launcherSize
  )

export const clampAutoOpenDelaySeconds = (value: number): number =>
  clampToRange(
    Number(value),
    AUTO_OPEN_DELAY_RANGE,
    DEFAULT_WIDGET_APPEARANCE.autoOpenDelaySeconds
  )

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

// Enum-shaped settings reach inline styles and class lookups the same way the
// colours do, so an unknown string falls back instead of being trusted.
const sanitizeOption = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => (allowed.includes(value as T) ? (value as T) : fallback)

const sanitizeText = (
  value: unknown,
  fallback: string,
  maxLength: number
): string => {
  if (typeof value !== "string") {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : fallback
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

const BRAND_MODES: readonly WidgetBrandMode[] = ["none", "image", "text"]
const BRAND_FONTS: readonly WidgetBrandFont[] = [
  "sans",
  "serif",
  "mono",
  "display",
]
const BRAND_STYLES: readonly WidgetBrandStyle[] = ["plain", "pill", "gradient"]
const FONT_FAMILIES: readonly WidgetFontFamily[] = [
  "sans",
  "serif",
  "mono",
  "rounded",
]
const LAUNCHER_POSITIONS: readonly WidgetLauncherPosition[] = [
  "bottom-right",
  "bottom-left",
]
const AUTO_OPEN_FREQUENCIES: readonly WidgetAutoOpenFrequency[] = [
  "session",
  "visitor",
  "always",
]

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
    fontFamily: sanitizeOption(
      merged.fontFamily,
      FONT_FAMILIES,
      DEFAULT_WIDGET_THEME.fontFamily
    ),
    headerBrandMode: sanitizeOption(
      merged.headerBrandMode,
      BRAND_MODES,
      DEFAULT_WIDGET_THEME.headerBrandMode
    ),
    headerBannerImageUrl: sanitizeImageUrl(merged.headerBannerImageUrl),
    headerBannerText:
      typeof merged.headerBannerText === "string"
        ? merged.headerBannerText.slice(0, 60)
        : "",
    headerBannerTextColor: sanitizeColor(
      merged.headerBannerTextColor,
      DEFAULT_WIDGET_THEME.headerBannerTextColor
    ),
    headerBannerAccentColor: sanitizeColor(
      merged.headerBannerAccentColor,
      DEFAULT_WIDGET_THEME.headerBannerAccentColor
    ),
    headerBannerFont: sanitizeOption(
      merged.headerBannerFont,
      BRAND_FONTS,
      DEFAULT_WIDGET_THEME.headerBannerFont
    ),
    headerBannerStyle: sanitizeOption(
      merged.headerBannerStyle,
      BRAND_STYLES,
      DEFAULT_WIDGET_THEME.headerBannerStyle
    ),
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
    launcherPosition: sanitizeOption(
      merged.launcherPosition,
      LAUNCHER_POSITIONS,
      DEFAULT_WIDGET_APPEARANCE.launcherPosition
    ),
    launcherOffsetX: clampLauncherOffset(merged.launcherOffsetX),
    launcherOffsetY: clampLauncherOffset(merged.launcherOffsetY),
    launcherSize: clampLauncherSize(merged.launcherSize),
    autoOpenEnabled: Boolean(merged.autoOpenEnabled),
    autoOpenDelaySeconds: clampAutoOpenDelaySeconds(
      merged.autoOpenDelaySeconds
    ),
    autoOpenFrequency: sanitizeOption(
      merged.autoOpenFrequency,
      AUTO_OPEN_FREQUENCIES,
      DEFAULT_WIDGET_APPEARANCE.autoOpenFrequency
    ),
    notificationSoundEnabled: merged.notificationSoundEnabled !== false,
  }
}

export const mergeWidgetCopy = (
  copy?: Partial<WidgetCopySettings> | null
): WidgetCopySettings => {
  const merged = {
    ...DEFAULT_WIDGET_COPY,
    ...(copy ?? {}),
  }

  return {
    homeGreeting: sanitizeText(
      merged.homeGreeting,
      DEFAULT_WIDGET_COPY.homeGreeting,
      60
    ),
    homeHeadline: sanitizeText(
      merged.homeHeadline,
      DEFAULT_WIDGET_COPY.homeHeadline,
      90
    ),
    startChatLabel: sanitizeText(
      merged.startChatLabel,
      DEFAULT_WIDGET_COPY.startChatLabel,
      40
    ),
    inputPlaceholder: sanitizeText(
      merged.inputPlaceholder,
      DEFAULT_WIDGET_COPY.inputPlaceholder,
      60
    ),
    onlineLabel: sanitizeText(
      merged.onlineLabel,
      DEFAULT_WIDGET_COPY.onlineLabel,
      40
    ),
  }
}

const toRgbChannels = (color: string): [number, number, number] | null => {
  const normalizedHex = normalizeHexColor(color)
  if (!normalizedHex) {
    return null
  }

  return [
    parseInt(normalizedHex.slice(1, 3), 16),
    parseInt(normalizedHex.slice(3, 5), 16),
    parseInt(normalizedHex.slice(5, 7), 16),
  ]
}

export const getContrastingTextColor = (
  color: string,
  fallback = "#ffffff"
): string => {
  const channels = toRgbChannels(color)
  if (!channels) {
    return fallback
  }

  const [red, green, blue] = channels
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance > 0.6 ? "#111111" : "#ffffff"
}

const relativeLuminance = (channels: [number, number, number]): number => {
  const [r, g, b] = channels.map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * WCAG 2.1 contrast ratio between two hex colours, 1–21. Returns `null` when
 * either value is not a hex colour, so callers can skip the check rather than
 * report a misleading pass.
 */
export const getContrastRatio = (
  foreground: string,
  background: string
): number | null => {
  const foregroundChannels = toRgbChannels(foreground)
  const backgroundChannels = toRgbChannels(background)

  if (!foregroundChannels || !backgroundChannels) {
    return null
  }

  const lighter = Math.max(
    relativeLuminance(foregroundChannels),
    relativeLuminance(backgroundChannels)
  )
  const darker = Math.min(
    relativeLuminance(foregroundChannels),
    relativeLuminance(backgroundChannels)
  )

  return (lighter + 0.05) / (darker + 0.05)
}
