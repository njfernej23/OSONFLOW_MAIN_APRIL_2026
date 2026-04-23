"use client"

import {
  CircleHelpIcon,
  EyeIcon,
  MessageSquareTextIcon,
  MinusIcon,
  MonitorIcon,
  MoonIcon,
  SmartphoneIcon,
  SparklesIcon,
  SunIcon,
  XIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import {
  getContrastingTextColor,
  WidgetAppearanceSettings,
  WidgetLauncherIcon,
  WidgetThemeSettings,
} from "@workspace/ui/lib/widget-customization"
import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"

type WidgetLivePreviewProps = {
  greetMessage: string
  suggestions: string[]
  theme: WidgetThemeSettings
  appearance: WidgetAppearanceSettings
}

const launcherIconMap: Record<WidgetLauncherIcon, ReactNode> = {
  chat: <MessageSquareTextIcon className="size-4" />,
  sparkles: <SparklesIcon className="size-4" />,
  question: <CircleHelpIcon className="size-4" />,
}

type DeviceMode = "desktop" | "mobile"

const ChatWidget = ({
  theme,
  appearance,
  greetMessage,
  suggestions,
  darkMode,
}: {
  theme: WidgetThemeSettings
  appearance: WidgetAppearanceSettings
  greetMessage: string
  suggestions: string[]
  darkMode: boolean
}) => {
  const userTextColor = getContrastingTextColor(theme.userBubbleColor)
  const botTextColor = getContrastingTextColor(theme.botBubbleColor, "#111111")
  const primaryTextColor = getContrastingTextColor(theme.primaryColor)
  const launcherTextColor = getContrastingTextColor(appearance.launcherColor)
  const launcherImageUrl = appearance.launcherIconUrl?.trim() || ""
  const hasLauncherImage = launcherImageUrl.length > 0

  const bgBase = darkMode ? "bg-zinc-900" : "bg-background"
  const borderBase = darkMode ? "border-zinc-700" : "border"
  const textBase = darkMode ? "text-zinc-100" : "text-foreground"
  const mutedText = darkMode ? "text-zinc-400" : "text-muted-foreground"
  const inputBg = darkMode ? "bg-zinc-800" : "bg-muted/20"

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Chat window */}
      <div
        className={cn("w-[220px] overflow-hidden border shadow-xl transition-all duration-300", borderBase)}
        style={{ borderRadius: `${theme.borderRadius}px` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{
            background: `linear-gradient(135deg, ${theme.headerGradientStart}, ${theme.headerGradientEnd})`,
          }}
        >
          <div className="flex items-center gap-2">
            {theme.logoUrl ? (
              <img
                alt="Brand logo"
                className="size-6 rounded bg-white/90 object-cover p-0.5"
                src={theme.logoUrl}
              />
            ) : (
              <div className="flex size-6 items-center justify-center rounded bg-white/20">
                <SparklesIcon className="size-3 text-white/80" />
              </div>
            )}
            <div>
              <p className="text-[11px] leading-none font-semibold text-white">
                {theme.assistantName}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[9px] leading-none text-white/70">Online</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex size-5 items-center justify-center rounded-full text-white/70 hover:bg-white/10 cursor-pointer">
              <MinusIcon className="size-3" />
            </div>
            <div className="flex size-5 items-center justify-center rounded-full text-white/70 hover:bg-white/10 cursor-pointer">
              <XIcon className="size-3" />
            </div>
          </div>
        </div>

        {/* Chat body */}
        <div className={cn("space-y-2 px-3 py-3 transition-colors duration-300", bgBase)}>
          {/* Bot message */}
          <div
            className="max-w-[90%] px-2.5 py-1.5 text-[10px] leading-relaxed"
            style={{
              backgroundColor: theme.botBubbleColor,
              color: botTextColor,
              borderRadius: `4px ${theme.borderRadius * 0.6}px ${theme.borderRadius * 0.6}px ${theme.borderRadius * 0.6}px`,
            }}
          >
            {greetMessage || "Hi! How can I help you today?"}
          </div>

          {/* User message */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] px-2.5 py-1.5 text-[10px] leading-relaxed"
              style={{
                backgroundColor: theme.userBubbleColor,
                color: userTextColor,
                borderRadius: `${theme.borderRadius * 0.6}px ${theme.borderRadius * 0.6}px 4px ${theme.borderRadius * 0.6}px`,
              }}
            >
              Tell me more about this.
            </div>
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1 pt-0.5">
              {suggestions.slice(0, 2).map((suggestion) => (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px]",
                    darkMode ? "border-zinc-600 bg-zinc-800 text-zinc-400" : "border bg-muted/30 text-muted-foreground"
                  )}
                  key={suggestion}
                >
                  {suggestion.length > 18 ? suggestion.slice(0, 18) + "…" : suggestion}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className={cn("border-t px-2.5 py-2 transition-colors duration-300", bgBase, borderBase)}>
          <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", inputBg, borderBase)}>
            <span className={cn("flex-1 text-[9px]", mutedText + "/60")}>
              Type a message...
            </span>
            <div
              className="flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-medium"
              style={{
                backgroundColor: theme.primaryColor,
                color: primaryTextColor,
              }}
            >
              →
            </div>
          </div>
          {appearance.showPoweredBy && (
            <p className={cn("mt-1.5 text-center text-[9px]", mutedText + "/50")}>
              Powered by {appearance.poweredByText}
            </p>
          )}
        </div>
      </div>

      {/* Launcher button */}
      <button
        className={cn(
          "inline-flex text-xs font-medium shadow-lg transition-all hover:scale-105 active:scale-95",
          hasLauncherImage
            ? "size-[52px] items-center justify-center rounded-full p-0"
            : "items-center gap-2 rounded-full px-3.5 py-2"
        )}
        style={{
          backgroundColor: appearance.launcherColor,
          color: launcherTextColor,
        }}
        type="button"
      >
        {hasLauncherImage ? (
          <img
            alt="Launcher"
            className="size-full rounded-full object-cover"
            src={launcherImageUrl}
          />
        ) : (
          <>
            {launcherIconMap[appearance.launcherIcon]}
            <span>{appearance.launcherLabel}</span>
          </>
        )}
      </button>
    </div>
  )
}

export const WidgetLivePreview = ({
  greetMessage,
  suggestions,
  theme,
  appearance,
}: WidgetLivePreviewProps) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop")
  const [darkMode, setDarkMode] = useState(false)
  const launcherTextColor = getContrastingTextColor(appearance.launcherColor)
  const launcherImageUrl = appearance.launcherIconUrl?.trim() || ""
  const hasLauncherImage = launcherImageUrl.length > 0

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm">
              <EyeIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Live Preview</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Updates instantly as you make changes
              </CardDescription>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border text-xs transition-all duration-150 hover:scale-105",
                darkMode
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-background border-border text-muted-foreground"
              )}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
            </button>

            {/* Device toggles */}
            <div className="flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setDeviceMode("desktop")}
                className={cn(
                  "flex size-7 items-center justify-center text-xs transition-colors duration-150",
                  deviceMode === "desktop"
                    ? "bg-background text-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
                title="Desktop preview"
              >
                <MonitorIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                className={cn(
                  "flex size-7 items-center justify-center border-l text-xs transition-colors duration-150",
                  deviceMode === "mobile"
                    ? "bg-background text-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
                title="Mobile preview"
              >
                <SmartphoneIcon className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {/* Device frame */}
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-md transition-all duration-300">
          {deviceMode === "desktop" ? (
            <>
              {/* Browser chrome */}
              <div className={cn("flex items-center gap-2 border-b px-3 py-2 transition-colors duration-300", darkMode ? "bg-zinc-800 border-zinc-700" : "bg-muted/50")}>
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-400/70" />
                  <div className="size-2.5 rounded-full bg-amber-400/70" />
                  <div className="size-2.5 rounded-full bg-green-400/70" />
                </div>
                <div className={cn("mx-2 flex-1 rounded px-2 py-0.5 text-center text-[10px]", darkMode ? "bg-zinc-900 text-zinc-500" : "bg-background/80 text-muted-foreground/60")}>
                  yourwebsite.com
                </div>
              </div>

              {/* Website background */}
              <div
                className={cn("relative p-4 transition-colors duration-300", darkMode ? "bg-zinc-900" : "bg-background/30")}
                style={{ minHeight: "320px" }}
              >
                {/* Fake page lines */}
                <div className="space-y-2 opacity-20">
                  <div className={cn("h-3 w-3/4 rounded", darkMode ? "bg-zinc-400" : "bg-foreground/20")} />
                  <div className={cn("h-2 w-full rounded", darkMode ? "bg-zinc-600" : "bg-foreground/10")} />
                  <div className={cn("h-2 w-5/6 rounded", darkMode ? "bg-zinc-600" : "bg-foreground/10")} />
                  <div className={cn("h-2 w-4/6 rounded", darkMode ? "bg-zinc-600" : "bg-foreground/10")} />
                </div>

                <div className="absolute right-3 bottom-3">
                  <ChatWidget
                    theme={theme}
                    appearance={appearance}
                    greetMessage={greetMessage}
                    suggestions={suggestions}
                    darkMode={darkMode}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Mobile frame */
            <div className="flex justify-center py-4 bg-muted/20">
              <div
                className={cn(
                  "relative overflow-hidden rounded-[28px] border-4 shadow-xl transition-colors duration-300",
                  darkMode ? "border-zinc-600 bg-zinc-900" : "border-foreground/10 bg-background/30"
                )}
                style={{ width: 240, minHeight: 400 }}
              >
                {/* Phone status bar */}
                <div className={cn("flex items-center justify-between px-4 py-1.5 text-[9px]", darkMode ? "bg-zinc-800 text-zinc-400" : "bg-muted/50 text-muted-foreground/60")}>
                  <span>9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="h-1.5 w-3 rounded-sm bg-current opacity-70" />
                    <div className="h-1.5 w-1 rounded-sm bg-current" />
                  </div>
                </div>

                {/* Phone content */}
                <div className={cn("relative p-3", darkMode ? "bg-zinc-900" : "bg-background/30")} style={{ minHeight: 340 }}>
                  {/* Fake app lines */}
                  <div className="space-y-1.5 opacity-20">
                    <div className={cn("h-2 w-2/3 rounded", darkMode ? "bg-zinc-400" : "bg-foreground/20")} />
                    <div className={cn("h-1.5 w-full rounded", darkMode ? "bg-zinc-600" : "bg-foreground/10")} />
                    <div className={cn("h-1.5 w-4/5 rounded", darkMode ? "bg-zinc-600" : "bg-foreground/10")} />
                  </div>

                  <div className="absolute right-2 bottom-2">
                    <ChatWidget
                      theme={theme}
                      appearance={appearance}
                      greetMessage={greetMessage}
                      suggestions={suggestions}
                      darkMode={darkMode}
                    />
                  </div>
                </div>

                {/* Home indicator */}
                <div className={cn("flex justify-center py-2", darkMode ? "bg-zinc-900" : "bg-background/30")}>
                  <div className={cn("h-1 w-16 rounded-full", darkMode ? "bg-zinc-600" : "bg-foreground/20")} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Launcher standalone preview */}
        <div className="rounded-xl border bg-muted/10 p-4">
          <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Launcher standalone
          </p>
          <div className="flex items-center gap-3">
            <button
              className={cn(
                "inline-flex text-sm font-medium shadow-md transition-all hover:scale-105 active:scale-95",
                hasLauncherImage
                  ? "size-[56px] items-center justify-center rounded-full p-0"
                  : "items-center gap-2 rounded-full px-4 py-2.5"
              )}
              style={{
                backgroundColor: appearance.launcherColor,
                color: launcherTextColor,
              }}
              type="button"
            >
              {hasLauncherImage ? (
                <img
                  alt="Launcher"
                  className="size-full rounded-full object-cover"
                  src={launcherImageUrl}
                />
              ) : (
                <>
                  {launcherIconMap[appearance.launcherIcon]}
                  <span>{appearance.launcherLabel}</span>
                </>
              )}
            </button>
            <div className="text-xs text-muted-foreground">← Click to open chat</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
