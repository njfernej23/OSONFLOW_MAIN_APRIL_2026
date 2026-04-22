import {
  CircleHelpIcon,
  EyeIcon,
  MessageSquareTextIcon,
  MinusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import type { ReactNode } from "react"
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
  CardDescription,
  CardHeader,
  CardTitle,
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

export const WidgetLivePreview = ({
  greetMessage,
  suggestions,
  theme,
  appearance,
}: WidgetLivePreviewProps) => {
  const userTextColor = getContrastingTextColor(theme.userBubbleColor)
  const botTextColor = getContrastingTextColor(theme.botBubbleColor, "#111111")
  const launcherTextColor = getContrastingTextColor(appearance.launcherColor)
  const primaryTextColor = getContrastingTextColor(theme.primaryColor)
  const launcherImageUrl = appearance.launcherIconUrl?.trim() || ""
  const hasLauncherImage = launcherImageUrl.length > 0

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-4">
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
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {/* Widget preview in a "browser chrome" frame */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-md">
          {/* Browser bar */}
          <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-400/70" />
              <div className="size-2.5 rounded-full bg-amber-400/70" />
              <div className="size-2.5 rounded-full bg-green-400/70" />
            </div>
            <div className="mx-2 flex-1 rounded bg-background/80 px-2 py-0.5 text-center text-[10px] text-muted-foreground/60">
              yourwebsite.com
            </div>
          </div>

          {/* Website background */}
          <div
            className="relative bg-background/30 p-4"
            style={{ minHeight: "320px" }}
          >
            {/* Fake page content lines */}
            <div className="space-y-2 opacity-20">
              <div className="h-3 w-3/4 rounded bg-foreground/20" />
              <div className="h-2 w-full rounded bg-foreground/10" />
              <div className="h-2 w-5/6 rounded bg-foreground/10" />
              <div className="h-2 w-4/6 rounded bg-foreground/10" />
            </div>

            {/* Chat widget floating in bottom-right */}
            <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
              {/* Chat window */}
              <div
                className="w-[220px] overflow-hidden border shadow-xl"
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
                        <span className="size-1.5 rounded-full bg-green-400" />
                        <p className="text-[9px] leading-none text-white/70">
                          Online
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex size-5 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
                      <MinusIcon className="size-3" />
                    </div>
                    <div className="flex size-5 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
                      <XIcon className="size-3" />
                    </div>
                  </div>
                </div>

                {/* Chat body */}
                <div className="space-y-2 bg-background px-3 py-3">
                  {/* Bot message */}
                  <div
                    className="max-w-[90%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed"
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
                          className="rounded-full border bg-muted/30 px-2 py-0.5 text-[9px] text-muted-foreground"
                          key={suggestion}
                        >
                          {suggestion.length > 18
                            ? suggestion.slice(0, 18) + "…"
                            : suggestion}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <div className="border-t bg-background px-2.5 py-2">
                  <div className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-2.5 py-1.5">
                    <span className="flex-1 text-[9px] text-muted-foreground/60">
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
                    <p className="mt-1.5 text-center text-[9px] text-muted-foreground/50">
                      Powered by {appearance.poweredByText}
                    </p>
                  )}
                </div>
              </div>

              {/* Launcher button */}
              <button
                className={cn(
                  "inline-flex text-xs font-medium shadow-lg transition-all hover:scale-105",
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
          </div>
        </div>

        {/* Launcher standalone preview */}
        <div className="rounded-xl border bg-muted/10 p-4">
          <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Launcher standalone
          </p>
          <div className="flex items-center gap-3">
            <button
              className={cn(
                "inline-flex text-sm font-medium shadow-md",
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
            <div className="text-xs text-muted-foreground">
              ← Click to open chat
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
