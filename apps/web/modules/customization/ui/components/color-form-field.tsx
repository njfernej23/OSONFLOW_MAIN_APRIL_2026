import { UseFormReturn } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { FormSchema } from "../../types"

type ColorFieldName =
  | "theme.primaryColor"
  | "theme.headerGradientStart"
  | "theme.headerGradientEnd"
  | "theme.userBubbleColor"
  | "theme.botBubbleColor"
  | "appearance.launcherColor"

interface ColorFormFieldProps {
  form: UseFormReturn<FormSchema>
  name: ColorFieldName
  label: string
  description: string
  placeholder?: string
  fallbackColor?: string
}

export const ColorFormField = ({
  form,
  name,
  label,
  description,
  placeholder = "#3b82f6",
  fallbackColor = "#111111",
}: ColorFormFieldProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const colorValue =
          typeof field.value === "string" && field.value.length > 0
            ? field.value
            : fallbackColor

        return (
          <FormItem>
            <FormLabel className="text-xs font-medium">{label}</FormLabel>
            <div className="flex items-center gap-2">
              {/* Color input (native picker) */}
              <div className="relative shrink-0">
                <input
                  aria-label={`${label} color picker`}
                  className="size-10 cursor-pointer rounded-lg border border-border bg-background p-0.5 shadow-sm transition-transform duration-100 hover:scale-105 active:scale-95"
                  onChange={(event) => field.onChange(event.target.value)}
                  style={{ appearance: "none", WebkitAppearance: "none" }}
                  type="color"
                  value={colorValue}
                />
              </div>
              {/* Hex text input */}
              <FormControl>
                <div className="flex-1">
                  <Input
                    className="h-10 bg-muted/20 font-mono text-xs uppercase"
                    onChange={field.onChange}
                    placeholder={placeholder}
                    value={field.value ?? ""}
                  />
                </div>
              </FormControl>
            </div>
            {description && (
              <FormDescription className="text-xs">
                {description}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
