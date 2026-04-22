import { UseFormReturn } from "react-hook-form"
import { ImageIcon, PaletteIcon, TypeIcon } from "lucide-react"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Slider } from "@workspace/ui/components/slider"
import { FormSchema } from "../../types"
import { ColorFormField } from "./color-form-field"

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
                <FormLabel className="text-xs font-medium">Logo URL</FormLabel>
                <FormControl>
                  <div className="relative">
                    <ImageIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                    <Input
                      {...field}
                      className="bg-muted/20 pl-8"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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

      <div className="border-t" />

      {/* Border radius */}
      <FormField
        control={form.control}
        name="theme.borderRadius"
        render={({ field }) => {
          const radiusValue = typeof field.value === "number" ? field.value : 16

          return (
            <FormItem>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <FormLabel className="text-sm font-medium">
                    Corner Radius
                  </FormLabel>
                  <FormDescription className="text-xs">
                    Controls how rounded the widget appears
                  </FormDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="size-8 border-2 border-foreground/20 bg-muted"
                    style={{ borderRadius: `${radiusValue}px` }}
                  />
                  <span className="w-12 text-right font-mono text-sm font-medium">
                    {radiusValue}px
                  </span>
                </div>
              </div>
              <FormControl>
                <Slider
                  className="py-1"
                  max={32}
                  min={0}
                  onValueChange={(value) => field.onChange(value[0] ?? 0)}
                  step={1}
                  value={[radiusValue]}
                />
              </FormControl>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Sharp (0px)</span>
                <span>Rounded (32px)</span>
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />
    </div>
  )
}
