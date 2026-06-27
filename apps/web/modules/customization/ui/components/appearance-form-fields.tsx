import { type ChangeEvent, type ReactNode, useRef } from "react"
import { UseFormReturn } from "react-hook-form"
import { useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import {
  ArrowUpIcon,
  CircleHelpIcon,
  EyeIcon,
  Maximize2Icon,
  MessageSquareTextIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { toast } from "sonner"
import type { WidgetAnimation } from "@workspace/ui/lib/widget-customization"
import { FormSchema } from "../../types"
import { ColorFormField } from "./color-form-field"
import { IMAGE_UPLOAD_ACCEPT, uploadImageFile } from "./image-upload-utils"

interface AppearanceFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

const launcherIcons = [
  {
    value: "chat",
    label: "Chat Bubble",
    icon: <MessageSquareTextIcon className="size-5" />,
  },
  {
    value: "sparkles",
    label: "Sparkles",
    icon: <SparklesIcon className="size-5" />,
  },
  {
    value: "question",
    label: "Question",
    icon: <CircleHelpIcon className="size-5" />,
  },
]

const animationOptions: Array<{
  value: WidgetAnimation
  label: string
  icon: ReactNode
}> = [
  {
    value: "slide-up",
    label: "Slide",
    icon: <ArrowUpIcon className="size-5" />,
  },
  {
    value: "scale",
    label: "Scale",
    icon: <Maximize2Icon className="size-5" />,
  },
  {
    value: "fade",
    label: "Fade",
    icon: <EyeIcon className="size-5" />,
  },
  {
    value: "pop",
    label: "Pop",
    icon: <SparklesIcon className="size-5" />,
  },
]

export const AppearanceFormFields = ({ form }: AppearanceFormFieldsProps) => {
  const generateImageUploadUrl = useMutation(
    api.private.widgetSettings.generateImageUploadUrl
  )
  const getUploadedImageUrl = useMutation(
    api.private.widgetSettings.getUploadedImageUrl
  )
  const launcherUploadInputRef = useRef<HTMLInputElement>(null)
  const hasLauncherImage = Boolean(
    form.watch("appearance.launcherIconUrl")?.trim()
  )

  const handleLauncherImageChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const imageUrl = await uploadImageFile(
        file,
        generateImageUploadUrl,
        getUploadedImageUrl
      )
      form.setValue("appearance.launcherIconUrl", imageUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
      toast.success("Launcher image uploaded")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload this image"
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Launcher label + color */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="appearance.launcherLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">
                Launcher Label
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-muted/20"
                  placeholder="Chat with us"
                />
              </FormControl>
              <FormDescription className="text-xs">
                Text shown next to the launcher icon
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <ColorFormField
          description="Floating launcher button background"
          fallbackColor="#3b82f6"
          form={form}
          label="Launcher Color"
          name="appearance.launcherColor"
        />
      </div>

      <FormField
        control={form.control}
        name="appearance.launcherIconUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">
              Launcher Image
            </FormLabel>
            <FormControl>
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    accept={IMAGE_UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={handleLauncherImageChange}
                    ref={launcherUploadInputRef}
                    type="file"
                  />
                  <Button
                    onClick={() => launcherUploadInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <UploadIcon className="size-3.5" />
                    Upload from device
                  </Button>

                  {field.value ? (
                    <>
                      <Button
                        onClick={() => {
                          form.setValue("appearance.launcherIconUrl", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <XIcon className="size-3.5" />
                        Remove
                      </Button>
                      <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-1">
                        <img
                          alt="Launcher image preview"
                          className="size-5 rounded-full object-cover"
                          src={field.value}
                        />
                        <div className="text-[11px] text-muted-foreground">
                          <p className="leading-none">Thumbnail</p>
                          <p className="mt-0.5 leading-none text-muted-foreground/70">
                            Uploaded image
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </FormControl>
            <FormDescription className="text-xs">
              Upload an image from your device, up to 5MB. Label text is hidden
              when an image is set.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="rounded-xl border bg-muted/10 p-4">
        <FormField
          control={form.control}
          name="appearance.launcherPromptEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <FormLabel className="text-xs font-medium">
                  Delayed Launcher Prompt
                </FormLabel>
                <FormDescription className="text-xs">
                  Show a short message above the launcher after a delay
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px]">
          <FormField
            control={form.control}
            name="appearance.launcherPromptText"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Prompt Text
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-muted/20"
                    placeholder="Need help? Talk with us"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appearance.launcherPromptDelaySeconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Delay Seconds
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-muted/20"
                    max={120}
                    min={0}
                    step={1}
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Launcher icon visual picker */}
      <FormField
        control={form.control}
        name="appearance.launcherIcon"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Launcher Icon</FormLabel>
            <FormDescription className="mb-3 text-xs">
              {hasLauncherImage
                ? "Fallback icon used when launcher image is removed"
                : "Icon displayed in the embed launcher button"}
            </FormDescription>
            <FormControl>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {launcherIcons.map((option) => (
                  <button
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      field.value === option.value
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-muted/10 text-muted-foreground"
                    )}
                    key={option.value}
                    onClick={() => field.onChange(option.value)}
                    type="button"
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="appearance.animation"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">
              Open & Close Animation
            </FormLabel>
            <FormDescription className="mb-3 text-xs">
              Motion used when the embedded widget opens and closes
            </FormDescription>
            <FormControl>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {animationOptions.map((option) => (
                  <button
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      field.value === option.value
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-muted/10 text-muted-foreground"
                    )}
                    key={option.value}
                    onClick={() => field.onChange(option.value)}
                    type="button"
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="appearance.poweredByText"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">
              Powered By Text
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                className="bg-muted/20"
                placeholder="Osonflow"
                value={field.value ?? ""}
              />
            </FormControl>
            <FormDescription className="text-xs">
              Footer displays as: Powered by {field.value || "Osonflow"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Powered by toggle */}
      <FormField
        control={form.control}
        name="appearance.showPoweredBy"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3.5">
            <div className="space-y-0.5">
              <FormLabel className="text-sm font-medium">
                Show Powered By Footer
              </FormLabel>
              <FormDescription className="text-xs">
                Enable or disable the powered-by text shown in the widget footer
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
