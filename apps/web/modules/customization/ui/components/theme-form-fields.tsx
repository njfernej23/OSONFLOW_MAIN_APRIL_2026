import { type ChangeEvent, useRef } from "react"
import { UseFormReturn } from "react-hook-form"
import {
  ImageIcon,
  PaletteIcon,
  TypeIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { FormSchema } from "../../types"
import { ColorFormField } from "./color-form-field"
import { IMAGE_UPLOAD_ACCEPT, readImageAsDataUrl } from "./image-upload-utils"

interface ThemeFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

const SectionHeader = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) => (
  <div className="flex items-start gap-2.5 pb-1">
    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
)

export const ThemeFormFields = ({ form }: ThemeFormFieldsProps) => {
  const logoUploadInputRef = useRef<HTMLInputElement>(null)
  const backgroundUploadInputRef = useRef<HTMLInputElement>(null)

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const dataUrl = await readImageAsDataUrl(file)
      form.setValue("theme.logoUrl", dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
      toast.success("Logo image uploaded")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload this image"
      toast.error(message)
    }
  }

  const handleBackgroundFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const dataUrl = await readImageAsDataUrl(file)
      form.setValue("theme.backgroundImageUrl", dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
      toast.success("Background image uploaded")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload this image"
      toast.error(message)
    }
  }

  return (
    <div className="space-y-7">
      {/* Identity section */}
      <div className="space-y-4">
        <SectionHeader
          icon={<TypeIcon className="size-3.5 text-muted-foreground" />}
          title="Identity"
          description="Assistant name and brand logo"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="theme.assistantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Assistant Name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-muted/20"
                    placeholder="Support Assistant"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="theme.logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Logo</FormLabel>
                <FormControl>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        accept={IMAGE_UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={handleLogoFileChange}
                        ref={logoUploadInputRef}
                        type="file"
                      />
                      <Button
                        onClick={() => logoUploadInputRef.current?.click()}
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
                              form.setValue("theme.logoUrl", "", {
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
                              alt="Logo preview"
                              className="size-5 rounded object-cover"
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
                  Upload an image from your device
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="border-t" />

      <div className="space-y-4">
        <SectionHeader
          icon={<ImageIcon className="size-3.5 text-muted-foreground" />}
          title="Home background"
          description="Image shown behind the widget welcome and FAQ cards"
        />
        <FormField
          control={form.control}
          name="theme.backgroundImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">
                Background Image
              </FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <input
                    accept={IMAGE_UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={handleBackgroundFileChange}
                    ref={backgroundUploadInputRef}
                    type="file"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => backgroundUploadInputRef.current?.click()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <UploadIcon className="size-3.5" />
                      Upload background
                    </Button>
                    {field.value ? (
                      <Button
                        onClick={() => {
                          form.setValue("theme.backgroundImageUrl", "", {
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
                    ) : null}
                  </div>
                  {field.value ? (
                    <div className="overflow-hidden rounded-xl border bg-muted/20">
                      <img
                        alt="Background preview"
                        className="h-28 w-full object-cover"
                        src={field.value}
                      />
                    </div>
                  ) : null}
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Use a wide image with enough contrast for white text.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="border-t" />

      {/* Colors section */}
      <div className="space-y-4">
        <SectionHeader
          icon={<PaletteIcon className="size-3.5 text-muted-foreground" />}
          title="Colors"
          description="Primary color, header gradient, and message bubbles"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorFormField
            description="Buttons and highlights"
            form={form}
            label="Primary Color"
            name="theme.primaryColor"
          />
          <div className="space-y-3 rounded-xl border bg-muted/10 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">
              Header Gradient
            </p>
            <ColorFormField
              description="Gradient start"
              form={form}
              label="Start"
              name="theme.headerGradientStart"
            />
            <ColorFormField
              description="Gradient end"
              form={form}
              label="End"
              name="theme.headerGradientEnd"
            />
          </div>
          <ColorFormField
            description="Customer message bubbles"
            form={form}
            label="User Bubble"
            name="theme.userBubbleColor"
          />
          <ColorFormField
            description="Assistant message bubbles"
            form={form}
            label="Assistant Bubble"
            name="theme.botBubbleColor"
          />
        </div>
      </div>
    </div>
  )
}
