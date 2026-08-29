"use client"

import { useSyncExternalStore } from "react"
import { UseFormReturn } from "react-hook-form"
import { CheckIcon, PipetteIcon } from "lucide-react"

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  getContrastRatio,
  normalizeHexColor,
} from "@workspace/ui/lib/widget-customization"
import { cn } from "@workspace/ui/lib/utils"
import { FormSchema } from "../../types"

type ColorFieldName =
  | "theme.primaryColor"
  | "theme.headerGradientStart"
  | "theme.headerGradientEnd"
  | "theme.userBubbleColor"
  | "theme.botBubbleColor"
  | "theme.headerBannerTextColor"
  | "theme.headerBannerAccentColor"
  | "appearance.launcherColor"

interface ColorFormFieldProps {
  form: UseFormReturn<FormSchema>
  name: ColorFieldName
  label: string
  description?: string
  placeholder?: string
  fallbackColor?: string
  /**
   * When set, the field reports the WCAG contrast ratio against this colour.
   * Used wherever the value ends up behind visitor-facing text.
   */
  contrastAgainst?: string
  contrastLabel?: string
}

/** Neutral starting points offered under every colour field. */
const QUICK_SWATCHES = [
  "#000000",
  "#111827",
  "#1e3a8a",
  "#0f766e",
  "#15803d",
  "#c2410c",
  "#b91c1c",
  "#6d28d9",
  "#be185d",
  "#ffffff",
]

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>
}

const subscribeToNothing = () => () => {}

const getEyeDropper = (): EyeDropperConstructor | null => {
  if (typeof window === "undefined") {
    return null
  }

  return (
    (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper ??
    null
  )
}

const ContrastBadge = ({
  foreground,
  background,
  label,
}: {
  foreground: string
  background: string
  label: string
}) => {
  const ratio = getContrastRatio(foreground, background)

  if (ratio === null) {
    return null
  }

  const rounded = Math.round(ratio * 10) / 10
  const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA·lg" : "Fail"
  const tone =
    ratio >= 4.5
      ? "console-tone-positive"
      : ratio >= 3
        ? "console-tone-warning"
        : "console-tone-critical"

  return (
    <span
      className={cn(
        "console-tone-wash inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        tone
      )}
      title={`${label}: contrast ratio ${rounded}:1`}
    >
      <span className="console-numeral text-[10px]">{rounded}:1</span>
      <span className="text-foreground/70">{grade}</span>
    </span>
  )
}

export const ColorFormField = ({
  form,
  name,
  label,
  description,
  placeholder = "#3b82f6",
  fallbackColor = "#111111",
  contrastAgainst,
  contrastLabel = "Text on this colour",
}: ColorFormFieldProps) => {
  // Resolved on the client only: the server has no `window`, and rendering the
  // button optimistically would hydrate differently in Safari and Firefox.
  const supportsEyeDropper = useSyncExternalStore(
    subscribeToNothing,
    () => Boolean(getEyeDropper()),
    () => false
  )

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const rawValue = typeof field.value === "string" ? field.value : ""
        const colorValue = rawValue.length > 0 ? rawValue : fallbackColor
        const normalized = normalizeHexColor(colorValue) ?? fallbackColor

        const pickWithEyeDropper = async () => {
          const EyeDropper = getEyeDropper()
          if (!EyeDropper) return

          try {
            const result = await new EyeDropper().open()
            field.onChange(result.sRGBHex)
          } catch {
            // The visitor dismissed the picker; nothing to apply.
          }
        }

        return (
          <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {label}
              </span>
              {contrastAgainst ? (
                <ContrastBadge
                  background={normalized}
                  foreground={contrastAgainst}
                  label={contrastLabel}
                />
              ) : null}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <div className="relative shrink-0">
                <input
                  aria-label={`${label} colour picker`}
                  className="size-9 cursor-pointer rounded-[9px] border border-[var(--console-hairline)] bg-background p-0.5 shadow-sm transition-transform duration-100 hover:scale-105 active:scale-95"
                  onChange={(event) => field.onChange(event.target.value)}
                  style={{ appearance: "none", WebkitAppearance: "none" }}
                  type="color"
                  value={normalized}
                />
              </div>
              <FormControl>
                <Input
                  className="h-9 min-w-0 flex-1 bg-background font-mono text-xs uppercase"
                  onChange={field.onChange}
                  placeholder={placeholder}
                  value={rawValue}
                />
              </FormControl>
              {supportsEyeDropper ? (
                <button
                  aria-label={`Sample a colour from the screen for ${label}`}
                  className="console-segment-item flex size-9 shrink-0 items-center justify-center border border-[var(--console-hairline-soft)] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={pickWithEyeDropper}
                  title="Sample a colour from the screen"
                  type="button"
                >
                  <PipetteIcon className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1">
              {QUICK_SWATCHES.map((swatch) => {
                const isActive = normalized === swatch

                return (
                  <button
                    aria-label={`Set ${label} to ${swatch}`}
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-transform hover:scale-110",
                      isActive
                        ? "border-foreground/70"
                        : "border-[var(--console-hairline)]"
                    )}
                    key={swatch}
                    onClick={() => field.onChange(swatch)}
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                    type="button"
                  >
                    {isActive ? (
                      <CheckIcon
                        className="size-2.5"
                        style={{
                          color:
                            swatch === "#ffffff" ? "#111111" : "#ffffff",
                        }}
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {description ? (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
            <FormMessage className="mt-1.5" />
          </FormItem>
        )
      }}
    />
  )
}
