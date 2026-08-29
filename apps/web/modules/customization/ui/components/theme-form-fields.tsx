"use client"

import { UseFormReturn } from "react-hook-form"
import {
  AccessibilityIcon,
  CheckIcon,
  ImageIcon,
  PaletteIcon,
  SwatchBookIcon,
  TypeIcon,
} from "lucide-react"

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  getContrastRatio,
  getContrastingTextColor,
  WIDGET_BRAND_FONT_STACKS,
  WIDGET_FONT_STACKS,
  type WidgetBrandFont,
  type WidgetBrandMode,
  type WidgetBrandStyle,
  type WidgetFontFamily,
} from "@workspace/ui/lib/widget-customization"
import { cn } from "@workspace/ui/lib/utils"

import { FormSchema } from "../../types"
import { isPresetActive, THEME_PRESETS } from "../../lib/theme-presets"
import { ColorFormField } from "./color-form-field"
import { ImageUploadField } from "./image-upload-field"
import {
  NumberScrubber,
  OptionCards,
  SettingRow,
  SettingsDivider,
  SettingsGroup,
} from "./settings-primitives"

interface ThemeFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

const setDirty = { shouldDirty: true, shouldValidate: true } as const

const brandModeOptions: Array<{
  value: WidgetBrandMode
  label: string
  hint: string
}> = [
  { value: "image", label: "Logo", hint: "Show an image" },
  { value: "text", label: "Wordmark", hint: "Show brand text" },
  { value: "none", label: "None", hint: "Hide the mark" },
]

const brandStyleOptions: Array<{
  value: WidgetBrandStyle
  label: string
  hint: string
}> = [
  { value: "plain", label: "Plain", hint: "No container" },
  { value: "pill", label: "Pill", hint: "Tinted capsule" },
  { value: "gradient", label: "Gradient", hint: "Accent fade" },
]

const fontOptions: Array<{ value: WidgetFontFamily; label: string }> = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "rounded", label: "Rounded" },
  { value: "mono", label: "Mono" },
]

const brandFontOptions: Array<{ value: WidgetBrandFont; label: string }> = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "display", label: "Display" },
  { value: "mono", label: "Mono" },
]

/* ── accessibility audit ────────────────────────────────────────────────── */

type ContrastCheck = {
  id: string
  label: string
  foreground: string
  background: string
}

const ContrastAudit = ({ checks }: { checks: ContrastCheck[] }) => {
  const results = checks.map((check) => ({
    ...check,
    ratio: getContrastRatio(check.foreground, check.background),
  }))
  const failing = results.filter(
    (result) => result.ratio !== null && result.ratio < 4.5
  )

  return (
    <div className="console-inset overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--console-hairline-soft)] px-4 py-3">
        <p className="text-xs font-semibold text-foreground">
          Contrast against WCAG AA
        </p>
        <span
          className={cn(
            "console-tone-wash rounded-full border px-2 py-0.5 text-[10px] font-medium",
            failing.length === 0
              ? "console-tone-positive"
              : "console-tone-warning"
          )}
        >
          {failing.length === 0
            ? "All passing"
            : `${failing.length} below 4.5:1`}
        </span>
      </div>
      <div className="divide-y divide-[var(--console-hairline-soft)]">
        {results.map((result) => {
          const ratio = result.ratio
          const passes = ratio !== null && ratio >= 4.5
          const large = ratio !== null && ratio >= 3 && ratio < 4.5

          return (
            <div
              className="flex items-center justify-between gap-3 px-4 py-2.5"
              key={result.id}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-[7px] border border-[var(--console-hairline-soft)] text-[10px] font-semibold"
                  style={{
                    backgroundColor: result.background,
                    color: result.foreground,
                  }}
                >
                  Aa
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {result.label}
                </span>
              </div>
              <span
                className={cn(
                  "console-numeral shrink-0 text-[11px]",
                  passes
                    ? "console-tone-positive"
                    : large
                      ? "console-tone-warning"
                      : "console-tone-critical"
                )}
              >
                {ratio === null ? "—" : `${Math.round(ratio * 10) / 10}:1`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── brand kit ──────────────────────────────────────────────────────────── */

export const ThemeFormFields = ({ form }: ThemeFormFieldsProps) => {
  const theme = form.watch("theme")
  const launcherColor = form.watch("appearance.launcherColor")
  const brandMode = theme.headerBrandMode
  const brandText = theme.headerBannerText?.trim() || theme.assistantName

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((entry) => entry.id === presetId)
    if (!preset) return

    for (const [key, value] of Object.entries(preset.theme)) {
      form.setValue(
        `theme.${key}` as `theme.${keyof typeof preset.theme}`,
        value as never,
        setDirty
      )
    }
    form.setValue("appearance.launcherColor", preset.launcherColor, setDirty)
  }

  return (
    <div className="min-w-0">
      <SettingsGroup
        description="A starting point for colour, radius and typeface. Applying one never touches your copy, help content or launcher behaviour."
        icon={SwatchBookIcon}
        title="Presets"
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const isActive = isPresetActive(preset, theme, launcherColor)

            return (
              <button
                className={cn(
                  "console-inset group flex min-w-0 items-center gap-3 px-3 py-3 text-left transition-all duration-150",
                  "hover:border-[var(--console-hairline)] hover:bg-muted/45",
                  isActive &&
                    "border-primary/45 bg-primary/[0.06] ring-1 ring-primary/20"
                )}
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                title={preset.description}
                type="button"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 overflow-hidden rounded-[9px] border border-[var(--console-hairline-soft)]"
                >
                  {preset.swatches.map((swatch) => (
                    <span
                      className="flex-1"
                      key={swatch}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-foreground">
                      {preset.name}
                    </span>
                    {isActive ? (
                      <CheckIcon className="size-3 shrink-0 text-primary" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {preset.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="How the assistant introduces itself and the typeface every widget surface inherits."
        icon={TypeIcon}
        title="Identity"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="theme.assistantName"
            render={({ field }) => (
              <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                <span className="text-xs font-medium text-foreground">
                  Assistant name
                </span>
                <FormControl>
                  <Input
                    {...field}
                    className="mt-2.5 h-9 bg-background"
                    placeholder="Support Assistant"
                  />
                </FormControl>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Shown in the chat header and used as the fallback wordmark.
                </p>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="theme.logoUrl"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-0">
                <ImageUploadField
                  description="Square works best — shown in the chat header."
                  label="Logo"
                  onChange={(url) => field.onChange(url)}
                  value={field.value}
                />
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="theme.fontFamily"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <p className="text-xs font-medium text-foreground">Typeface</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Applied to every widget screen — home, chat, help centre and
                voice.
              </p>
              <FormControl>
                <OptionCards
                  className="mt-2.5"
                  columns={4}
                  onChange={field.onChange}
                  options={fontOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                    preview: (
                      <span
                        className="block truncate text-lg leading-tight text-foreground"
                        style={{ fontFamily: WIDGET_FONT_STACKS[option.value] }}
                      >
                        Ag
                      </span>
                    ),
                  }))}
                  value={field.value}
                />
              </FormControl>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="The mark that sits at the top of the widget home screen, over your background."
        icon={PaletteIcon}
        title="Home brand mark"
      >
        <FormField
          control={form.control}
          name="theme.headerBrandMode"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <FormControl>
                <OptionCards
                  columns={3}
                  onChange={field.onChange}
                  options={brandModeOptions}
                  value={field.value}
                />
              </FormControl>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        {brandMode === "image" ? (
          <FormField
            control={form.control}
            name="theme.headerBannerImageUrl"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-0">
                <ImageUploadField
                  description="Falls back to your logo when empty."
                  emptyHint="A wide lockup reads better here than a square icon"
                  label="Brand image"
                  onChange={(url) => field.onChange(url)}
                  shape="wide"
                  value={field.value}
                />
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
        ) : null}

        {brandMode === "text" ? (
          <>
            <FormField
              control={form.control}
              name="theme.headerBannerText"
              render={({ field }) => (
                <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                  <span className="text-xs font-medium text-foreground">
                    Wordmark
                  </span>
                  <FormControl>
                    <Input
                      {...field}
                      className="mt-2.5 h-9 bg-background"
                      placeholder={theme.assistantName}
                    />
                  </FormControl>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Leave empty to use the assistant name.
                  </p>
                  <FormMessage className="mt-1.5" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="theme.headerBannerFont"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-0">
                  <p className="text-xs font-medium text-foreground">
                    Wordmark typeface
                  </p>
                  <FormControl>
                    <OptionCards
                      className="mt-2.5"
                      columns={4}
                      onChange={field.onChange}
                      options={brandFontOptions.map((option) => ({
                        value: option.value,
                        label: option.label,
                        preview: (
                          <span
                            className="block truncate text-base leading-tight text-foreground"
                            style={{
                              fontFamily:
                                WIDGET_BRAND_FONT_STACKS[option.value],
                            }}
                          >
                            {brandText.slice(0, 10) || "Brand"}
                          </span>
                        ),
                      }))}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage className="mt-1.5" />
                </FormItem>
              )}
            />
          </>
        ) : null}

        {brandMode === "text" ? (
          <>
            <FormField
              control={form.control}
              name="theme.headerBannerStyle"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-0">
                  <p className="text-xs font-medium text-foreground">
                    Wordmark container
                  </p>
                  <FormControl>
                    <OptionCards
                      className="mt-2.5"
                      columns={3}
                      onChange={field.onChange}
                      options={brandStyleOptions}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage className="mt-1.5" />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <ColorFormField
                description="Colour of the wordmark itself."
                form={form}
                label="Wordmark colour"
                name="theme.headerBannerTextColor"
              />
              <ColorFormField
                description="Tint behind the wordmark for the pill and gradient containers."
                form={form}
                label="Container accent"
                name="theme.headerBannerAccentColor"
              />
            </div>
          </>
        ) : null}
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Image behind the welcome and help cards on the widget home screen."
        icon={ImageIcon}
        title="Home background"
      >
        <FormField
          control={form.control}
          name="theme.backgroundImageUrl"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <ImageUploadField
                description="A dark overlay is applied so white text stays readable."
                emptyHint="Wide image, up to 5MB · falls back to the header gradient"
                label="Background image"
                onChange={(url) => field.onChange(url)}
                shape="wide"
                value={field.value}
              />
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Surfaces the visitor actually sees. Contrast is checked live against WCAG AA."
        icon={PaletteIcon}
        title="Colours"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorFormField
            contrastAgainst={getContrastingTextColor(theme.primaryColor)}
            contrastLabel="Button text"
            description="Send button, links and primary actions."
            form={form}
            label="Primary"
            name="theme.primaryColor"
          />
          <ColorFormField
            contrastAgainst="#ffffff"
            contrastLabel="White header text"
            description="Top of the home hero and chat header."
            form={form}
            label="Header gradient start"
            name="theme.headerGradientStart"
          />
          <ColorFormField
            contrastAgainst="#ffffff"
            contrastLabel="White header text"
            description="Bottom of the gradient."
            form={form}
            label="Header gradient end"
            name="theme.headerGradientEnd"
          />
          <div className="console-inset flex min-w-0 flex-col justify-center gap-2.5 px-3.5 py-3">
            <span className="text-xs font-medium text-foreground">
              Gradient preview
            </span>
            <span
              aria-hidden
              className="h-12 w-full rounded-[9px] border border-[var(--console-hairline-soft)]"
              style={{
                background: `linear-gradient(135deg, ${theme.headerGradientStart}, ${theme.headerGradientEnd})`,
              }}
            />
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              Set both stops to the same value for a flat header.
            </span>
          </div>
          <ColorFormField
            contrastAgainst={getContrastingTextColor(theme.userBubbleColor)}
            contrastLabel="Visitor message text"
            description="Messages sent by the visitor."
            form={form}
            label="Visitor bubble"
            name="theme.userBubbleColor"
          />
          <ColorFormField
            contrastAgainst={getContrastingTextColor(
              theme.botBubbleColor,
              "#111111"
            )}
            contrastLabel="Assistant message text"
            description="Messages sent by the assistant."
            form={form}
            label="Assistant bubble"
            name="theme.botBubbleColor"
          />
        </div>

        <SettingRow
          description="Applied to the widget frame, message bubbles and cards."
          label="Corner radius"
        >
          <FormField
            control={form.control}
            name="theme.borderRadius"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-0">
                <FormControl>
                  <NumberScrubber
                    label="Radius"
                    marks={[0, 8, 16, 24, 32]}
                    max={32}
                    min={0}
                    onChange={field.onChange}
                    unit="px"
                    value={Number(field.value)}
                  />
                </FormControl>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Every visitor-facing colour pair, measured. Anything under 4.5:1 is hard to read at body size."
        icon={AccessibilityIcon}
        title="Accessibility"
      >
        <ContrastAudit
          checks={[
            {
              id: "user-bubble",
              label: "Visitor message text",
              background: theme.userBubbleColor,
              foreground: getContrastingTextColor(theme.userBubbleColor),
            },
            {
              id: "bot-bubble",
              label: "Assistant message text",
              background: theme.botBubbleColor,
              foreground: getContrastingTextColor(
                theme.botBubbleColor,
                "#111111"
              ),
            },
            {
              id: "header",
              label: "Header text over gradient start",
              background: theme.headerGradientStart,
              foreground: "#ffffff",
            },
            {
              id: "primary",
              label: "Primary button label",
              background: theme.primaryColor,
              foreground: getContrastingTextColor(theme.primaryColor),
            },
            {
              id: "launcher",
              label: "Launcher icon and label",
              background: launcherColor,
              foreground: getContrastingTextColor(launcherColor),
            },
          ]}
        />
      </SettingsGroup>
    </div>
  )
}
