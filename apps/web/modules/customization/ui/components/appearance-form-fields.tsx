import { UseFormReturn } from "react-hook-form"
import {
  CircleHelpIcon,
  MessageSquareTextIcon,
  SparklesIcon,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
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
import { FormSchema } from "../../types"
import { ColorFormField } from "./color-form-field"

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

export const AppearanceFormFields = ({ form }: AppearanceFormFieldsProps) => {
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

      {/* Launcher icon visual picker */}
      <FormField
        control={form.control}
        name="appearance.launcherIcon"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Launcher Icon</FormLabel>
            <FormDescription className="mb-3 text-xs">
              Icon displayed in the embed launcher button
            </FormDescription>
            <FormControl>
              <div className="grid grid-cols-3 gap-2">
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

      {/* Powered by toggle */}
      <FormField
        control={form.control}
        name="appearance.showPoweredBy"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3.5">
            <div className="space-y-0.5">
              <FormLabel className="text-sm font-medium">
                Show "Powered by Osonflow"
              </FormLabel>
              <FormDescription className="text-xs">
                Display the Osonflow branding footer in the widget
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
