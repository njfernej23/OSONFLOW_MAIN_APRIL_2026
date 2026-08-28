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
import { FormSchema } from "../../types"

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
    <div className="space-y-5 rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40 p-4">
      <div>
        <p className="text-sm font-semibold">Voice call limits</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Control when live voice calls end automatically in voice-only mode.
        </p>
      </div>

      <FormField
        control={form.control}
        name="voiceCallSettings.autoEndOnGoodbye"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-xl border bg-muted/35 px-3 py-3">
            <div className="space-y-0.5">
              <FormLabel>End when visitor says goodbye</FormLabel>
              <FormDescription className="text-xs">
                Ends the call when the visitor signals they are done, including
                phrases like &quot;thanks&quot; or &quot;no more questions&quot;.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <FormField
          control={form.control}
          name="voiceCallSettings.idleTimeoutSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idle timeout</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? 0)}
              >
                <FormControl>
                  <SelectTrigger>
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
              <FormDescription className="text-xs">
                End the call if nobody speaks for this long.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="voiceCallSettings.maxDurationSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum call length</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? 0)}
              >
                <FormControl>
                  <SelectTrigger>
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
              <FormDescription className="text-xs">
                Hard cap that ends the call even if the visitor is still active.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="voiceCallSettings.customGoodbyePhrases"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom goodbye phrases</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="min-h-24 bg-muted/35"
                placeholder={"thanks AIST\nthat's everything I needed"}
              />
            </FormControl>
            <FormDescription className="text-xs">
              Optional. One phrase per line. These are checked in addition to
              the built-in goodbye patterns.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
