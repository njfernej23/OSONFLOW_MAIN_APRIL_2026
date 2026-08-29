"use client"

import { UseFormReturn } from "react-hook-form"
import {
  ArrowUpIcon,
  BellIcon,
  CircleHelpIcon,
  EyeIcon,
  MaximizeIcon,
  MessageSquareTextIcon,
  MousePointerClickIcon,
  MoveIcon,
  SparklesIcon,
  TimerIcon,
  WandSparklesIcon,
} from "lucide-react"

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import {
  getContrastingTextColor,
  type WidgetAnimation,
  type WidgetAutoOpenFrequency,
  type WidgetLauncherPosition,
} from "@workspace/ui/lib/widget-customization"

import { FormSchema } from "../../types"
import { ColorFormField } from "./color-form-field"
import { ImageUploadField } from "./image-upload-field"
import {
  NumberScrubber,
  OptionCards,
  SettingRow,
  SettingsDivider,
  SettingsGroup,
  SettingsNotice,
} from "./settings-primitives"

interface AppearanceFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

const launcherIconOptions = [
  {
    value: "chat" as const,
    label: "Chat bubble",
    icon: <MessageSquareTextIcon className="size-4" />,
  },
  {
    value: "sparkles" as const,
    label: "Sparkles",
    icon: <SparklesIcon className="size-4" />,
  },
  {
    value: "question" as const,
    label: "Question",
    icon: <CircleHelpIcon className="size-4" />,
  },
]

const animationOptions: Array<{
  value: WidgetAnimation
  label: string
  hint: string
  icon: React.ReactNode
}> = [
  {
    value: "slide-up",
    label: "Slide",
    hint: "Rises into place",
    icon: <ArrowUpIcon className="size-4" />,
  },
  {
    value: "scale",
    label: "Scale",
    hint: "Grows from the launcher",
    icon: <MaximizeIcon className="size-4" />,
  },
  {
    value: "fade",
    label: "Fade",
    hint: "No movement",
    icon: <EyeIcon className="size-4" />,
  },
  {
    value: "pop",
    label: "Pop",
    hint: "Overshoots slightly",
    icon: <WandSparklesIcon className="size-4" />,
  },
]

const positionOptions: Array<{
  value: WidgetLauncherPosition
  label: string
  hint: string
}> = [
  { value: "bottom-right", label: "Bottom right", hint: "Default" },
  { value: "bottom-left", label: "Bottom left", hint: "Clears right rails" },
]

const autoOpenFrequencyOptions: Array<{
  value: WidgetAutoOpenFrequency
  label: string
  hint: string
}> = [
  { value: "session", label: "Once per session", hint: "Resets on close" },
  { value: "visitor", label: "Once per visitor", hint: "Remembered" },
  { value: "always", label: "Every page", hint: "Most intrusive" },
]

/** Miniature of the host page showing where the launcher will sit. */
const PlacementPreview = ({
  position,
  offsetX,
  offsetY,
  size,
  color,
}: {
  position: WidgetLauncherPosition
  offsetX: number
  offsetY: number
  size: number
  color: string
}) => (
  <div className="console-inset relative h-[104px] w-full overflow-hidden bg-muted/40">
    <div className="absolute inset-0 flex flex-col gap-1.5 p-3 opacity-40">
      <span className="h-1.5 w-2/3 rounded-full bg-foreground/25" />
      <span className="h-1 w-full rounded-full bg-foreground/15" />
      <span className="h-1 w-4/5 rounded-full bg-foreground/15" />
    </div>
    <span
      aria-hidden
      className="absolute rounded-full shadow-[0_10px_22px_-12px_rgba(15,23,42,0.6)]"
      style={{
        backgroundColor: color,
        color: getContrastingTextColor(color),
        // The preview plate is roughly a quarter of a real viewport, so the
        // offsets are shown at the same scale to stay comparable.
        bottom: `${Math.min(offsetY / 4, 42)}px`,
        [position === "bottom-right" ? "right" : "left"]:
          `${Math.min(offsetX / 4, 42)}px`,
        height: `${size / 3}px`,
        width: `${size / 3}px`,
      }}
    />
  </div>
)

export const AppearanceFormFields = ({ form }: AppearanceFormFieldsProps) => {
  const appearance = form.watch("appearance")
  const hasLauncherImage = Boolean(appearance.launcherIconUrl?.trim())

  return (
    <div className="min-w-0">
      <SettingsGroup
        description="The button that sits on your customer's page when the widget is closed."
        icon={MousePointerClickIcon}
        title="Launcher"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="appearance.launcherLabel"
            render={({ field }) => (
              <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                <span className="text-xs font-medium text-foreground">
                  Launcher label
                </span>
                <FormControl>
                  <Input
                    {...field}
                    className="mt-2.5 h-9 bg-background"
                    placeholder="Chat with us"
                  />
                </FormControl>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Revealed next to the icon. Hidden when a launcher image is
                  set.
                </p>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />

          <ColorFormField
            contrastAgainst={getContrastingTextColor(appearance.launcherColor)}
            contrastLabel="Launcher icon and label"
            description="Background of the floating button."
            fallbackColor="#3b82f6"
            form={form}
            label="Launcher colour"
            name="appearance.launcherColor"
          />
        </div>

        <FormField
          control={form.control}
          name="appearance.launcherIconUrl"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <ImageUploadField
                description="Replaces the icon entirely — the label is hidden when set."
                emptyHint="Circular crop · up to 5MB"
                label="Launcher image"
                onChange={(url) => field.onChange(url)}
                value={field.value}
              />
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appearance.launcherIcon"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <p className="text-xs font-medium text-foreground">
                Launcher icon
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {hasLauncherImage
                  ? "Used if the launcher image is ever removed."
                  : "Drawn inside the floating button."}
              </p>
              <FormControl>
                <OptionCards
                  className="mt-2.5"
                  columns={3}
                  onChange={field.onChange}
                  options={launcherIconOptions}
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
        description="Where the launcher sits on the page and how large it is. Applied by the embed script the moment your settings load."
        icon={MoveIcon}
        title="Placement"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <FormField
              control={form.control}
              name="appearance.launcherPosition"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-0">
                  <FormControl>
                    <OptionCards
                      columns={2}
                      onChange={field.onChange}
                      options={positionOptions}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage className="mt-1.5" />
                </FormItem>
              )}
            />

            <div className="console-inset grid gap-4 px-3.5 py-3.5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="appearance.launcherOffsetX"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-0">
                    <FormControl>
                      <NumberScrubber
                        label="Side offset"
                        max={160}
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
              <FormField
                control={form.control}
                name="appearance.launcherOffsetY"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-0">
                    <FormControl>
                      <NumberScrubber
                        label="Bottom offset"
                        max={160}
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
              <FormField
                control={form.control}
                name="appearance.launcherSize"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-0 sm:col-span-2">
                    <FormControl>
                      <NumberScrubber
                        description="Anything under 44px is below the recommended tap target on touch devices."
                        label="Launcher size"
                        marks={[44, 48, 56, 64]}
                        max={76}
                        min={40}
                        onChange={field.onChange}
                        unit="px"
                        value={Number(field.value)}
                      />
                    </FormControl>
                    <FormMessage className="mt-1.5" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium text-foreground">On the page</p>
            <PlacementPreview
              color={appearance.launcherColor}
              offsetX={Number(appearance.launcherOffsetX)}
              offsetY={Number(appearance.launcherOffsetY)}
              position={appearance.launcherPosition}
              size={Number(appearance.launcherSize)}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Raise the bottom offset to clear a cookie banner or a sticky
              checkout bar.
            </p>
          </div>
        </div>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="A short message that appears above the launcher to invite the first conversation."
        icon={MessageSquareTextIcon}
        title="Invitation bubble"
      >
        <FormField
          control={form.control}
          name="appearance.launcherPromptEnabled"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <SettingRow
                control={
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                }
                description="Shows once per page load and disappears when the visitor dismisses it."
                label="Show an invitation after a delay"
              >
                {field.value ? (
                  <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                    <FormField
                      control={form.control}
                      name="appearance.launcherPromptText"
                      render={({ field: textField }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <span className="text-xs font-medium text-foreground">
                            Message
                          </span>
                          <FormControl>
                            <Input
                              {...textField}
                              className="mt-2 h-9 bg-background"
                              placeholder="Need help? Talk with us"
                            />
                          </FormControl>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appearance.launcherPromptDelaySeconds"
                      render={({ field: delayField }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <FormControl>
                            <NumberScrubber
                              label="Delay"
                              max={120}
                              min={0}
                              onChange={delayField.onChange}
                              unit="s"
                              value={Number(delayField.value)}
                            />
                          </FormControl>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}
              </SettingRow>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Let the widget open itself so a visitor sees the greeting without clicking."
        icon={TimerIcon}
        title="Proactive open"
      >
        <FormField
          control={form.control}
          name="appearance.autoOpenEnabled"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <SettingRow
                control={
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                }
                description="The visitor can still close it, and it never reopens within the same page view."
                label="Open the widget automatically"
              >
                {field.value ? (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="appearance.autoOpenDelaySeconds"
                      render={({ field: delayField }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <FormControl>
                            <NumberScrubber
                              description="Measured from when the page finishes loading."
                              label="Delay before opening"
                              marks={[3, 8, 15, 30]}
                              max={300}
                              min={0}
                              onChange={delayField.onChange}
                              unit="s"
                              value={Number(delayField.value)}
                            />
                          </FormControl>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appearance.autoOpenFrequency"
                      render={({ field: frequencyField }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <p className="text-xs font-medium text-foreground">
                            How often
                          </p>
                          <FormControl>
                            <OptionCards
                              className="mt-2.5"
                              columns={3}
                              onChange={frequencyField.onChange}
                              options={autoOpenFrequencyOptions}
                              value={frequencyField.value}
                            />
                          </FormControl>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                    {appearance.autoOpenFrequency === "always" ? (
                      <SettingsNotice
                        icon={BellIcon}
                        title="Opening on every page is intrusive"
                        tone="warning"
                      >
                        Visitors who dismiss the widget will see it reopen on
                        the next page. Prefer once per session unless you are
                        running a short campaign.
                      </SettingsNotice>
                    ) : null}
                  </div>
                ) : null}
              </SettingRow>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Motion, sound and the footer line shown under the composer."
        icon={SparklesIcon}
        title="Behaviour"
      >
        <FormField
          control={form.control}
          name="appearance.animation"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <p className="text-xs font-medium text-foreground">
                Open and close motion
              </p>
              <FormControl>
                <OptionCards
                  className="mt-2.5"
                  columns={4}
                  onChange={field.onChange}
                  options={animationOptions}
                  value={field.value}
                />
              </FormControl>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appearance.notificationSoundEnabled"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <SettingRow
                control={
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                }
                description="Plays a short chime when an operator or the assistant replies while the widget is not focused."
                label="Notification sound"
              />
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appearance.showPoweredBy"
          render={({ field }) => (
            <FormItem className="min-w-0 space-y-0">
              <SettingRow
                control={
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                }
                description="A single line under the composer."
                label="Show the footer credit"
              >
                {field.value ? (
                  <FormField
                    control={form.control}
                    name="appearance.poweredByText"
                    render={({ field: textField }) => (
                      <FormItem className="min-w-0 space-y-0">
                        <span className="text-xs font-medium text-foreground">
                          Credit text
                        </span>
                        <FormControl>
                          <Input
                            {...textField}
                            className="mt-2 h-9 bg-background"
                            placeholder="Osonflow"
                            value={textField.value ?? ""}
                          />
                        </FormControl>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Renders as{" "}
                          <span className="text-foreground">
                            Powered by {textField.value || "Osonflow"}
                          </span>
                          .
                        </p>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />
                ) : null}
              </SettingRow>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
      </SettingsGroup>
    </div>
  )
}
