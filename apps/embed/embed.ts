import { EMBED_CONFIG } from "./config"
import {
  chatBubbleIcon,
  collapseIcon,
  questionIcon,
  sparklesIcon,
} from "./icons"

type WidgetPosition = "bottom-right" | "bottom-left"
type WidgetLauncherIcon = "chat" | "sparkles" | "question"
type WidgetAnimation = "slide-up" | "scale" | "fade" | "pop"

type WidgetAppearancePayload = {
  launcherColor?: string
  launcherLabel?: string
  voiceLauncherLabel?: string
  launcherIcon?: WidgetLauncherIcon
  launcherIconUrl?: string
  launcherPromptEnabled?: boolean
  launcherPromptText?: string
  launcherPromptDelaySeconds?: number
  animation?: WidgetAnimation
  showPoweredBy?: boolean
}

type WidgetSettingsPayload = {
  appearance?: WidgetAppearancePayload
  liveVoiceEnabled?: boolean
}

const LAUNCHER_EDGE_OFFSET = 20
const LAUNCHER_BUTTON_SIZE = 48
const STANDARD_OPEN_CLOSE_BUTTON_SIZE = LAUNCHER_BUTTON_SIZE
const STANDARD_OPEN_CLOSE_BUTTON_GAP = 8
const STANDARD_CLOSE_RETURN_OFFSET_X = 18
const STANDARD_LAUNCHER_REVEAL_DURATION = 180
const LAUNCHER_ORB_SIZE = 34
const LAUNCHER_BUTTON_GAP = 10
const LAUNCHER_LABEL_PADDING_X = 18
const LAUNCHER_PROMPT_GAP = 8
const LAUNCHER_PROMPT_MAX_WIDTH = 220
const WIDGET_CONTAINER_WIDTH = 380
const WIDGET_CONTAINER_STANDARD_HEIGHT = 640
const WIDGET_CONTAINER_VOICE_HEIGHT = 470
const WIDGET_CONTAINER_VOICE_CLOSED_TRANSFORM =
  "translate3d(0, 26px, 0) scale(0.975)"
const WIDGET_CONTAINER_VOICE_OPEN_TRANSFORM =
  "translate3d(0, 0, 0) scale(1)"
const WIDGET_CONTAINER_VOICE_OPEN_DURATION = 360
const WIDGET_CONTAINER_VOICE_CLOSE_DURATION = 220
const WIDGET_CONTAINER_VOICE_OPEN_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"
const WIDGET_CONTAINER_VOICE_CLOSE_EASING = "cubic-bezier(0.4, 0, 1, 1)"
const WIDGET_CONTAINER_VOICE_CLOSED_FILTER = "blur(10px)"
const WIDGET_CONTAINER_VOICE_OPEN_FILTER = "blur(0px)"
const WIDGET_CONTAINER_OPEN_RADIUS = "30px"
const CONTAINER_MAX_HEIGHT_GUTTER = LAUNCHER_EDGE_OFFSET * 2
const STANDARD_OPEN_CONTAINER_BOTTOM =
  LAUNCHER_EDGE_OFFSET +
  STANDARD_OPEN_CLOSE_BUTTON_SIZE +
  STANDARD_OPEN_CLOSE_BUTTON_GAP
const STANDARD_OPEN_CONTAINER_MAX_HEIGHT_GUTTER =
  LAUNCHER_EDGE_OFFSET + STANDARD_OPEN_CONTAINER_BOTTOM
const LAUNCHER_STYLE_ID = "echo-widget-launcher-styles"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const LIVE_VOICE_LAUNCHER_LABEL = "Talk with us"

;(function () {
  let iframe: HTMLIFrameElement | null = null
  let container: HTMLDivElement | null = null
  let revealSurface: HTMLDivElement | null = null
  let button: HTMLButtonElement | null = null
  let isOpen = false
  let hideTimer: number | null = null
  let launcherPromptTimer: number | null = null
  let launcherPrompt: HTMLDivElement | null = null
  let launcherPromptDismissed = false
  let isLauncherReady = false
  let isLiveVoiceEnabled = false

  const launcherAppearance: Required<
    Pick<
      WidgetAppearancePayload,
      | "launcherColor"
      | "launcherLabel"
      | "voiceLauncherLabel"
      | "launcherIcon"
      | "launcherIconUrl"
      | "launcherPromptEnabled"
      | "launcherPromptText"
      | "launcherPromptDelaySeconds"
      | "animation"
    >
  > = {
    launcherColor: "#3b82f6",
    launcherLabel: "Chat with us",
    voiceLauncherLabel: LIVE_VOICE_LAUNCHER_LABEL,
    launcherIcon: "chat",
    launcherIconUrl: "",
    launcherPromptEnabled: false,
    launcherPromptText: "Need help? Talk with us",
    launcherPromptDelaySeconds: 5,
    animation: "slide-up",
  }

  const widgetAnimations: Record<
    WidgetAnimation,
    {
      closedTransform: string
      openTransform: string
      duration: number
      easing: string
    }
  > = {
    "slide-up": {
      closedTransform: "translate3d(0, 18px, 0) scale(0.98)",
      openTransform: "translate3d(0, 0, 0) scale(1)",
      duration: 260,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
    scale: {
      closedTransform: "translate3d(0, 8px, 0) scale(0.92)",
      openTransform: "translate3d(0, 0, 0) scale(1)",
      duration: 240,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    },
    fade: {
      closedTransform: "translate3d(0, 0, 0) scale(1)",
      openTransform: "translate3d(0, 0, 0) scale(1)",
      duration: 200,
      easing: "ease",
    },
    pop: {
      closedTransform: "translate3d(0, 20px, 0) scale(0.86)",
      openTransform: "translate3d(0, 0, 0) scale(1)",
      duration: 320,
      easing: "cubic-bezier(0.18, 1.35, 0.32, 1)",
    },
  }

  // Get configuration from script tag
  let organizationId: string | null = null
  let position: WidgetPosition = EMBED_CONFIG.DEFAULT_POSITION

  const getLauncherIconMarkup = (icon: WidgetLauncherIcon): string => {
    switch (icon) {
      case "sparkles":
        return sparklesIcon
      case "question":
        return questionIcon
      default:
        return chatBubbleIcon
    }
  }

  const parseLauncherIcon = (icon: unknown): WidgetLauncherIcon => {
    if (icon === "sparkles" || icon === "question" || icon === "chat") {
      return icon
    }

    return "chat"
  }

  const parseWidgetAnimation = (animation: unknown): WidgetAnimation => {
    if (
      animation === "slide-up" ||
      animation === "scale" ||
      animation === "fade" ||
      animation === "pop"
    ) {
      return animation
    }

    return "slide-up"
  }

  const normalizeHexColor = (value: string): string | null => {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
      return null
    }

    if (value.length === 4) {
      const [hash, r, g, b] = value
      return `${hash}${r}${r}${g}${g}${b}${b}`
    }

    return value
  }

  const getContrastingTextColor = (color: string): string => {
    const normalizedHex = normalizeHexColor(color)
    if (!normalizedHex) {
      return "#ffffff"
    }

    const red = parseInt(normalizedHex.slice(1, 3), 16)
    const green = parseInt(normalizedHex.slice(3, 5), 16)
    const blue = parseInt(normalizedHex.slice(5, 7), 16)
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

    return luminance > 0.6 ? "#111111" : "#ffffff"
  }

  const toShadowColor = (color: string): string => {
    const normalizedHex = normalizeHexColor(color)
    if (!normalizedHex) {
      return "rgba(59, 130, 246, 0.35)"
    }

    const red = parseInt(normalizedHex.slice(1, 3), 16)
    const green = parseInt(normalizedHex.slice(3, 5), 16)
    const blue = parseInt(normalizedHex.slice(5, 7), 16)
    return `rgba(${red}, ${green}, ${blue}, 0.35)`
  }

  const escapeHtml = (value: string): string => {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  const clampLauncherPromptDelaySeconds = (value: number): number => {
    if (Number.isNaN(value)) {
      return 5
    }

    return Math.max(0, Math.min(120, value))
  }

  const clearLauncherPromptTimer = () => {
    if (launcherPromptTimer !== null) {
      window.clearTimeout(launcherPromptTimer)
      launcherPromptTimer = null
    }
  }

  const syncLauncherPromptPosition = () => {
    if (!launcherPrompt) {
      return
    }

    launcherPrompt.style.cssText = `
      position: fixed;
      ${
        position === "bottom-right"
          ? `right: ${LAUNCHER_EDGE_OFFSET}px;`
          : `left: ${LAUNCHER_EDGE_OFFSET}px;`
      }
      bottom: ${LAUNCHER_EDGE_OFFSET + LAUNCHER_BUTTON_SIZE + LAUNCHER_PROMPT_GAP}px;
      max-width: ${LAUNCHER_PROMPT_MAX_WIDTH}px;
      padding: 8px 12px;
      border-radius: 16px;
      background: #ffffff;
      color: #020617;
      box-shadow: 0 16px 34px -22px rgba(15, 23, 42, 0.45);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      text-align: ${position === "bottom-right" ? "right" : "left"};
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(0, 8px, 0);
      transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
      display: none;
    `
  }

  const hideLauncherPrompt = () => {
    clearLauncherPromptTimer()

    if (!launcherPrompt) {
      return
    }

    launcherPrompt.style.display = "none"
    launcherPrompt.style.opacity = "0"
    launcherPrompt.style.transform = "translate3d(0, 8px, 0)"
  }

  const showLauncherPrompt = () => {
    if (!launcherPrompt) {
      return
    }

    const promptText = launcherAppearance.launcherPromptText.trim()
    if (!promptText) {
      return
    }

    launcherPrompt.textContent = promptText
    syncLauncherPromptPosition()
    launcherPrompt.style.display = "block"

    window.requestAnimationFrame(() => {
      if (!launcherPrompt) {
        return
      }

      launcherPrompt.style.opacity = "1"
      launcherPrompt.style.transform = "translate3d(0, 0, 0)"
    })
  }

  const canShowLauncherPrompt = () => {
    const shouldShowButton = !isOpen || !isLiveVoiceEnabled

    return (
      launcherAppearance.launcherPromptEnabled &&
      !launcherPromptDismissed &&
      !isOpen &&
      !isLiveVoiceEnabled &&
      isLauncherReady &&
      Boolean(button) &&
      shouldShowButton
    )
  }

  const syncLauncherPrompt = () => {
    if (!canShowLauncherPrompt()) {
      hideLauncherPrompt()
      return
    }

    if (launcherPrompt && launcherPrompt.style.display === "block") {
      launcherPrompt.textContent = launcherAppearance.launcherPromptText.trim()
      syncLauncherPromptPosition()
      return
    }

    if (launcherPromptTimer !== null) {
      return
    }

    const delayMs =
      clampLauncherPromptDelaySeconds(
        launcherAppearance.launcherPromptDelaySeconds
      ) * 1000

    launcherPromptTimer = window.setTimeout(() => {
      launcherPromptTimer = null
      if (canShowLauncherPrompt()) {
        showLauncherPrompt()
      }
    }, delayMs)
  }

  const getLauncherImageMarkup = (imageUrl: string): string => {
    return `<img src="${escapeHtml(imageUrl)}" alt="Launcher" style="width: ${LAUNCHER_BUTTON_SIZE}px; height: ${LAUNCHER_BUTTON_SIZE}px; border-radius: 50%; object-fit: cover; display: block;" />`
  }

  const getLauncherOrbMarkup = (): string => {
    return `
      <span class="echo-widget-voice-orb" aria-hidden="true">
        <span class="echo-widget-voice-orb__pulse"></span>
        <span class="echo-widget-voice-orb__gradient"></span>
        <span class="echo-widget-voice-orb__shine"></span>
        <span class="echo-widget-voice-orb__sweep"></span>
        <span class="echo-widget-voice-orb__core"></span>
        <span class="echo-widget-voice-orb__ripple"></span>
      </span>
    `
  }

  const ensureLauncherStyles = () => {
    if (document.getElementById(LAUNCHER_STYLE_ID)) {
      return
    }

    const style = document.createElement("style")
    style.id = LAUNCHER_STYLE_ID
    style.textContent = `
      @keyframes echo-widget-orb-shape {
        0%, 100% {
          border-radius: 50%;
          transform: scale(1) rotate(0deg);
        }

        50% {
          border-radius: 44% 56% 53% 47% / 49% 44% 56% 51%;
          transform: scale(1.08) rotate(8deg);
        }
      }

      @keyframes echo-widget-orb-gradient {
        0% {
          transform: translate3d(-3%, -2%, 0) rotate(0deg) scale(1);
        }

        50% {
          transform: translate3d(3%, 2%, 0) rotate(180deg) scale(1.06);
        }

        100% {
          transform: translate3d(-3%, -2%, 0) rotate(360deg) scale(1);
        }
      }

      @keyframes echo-widget-orb-core {
        0%, 100% {
          transform: scale(0.82);
          opacity: 0.78;
        }

        50% {
          transform: scale(1.18);
          opacity: 1;
        }
      }

      @keyframes echo-widget-orb-pulse-ripple {
        0% {
          box-shadow: 0 0 0 0 rgba(125, 211, 252, 0.42);
          opacity: 0.88;
        }

        72% {
          box-shadow: 0 0 0 10px rgba(125, 211, 252, 0);
          opacity: 0;
        }

        100% {
          box-shadow: 0 0 0 10px rgba(125, 211, 252, 0);
          opacity: 0;
        }
      }

      @keyframes echo-widget-orb-sweep {
        0% {
          transform: translate3d(-140%, 110%, 0) rotate(34deg);
          opacity: 0;
        }

        24% {
          opacity: 0.72;
        }

        52% {
          opacity: 0.34;
        }

        100% {
          transform: translate3d(140%, -130%, 0) rotate(34deg);
          opacity: 0;
        }
      }

      @keyframes echo-widget-orb-click-ripple {
        0% {
          transform: scale(0.25);
          opacity: 0.46;
        }

        100% {
          transform: scale(2.15);
          opacity: 0;
        }
      }

      @keyframes echo-widget-voice-launcher-glow {
        0%, 100% {
          box-shadow:
            0 16px 36px rgba(0, 0, 0, 0.28),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 0 0 rgba(56, 189, 248, 0.18);
        }

        50% {
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.34),
            0 0 0 1px rgba(255, 255, 255, 0.12),
            0 0 0 8px rgba(56, 189, 248, 0.08);
        }
      }

      @keyframes echo-widget-voice-shimmer {
        0% {
          transform: translateX(-130%) skewX(-18deg);
        }

        100% {
          transform: translateX(220%) skewX(-18deg);
        }
      }

      #echo-widget-button.echo-widget-button--voice {
        isolation: isolate;
        overflow: hidden;
        contain: paint;
      }

      #echo-widget-button.echo-widget-button--voice::before {
        content: "";
        position: absolute;
        inset: 1px;
        z-index: -1;
        overflow: hidden;
        border-radius: inherit;
        background:
          radial-gradient(circle at 17% 50%, rgba(56, 189, 248, 0.1), transparent 30%),
          linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 54%, rgba(241,245,249,0.96) 100%);
      }

      #echo-widget-button.echo-widget-button--voice::after {
        content: "";
        position: absolute;
        top: 1px;
        bottom: 1px;
        left: 1px;
        z-index: 0;
        width: 34%;
        border-radius: inherit;
        background: linear-gradient(90deg, transparent, rgba(14,165,233,0.12), transparent);
        animation: echo-widget-voice-shimmer 3.4s ease-in-out infinite;
        pointer-events: none;
      }

      #echo-widget-button.echo-widget-button--voice > * {
        position: relative;
        z-index: 1;
      }

      .echo-widget-voice-label {
        position: relative;
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
        line-height: 1;
        letter-spacing: -0.01em;
      }

      .echo-widget-voice-orb {
        position: relative;
        display: inline-flex;
        width: ${LAUNCHER_ORB_SIZE}px;
        height: ${LAUNCHER_ORB_SIZE}px;
        flex: 0 0 ${LAUNCHER_ORB_SIZE}px;
        overflow: hidden;
        border-radius: 50%;
        clip-path: circle(50%);
        -webkit-clip-path: circle(50%);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.38),
          0 8px 18px rgba(14, 165, 233, 0.34);
        animation: echo-widget-orb-shape 1.8s ease-in-out infinite;
      }

      .echo-widget-voice-orb__pulse {
        position: absolute;
        inset: 3px;
        z-index: 0;
        border-radius: inherit;
        animation: echo-widget-orb-pulse-ripple 1.9s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }

      .echo-widget-voice-orb__gradient {
        position: absolute;
        inset: -8px;
        z-index: 1;
        background:
          radial-gradient(circle at 28% 22%, rgba(238, 247, 126, 0.92), transparent 30%),
          radial-gradient(circle at 72% 24%, rgba(139, 211, 255, 0.96), transparent 34%),
          radial-gradient(circle at 46% 84%, rgba(0, 120, 224, 0.95), transparent 42%),
          radial-gradient(circle at 86% 72%, rgba(4, 31, 43, 0.86), transparent 42%),
          radial-gradient(circle at 20% 70%, rgba(96, 169, 129, 0.74), transparent 34%);
        animation: echo-widget-orb-gradient 3.2s linear infinite;
      }

      .echo-widget-voice-orb__shine {
        position: absolute;
        inset: 0;
        z-index: 2;
        background: conic-gradient(from 120deg, rgba(255,255,255,0.2), rgba(255,255,255,0), rgba(255,255,255,0.24), rgba(255,255,255,0));
        mix-blend-mode: overlay;
        opacity: 0.82;
      }

      .echo-widget-voice-orb__sweep {
        position: absolute;
        inset: -10px;
        z-index: 3;
        width: 18px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.74), transparent);
        filter: blur(0.5px);
        animation: echo-widget-orb-sweep 2.7s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }

      .echo-widget-voice-orb__core {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 4;
        width: 9px;
        height: 9px;
        margin-left: -4.5px;
        margin-top: -4.5px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 0 16px rgba(255, 255, 255, 0.72);
        animation: echo-widget-orb-core 1.4s ease-in-out infinite;
      }

      .echo-widget-voice-orb__ripple {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 5;
        width: 100%;
        height: 100%;
        margin-left: -50%;
        margin-top: -50%;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.52);
        opacity: 0;
        transform: scale(0.25);
        pointer-events: none;
      }

      #echo-widget-button.echo-widget-button--voice:active .echo-widget-voice-orb__ripple {
        animation: echo-widget-orb-click-ripple 520ms ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        #echo-widget-button.echo-widget-button--voice,
        #echo-widget-button.echo-widget-button--voice::after,
        .echo-widget-voice-orb,
        .echo-widget-voice-orb__pulse,
        .echo-widget-voice-orb__gradient,
        .echo-widget-voice-orb__core,
        .echo-widget-voice-orb__sweep,
        .echo-widget-voice-orb__ripple {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  const applyLauncherAppearance = () => {
    if (!button) {
      return
    }

    button.style.transition = "all 0.2s ease"

    if (isOpen) {
      button.classList.remove("echo-widget-button--voice")
      if (!isLiveVoiceEnabled) {
        button.style.width = `${STANDARD_OPEN_CLOSE_BUTTON_SIZE}px`
        button.style.minWidth = `${STANDARD_OPEN_CLOSE_BUTTON_SIZE}px`
        button.style.height = `${STANDARD_OPEN_CLOSE_BUTTON_SIZE}px`
        button.style.padding = "0"
        button.style.borderRadius = "50%"
        button.style.justifyContent = "center"
        button.style.background = launcherAppearance.launcherColor
        button.style.color = getContrastingTextColor(
          launcherAppearance.launcherColor
        )
        button.style.boxShadow = `0 18px 40px ${toShadowColor(
          launcherAppearance.launcherColor
        )}`
        button.style.animation = "none"
        button.setAttribute("aria-label", "Close chat widget")
        button.innerHTML = collapseIcon
      }
      syncLauncherVisibility()
      return
    }

    const isVoiceSurface = isLiveVoiceEnabled
    const isVoiceLauncher = isVoiceSurface && !isOpen
    const cleanedLabel = isVoiceLauncher
      ? launcherAppearance.voiceLauncherLabel.trim() ||
        LIVE_VOICE_LAUNCHER_LABEL
      : launcherAppearance.launcherLabel.trim()
    const hasLauncherImage =
      !isVoiceLauncher &&
      !isOpen &&
      launcherAppearance.launcherIconUrl.trim().length > 0
    const hasVisibleLabel =
      !isOpen &&
      (isVoiceLauncher || (!hasLauncherImage && cleanedLabel.length > 0))
    const iconMarkup = hasLauncherImage
      ? getLauncherImageMarkup(launcherAppearance.launcherIconUrl)
      : isVoiceLauncher
        ? getLauncherOrbMarkup()
        : getLauncherIconMarkup(launcherAppearance.launcherIcon)

    button.classList.toggle("echo-widget-button--voice", isVoiceLauncher)
    button.style.width = hasVisibleLabel ? "auto" : `${LAUNCHER_BUTTON_SIZE}px`
    button.style.minWidth = `${LAUNCHER_BUTTON_SIZE}px`
    button.style.height = `${LAUNCHER_BUTTON_SIZE}px`
    button.style.padding = isVoiceLauncher
      ? "0 22px 0 7px"
      : hasVisibleLabel
        ? `0 ${LAUNCHER_LABEL_PADDING_X}px 0 8px`
        : "0"
    button.style.borderRadius = hasVisibleLabel ? "9999px" : "50%"
    button.style.justifyContent = hasVisibleLabel ? "flex-start" : "center"
    button.style.background = isVoiceSurface
      ? "rgba(255, 255, 255, 0.94)"
      : launcherAppearance.launcherColor
    button.style.color = isVoiceSurface
      ? "#0f172a"
      : getContrastingTextColor(launcherAppearance.launcherColor)
    button.style.boxShadow = isVoiceSurface
      ? "0 16px 36px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08)"
      : `0 4px 24px ${toShadowColor(launcherAppearance.launcherColor)}`
    button.style.animation = isVoiceLauncher
      ? "echo-widget-voice-launcher-glow 2.8s ease-in-out infinite"
      : "none"
    button.setAttribute(
      "aria-label",
      isOpen
        ? isVoiceSurface
          ? "Close voice widget"
          : "Close chat widget"
        : hasVisibleLabel
          ? cleanedLabel
          : "Open chat widget"
    )

    if (hasVisibleLabel) {
      button.innerHTML = `${iconMarkup}<span class="echo-widget-voice-label">${escapeHtml(cleanedLabel)}</span>`
    } else {
      button.innerHTML = iconMarkup
    }

    syncLauncherVisibility()
  }

  const revealStandardClosedLauncher = () => {
    if (!button) {
      return
    }

    applyLauncherAppearance()
    button.style.transition = "none"
    button.style.visibility = "visible"
    button.style.display = "flex"
    button.style.opacity = "0"
    button.style.pointerEvents = "none"
    button.style.transform = `translate3d(${STANDARD_CLOSE_RETURN_OFFSET_X}px, 0, 0) scale(0.94)`

    window.requestAnimationFrame(() => {
      if (!button) {
        return
      }

      button.style.transition = `opacity ${STANDARD_LAUNCHER_REVEAL_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${STANDARD_LAUNCHER_REVEAL_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1)`
      button.style.opacity = "1"
      button.style.pointerEvents = "auto"
      button.style.transform = "scale(1)"
    })
  }

  const updateLauncherAppearance = (appearance: WidgetAppearancePayload) => {
    if (
      typeof appearance.launcherColor === "string" &&
      appearance.launcherColor.trim()
    ) {
      launcherAppearance.launcherColor = appearance.launcherColor
    }

    if (typeof appearance.launcherLabel === "string") {
      launcherAppearance.launcherLabel = appearance.launcherLabel
    }

    if (typeof appearance.voiceLauncherLabel === "string") {
      launcherAppearance.voiceLauncherLabel = appearance.voiceLauncherLabel
    }

    if (typeof appearance.launcherIcon === "string") {
      launcherAppearance.launcherIcon = parseLauncherIcon(
        appearance.launcherIcon
      )
    }

    if (typeof appearance.launcherIconUrl === "string") {
      launcherAppearance.launcherIconUrl = appearance.launcherIconUrl.trim()
    }

    if (typeof appearance.animation === "string") {
      launcherAppearance.animation = parseWidgetAnimation(appearance.animation)
      applyContainerAnimationState(isOpen ? "open" : "closed")
    }

    if (typeof appearance.launcherPromptEnabled === "boolean") {
      launcherAppearance.launcherPromptEnabled =
        appearance.launcherPromptEnabled
    }

    if (typeof appearance.launcherPromptText === "string") {
      launcherAppearance.launcherPromptText = appearance.launcherPromptText
    }

    if (typeof appearance.launcherPromptDelaySeconds === "number") {
      launcherAppearance.launcherPromptDelaySeconds =
        clampLauncherPromptDelaySeconds(appearance.launcherPromptDelaySeconds)
    }

    applyLauncherAppearance()
    revealLauncher()
  }

  const revealLauncher = () => {
    if (!button || isLauncherReady) {
      return
    }

    isLauncherReady = true
    syncLauncherVisibility()
    syncLauncherPrompt()
  }

  const syncLauncherVisibility = () => {
    if (!button || !isLauncherReady) {
      return
    }

    const shouldShowButton = !isOpen || !isLiveVoiceEnabled
    button.style.visibility = shouldShowButton ? "visible" : "hidden"
    button.style.display = shouldShowButton ? "flex" : "none"
    button.style.opacity = shouldShowButton ? "1" : "0"
    button.style.pointerEvents = shouldShowButton ? "auto" : "none"
    button.style.transform = "scale(1)"
    syncLauncherPrompt()
  }

  // Try to get the current script
  const currentScript = document.currentScript as HTMLScriptElement
  if (currentScript) {
    organizationId = currentScript.getAttribute("data-organization-id")
    position =
      (currentScript.getAttribute("data-position") as WidgetPosition) ||
      EMBED_CONFIG.DEFAULT_POSITION
    launcherAppearance.animation = parseWidgetAnimation(
      currentScript.getAttribute("data-animation")
    )
  } else {
    // Fallback: find script tag by src
    const scripts = document.querySelectorAll('script[src*="embed"]')
    const embedScript = Array.from(scripts).find((script) =>
      script.hasAttribute("data-organization-id")
    ) as HTMLScriptElement

    if (embedScript) {
      organizationId = embedScript.getAttribute("data-organization-id")
      position =
        (embedScript.getAttribute("data-position") as WidgetPosition) ||
        EMBED_CONFIG.DEFAULT_POSITION
      launcherAppearance.animation = parseWidgetAnimation(
        embedScript.getAttribute("data-animation")
      )
    }
  }

  // Exit if no organization ID
  if (!organizationId) {
    console.error("Echo Widget: data-organization-id attribute is required")
    return
  }

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", render)
    } else {
      render()
    }
  }

  function render() {
    ensureLauncherStyles()

    // Create floating action button
    button = document.createElement("button")
    button.id = "echo-widget-button"
    button.style.cssText = `
      position: fixed;
      ${
        position === "bottom-right"
          ? `right: ${LAUNCHER_EDGE_OFFSET}px;`
          : `left: ${LAUNCHER_EDGE_OFFSET}px;`
      }
      bottom: ${LAUNCHER_EDGE_OFFSET}px;
      width: auto;
      min-width: ${LAUNCHER_BUTTON_SIZE}px;
      height: ${LAUNCHER_BUTTON_SIZE}px;
      border-radius: 9999px;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      transition: all 0.2s ease;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    `

    applyLauncherAppearance()

    button.addEventListener("click", toggleWidget)
    button.addEventListener("mouseenter", () => {
      if (button) button.style.transform = "scale(1.05)"
    })
    button.addEventListener("mouseleave", () => {
      if (button) button.style.transform = "scale(1)"
    })

    document.body.appendChild(button)

    launcherPrompt = document.createElement("div")
    launcherPrompt.id = "echo-widget-launcher-prompt"
    launcherPrompt.setAttribute("aria-hidden", "true")
    syncLauncherPromptPosition()
    document.body.appendChild(launcherPrompt)

    // Create container (hidden by default)
    container = document.createElement("div")
    container.id = "echo-widget-container"
    container.style.cssText = `
      position: fixed;
      ${
        position === "bottom-right"
          ? `right: ${LAUNCHER_EDGE_OFFSET}px;`
          : `left: ${LAUNCHER_EDGE_OFFSET}px;`
      }
      bottom: ${LAUNCHER_EDGE_OFFSET}px;
      width: ${WIDGET_CONTAINER_WIDTH}px;
      height: ${WIDGET_CONTAINER_STANDARD_HEIGHT}px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - ${CONTAINER_MAX_HEIGHT_GUTTER}px);
      z-index: 999998;
      border-radius: ${WIDGET_CONTAINER_OPEN_RADIUS};
      overflow: hidden;
      isolation: isolate;
      background: #ffffff;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      filter: ${WIDGET_CONTAINER_VOICE_OPEN_FILTER};
      transform: ${widgetAnimations[launcherAppearance.animation].closedTransform};
      transform-origin: ${position === "bottom-right" ? "bottom right" : "bottom left"};
      transition:
        opacity ${widgetAnimations[launcherAppearance.animation].duration}ms ${widgetAnimations[launcherAppearance.animation].easing},
        transform ${widgetAnimations[launcherAppearance.animation].duration}ms ${widgetAnimations[launcherAppearance.animation].easing},
        filter ${widgetAnimations[launcherAppearance.animation].duration}ms ${widgetAnimations[launcherAppearance.animation].easing},
        border-radius ${widgetAnimations[launcherAppearance.animation].duration}ms ${widgetAnimations[launcherAppearance.animation].easing};
      will-change: opacity, transform, filter, border-radius;
    `

    revealSurface = document.createElement("div")
    revealSurface.setAttribute("aria-hidden", "true")
    revealSurface.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0) 22%),
        linear-gradient(0deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0) 24%);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      mask-image: linear-gradient(180deg, black 0%, transparent 26%, transparent 74%, black 100%);
      -webkit-mask-image: linear-gradient(180deg, black 0%, transparent 26%, transparent 74%, black 100%);
      transform: translate3d(0, 8px, 0);
      transition: none;
      will-change: opacity, transform;
    `

    // Create iframe
    iframe = document.createElement("iframe")
    iframe.src = buildWidgetUrl()
    iframe.style.cssText = `
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      border: none;
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transform-origin: center;
      will-change: opacity, transform;
    `
    // Add permissions for microphone and clipboard
    iframe.allow = "microphone; clipboard-read; clipboard-write"

    container.appendChild(revealSurface)
    container.appendChild(iframe)
    document.body.appendChild(container)

    // Handle messages from widget
    window.addEventListener("message", handleMessage)
  }

  function buildWidgetUrl(): string {
    const params = new URLSearchParams()
    params.append("organizationId", organizationId!)
    return `${EMBED_CONFIG.WIDGET_URL}?${params.toString()}`
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== new URL(EMBED_CONFIG.WIDGET_URL).origin) return

    const { type, payload } = event.data

    switch (type) {
      case "close":
        hide()
        break
      case "resize":
        if (payload.height && container) {
          container.style.height = `${payload.height}px`
        }
        break
      case "widget-settings":
        if (payload) {
          const settingsPayload = payload as WidgetSettingsPayload
          if (typeof settingsPayload.liveVoiceEnabled === "boolean") {
            isLiveVoiceEnabled = settingsPayload.liveVoiceEnabled
            applyContainerAnimationState(isOpen ? "open" : "closed")
          }

          if (settingsPayload.appearance) {
            updateLauncherAppearance(settingsPayload.appearance)
          } else {
            applyLauncherAppearance()
          }
        }
        break
    }
  }

  function toggleWidget() {
    if (isOpen) {
      hide()
    } else {
      show()
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false
  }

  function getContainerAnimationDuration(state: "open" | "closed") {
    if (prefersReducedMotion()) {
      return 0
    }

    if (isLiveVoiceEnabled) {
      return state === "open"
        ? WIDGET_CONTAINER_VOICE_OPEN_DURATION
        : WIDGET_CONTAINER_VOICE_CLOSE_DURATION
    }

    return widgetAnimations[launcherAppearance.animation].duration
  }

  function getContainerAnimationEasingForState(state: "open" | "closed") {
    if (isLiveVoiceEnabled) {
      return state === "open"
        ? WIDGET_CONTAINER_VOICE_OPEN_EASING
        : WIDGET_CONTAINER_VOICE_CLOSE_EASING
    }

    return widgetAnimations[launcherAppearance.animation].easing
  }

  function getContainerTransform(state: "open" | "closed") {
    if (isLiveVoiceEnabled) {
      return state === "open"
        ? WIDGET_CONTAINER_VOICE_OPEN_TRANSFORM
        : WIDGET_CONTAINER_VOICE_CLOSED_TRANSFORM
    }

    const animation = widgetAnimations[launcherAppearance.animation]
    return state === "open" ? animation.openTransform : animation.closedTransform
  }

  function syncContainerTransformOrigin() {
    if (!container || !button) {
      return
    }

    container.style.transformOrigin =
      position === "bottom-right" ? "bottom right" : "bottom left"
  }

  function syncContainerSize() {
    if (!container) {
      return
    }

    const shouldReserveCloseButtonSpace = isOpen && !isLiveVoiceEnabled
    container.style.width = `${WIDGET_CONTAINER_WIDTH}px`
    container.style.bottom = `${
      shouldReserveCloseButtonSpace
        ? STANDARD_OPEN_CONTAINER_BOTTOM
        : LAUNCHER_EDGE_OFFSET
    }px`
    container.style.maxHeight = `calc(100vh - ${
      shouldReserveCloseButtonSpace
        ? STANDARD_OPEN_CONTAINER_MAX_HEIGHT_GUTTER
        : CONTAINER_MAX_HEIGHT_GUTTER
    }px)`
    container.style.height = `${
      isLiveVoiceEnabled
        ? WIDGET_CONTAINER_VOICE_HEIGHT
        : WIDGET_CONTAINER_STANDARD_HEIGHT
    }px`
  }

  function applyIframeAnimationState(
    state: "open" | "closed",
    immediate = false
  ) {
    if (!iframe) {
      return
    }

    if (!isLiveVoiceEnabled || immediate || prefersReducedMotion()) {
      iframe.style.opacity = "1"
      iframe.style.transition = "none"
      iframe.style.transform = "translate3d(0, 0, 0)"
      iframe.style.filter = "blur(0px)"
      if (isLiveVoiceEnabled && state === "closed") {
        iframe.style.opacity = "0"
        iframe.style.transform = "translate3d(0, 10px, 0)"
        iframe.style.filter = "blur(8px)"
      }
      return
    }

    const duration = state === "open" ? 260 : 120
    const delay = state === "open" ? 72 : 0
    const easing =
      state === "open"
        ? WIDGET_CONTAINER_VOICE_OPEN_EASING
        : WIDGET_CONTAINER_VOICE_CLOSE_EASING
    iframe.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms, filter ${duration}ms ${easing} ${delay}ms`
    iframe.style.opacity = state === "open" ? "1" : "0"
    iframe.style.transform =
      state === "open" ? "translate3d(0, 0, 0)" : "translate3d(0, 10px, 0)"
    iframe.style.filter = state === "open" ? "blur(0px)" : "blur(8px)"
  }

  function applyRevealSurfaceAnimationState(
    state: "open" | "closed",
    immediate = false
  ) {
    if (!revealSurface) {
      return
    }

    if (!isLiveVoiceEnabled || immediate || prefersReducedMotion()) {
      revealSurface.style.opacity = "0"
      revealSurface.style.transition = "none"
      revealSurface.style.transform = "translate3d(0, 8px, 0)"
      return
    }

    const duration = state === "open" ? 220 : 120
    const delay = state === "open" ? 42 : 0
    const easing =
      state === "open"
        ? WIDGET_CONTAINER_VOICE_OPEN_EASING
        : WIDGET_CONTAINER_VOICE_CLOSE_EASING
    revealSurface.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`
    revealSurface.style.opacity = state === "open" ? "0" : "1"
    revealSurface.style.transform =
      state === "open" ? "translate3d(0, -4px, 0)" : "translate3d(0, 8px, 0)"
  }

  function applyContainerAnimationState(
    state: "open" | "closed",
    options: { immediate?: boolean } = {}
  ) {
    if (!container) {
      return
    }

    const duration = getContainerAnimationDuration(state)
    const easing = getContainerAnimationEasingForState(state)
    const immediate = options.immediate || duration === 0
    const finalTransform = getContainerTransform(state)
    const finalBoxShadow =
      isLiveVoiceEnabled && state === "open"
        ? "0 24px 70px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)"
        : "0 4px 24px rgba(0, 0, 0, 0.15)"
    const finalFilter =
      isLiveVoiceEnabled && state === "closed"
        ? WIDGET_CONTAINER_VOICE_CLOSED_FILTER
        : WIDGET_CONTAINER_VOICE_OPEN_FILTER

    syncContainerSize()
    container.style.transition = immediate
      ? "none"
      : `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, filter ${duration}ms ${easing}, border-radius ${duration}ms ${easing}, box-shadow ${duration}ms ${easing}`
    container.style.opacity = isLiveVoiceEnabled
      ? "1"
      : state === "open"
        ? "1"
        : "0"
    container.style.background = "#ffffff"
    container.style.transform = finalTransform
    container.style.filter = finalFilter
    container.style.borderRadius = WIDGET_CONTAINER_OPEN_RADIUS
    container.style.boxShadow = finalBoxShadow
    applyRevealSurfaceAnimationState(state, immediate)
    applyIframeAnimationState(state, immediate)
  }

  function show() {
    if (container && button) {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer)
        hideTimer = null
      }

      launcherPromptDismissed = true
      hideLauncherPrompt()

      container.style.display = "block"
      syncContainerTransformOrigin()
      isOpen = true
      applyContainerAnimationState("closed", { immediate: true })
      syncLauncherVisibility()
      // Trigger animation
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => applyContainerAnimationState("open"))
      })
      applyLauncherAppearance()
    }
  }

  function hide() {
    if (container && button) {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer)
        hideTimer = null
      }

      const shouldRevealStandardLauncherNow = !isLiveVoiceEnabled

      isOpen = false
      const shouldDelayLauncherReveal = isLiveVoiceEnabled
      if (!shouldDelayLauncherReveal) {
        revealStandardClosedLauncher()
      }
      syncContainerTransformOrigin()
      if (isLiveVoiceEnabled && button) {
        button.style.visibility = "hidden"
        button.style.opacity = "0"
        button.style.pointerEvents = "none"
      }
      applyContainerAnimationState("closed")
      // Hide after animation
      hideTimer = window.setTimeout(() => {
        if (container && !isOpen) {
          container.style.display = "none"
        }
        if (shouldDelayLauncherReveal) {
          syncLauncherVisibility()
        } else if (shouldRevealStandardLauncherNow && button) {
          button.style.pointerEvents = "auto"
        }
        hideTimer = null
      }, getContainerAnimationDuration("closed"))
    }
  }

  function destroy() {
    window.removeEventListener("message", handleMessage)
    if (container) {
      container.remove()
      container = null
      iframe = null
      revealSurface = null
    }
    if (launcherPrompt) {
      launcherPrompt.remove()
      launcherPrompt = null
    }
    if (button) {
      button.remove()
      button = null
    }
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer)
      hideTimer = null
    }
    clearLauncherPromptTimer()
    isOpen = false
    isLauncherReady = false
    isLiveVoiceEnabled = false
    launcherPromptDismissed = false
  }

  // Function to reinitialize with new config
  function reinit(newConfig: {
    organizationId?: string
    position?: WidgetPosition
    animation?: WidgetAnimation
  }) {
    // Destroy existing widget
    destroy()

    // Update config
    if (newConfig.organizationId) {
      organizationId = newConfig.organizationId
    }
    if (newConfig.position) {
      position = newConfig.position
    }
    if (newConfig.animation) {
      launcherAppearance.animation = parseWidgetAnimation(newConfig.animation)
    }

    // Reinitialize
    init()
  }

  // Expose API to global scope
  ;(window as any).EchoWidget = {
    init: reinit,
    show,
    hide,
    destroy,
    setAppearance: updateLauncherAppearance,
  }

  // Auto-initialize
  init()
})()
