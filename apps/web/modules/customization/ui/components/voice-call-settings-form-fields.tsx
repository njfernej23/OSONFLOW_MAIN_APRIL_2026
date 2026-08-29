import { UseFormReturn } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { PhoneOffIcon } from "lucide-react"

import { FormSchema } from "../../types"
import { SettingRow, SettingsGroup } from "./settings-primitives"

const idleTimeoutOptions = [
  { value: "0", label: "Off" },
  { value: "30", label: "30 seconds" },
  { value: "60", label: "1 minute" },
  { value: "120", label: "2 minutes" },
  { value: "300", label: "5 minutes" },
]

const maxDurationOptions = [
  { value: "0", label: "Off" },
  { value: "300", label: "5 minutes" },
  { value: "600", label: "10 minutes" },
  { value: "900", label: "15 minutes" },
]

interface VoiceCallSettingsFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

export const VoiceCallSettingsFormFields = ({
  form,
}: VoiceCallSettingsFormFieldsProps) => {
  return (
    <SettingsGroup
      description="When a live voice call ends on its own, so an idle browser tab never holds a session open."
      icon={PhoneOffIcon}
      title="Call limits"
    >
      <FormField
        control={form.control}
        name="voiceCallSettings.autoEndOnGoodbye"
        render={({ field }) => (
          <FormItem className="min-w-0 space-y-0">
            <SettingRow
              control={
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              }
              description={
                'Ends the call when the visitor signals they are done, including phrases like "thanks" or "no more questions".'
              }
              label="End when the visitor says goodbye"
            />
            <FormMessage className="mt-1.5" />
          </FormItem>
        )}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <FormField
          control={form.control}
          name="voiceCallSettings.idleTimeoutSeconds"
          render={({ field }) => (
            <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
              <FormLabel className="text-xs font-medium">
                Idle timeout
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? 0)}
              >
                <FormControl>
                  <SelectTrigger className="mt-2.5 h-9 bg-background">
                    <SelectValue placeholder="Select idle timeout" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {idleTimeoutOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="mt-2 text-[11px] leading-relaxed">
                End the call if nobody speaks for this long.
              </FormDescription>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="voiceCallSettings.maxDurationSeconds"
          render={({ field }) => (
            <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
              <FormLabel className="text-xs font-medium">
                Maximum call length
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? 0)}
              >
                <FormControl>
                  <SelectTrigger className="mt-2.5 h-9 bg-background">
                    <SelectValue placeholder="Select max duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {maxDurationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="mt-2 text-[11px] leading-relaxed">
                Hard cap that ends the call even if the visitor is still active.
              </FormDescription>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="voiceCallSettings.customGoodbyePhrases"
        render={({ field }) => (
          <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
            <FormLabel className="text-xs font-medium">
              Custom goodbye phrases
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="mt-2.5 min-h-24 bg-background"
                placeholder={"thanks AIST\nthat's everything I needed"}
              />
            </FormControl>
            <FormDescription className="mt-2 text-[11px] leading-relaxed">
              Optional. One phrase per line, checked in addition to the
              built-in goodbye patterns.
            </FormDescription>
            <FormMessage className="mt-1.5" />
          </FormItem>
        )}
      />
    </SettingsGroup>
  )
}
