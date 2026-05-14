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
import { FormSchema } from "../../types"

const realtimeVoices = [
  "marin",
  "cedar",
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
]

const geminiVoices = [
  "Kore",
  "Puck",
  "Charon",
  "Fenrir",
  "Aoede",
  "Zephyr",
  "Leda",
  "Orus",
  "Callirrhoe",
]

type ModelOption = {
  value: string
  label: string
}

const openAIRealtimeModels: ModelOption[] = [
  {
    value: "gpt-realtime-1.5",
    label: "gpt-realtime-1.5",
  },
  {
    value: "gpt-realtime",
    label: "gpt-realtime",
  },
  {
    value: "gpt-realtime-2025-08-28",
    label: "gpt-realtime-2025-08-28",
  },
  {
    value: "gpt-realtime-mini",
    label: "gpt-realtime-mini (deprecated)",
  },
  {
    value: "gpt-realtime-mini-2025-12-15",
    label: "gpt-realtime-mini-2025-12-15",
  },
  {
    value: "gpt-realtime-mini-2025-10-06",
    label: "gpt-realtime-mini-2025-10-06 (deprecated)",
  },
  {
    value: "gpt-4o-realtime-preview",
    label: "gpt-4o-realtime-preview (legacy preview)",
  },
  {
    value: "gpt-4o-realtime-preview-2025-06-03",
    label: "gpt-4o-realtime-preview-2025-06-03",
  },
  {
    value: "gpt-4o-realtime-preview-2024-12-17",
    label: "gpt-4o-realtime-preview-2024-12-17",
  },
  {
    value: "gpt-4o-realtime-preview-2024-10-01",
    label: "gpt-4o-realtime-preview-2024-10-01",
  },
  {
    value: "gpt-4o-mini-realtime-preview",
    label: "gpt-4o-mini-realtime-preview (legacy preview)",
  },
  {
    value: "gpt-4o-mini-realtime-preview-2024-12-17",
    label: "gpt-4o-mini-realtime-preview-2024-12-17",
  },
]

const geminiLiveModels: ModelOption[] = [
  {
    value: "gemini-3.1-flash-live-preview",
    label: "gemini-3.1-flash-live-preview",
  },
  {
    value: "gemini-2.5-flash-native-audio-preview-12-2025",
    label: "gemini-2.5-flash-native-audio-preview-12-2025",
  },
  {
    value: "gemini-2.5-flash-native-audio-preview-09-2025",
    label: "gemini-2.5-flash-native-audio-preview-09-2025",
  },
]

const getSelectableModelOptions = (
  options: ModelOption[],
  currentValue?: string
) => {
  const trimmedValue = currentValue?.trim()

  if (!trimmedValue) {
    return options
  }

  if (options.some((option) => option.value === trimmedValue)) {
    return options
  }

  return [
    {
      value: trimmedValue,
      label: `${trimmedValue} (saved custom model)`,
    },
    ...options,
  ]
}

interface OpenAIRealtimeFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

export const OpenAIRealtimeFormFields = ({
  form,
}: OpenAIRealtimeFormFieldsProps) => {
  return (
    <div className="space-y-5">
      <div className="space-y-5 rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40 p-4">
        <div>
          <p className="text-sm font-semibold">OpenAI Realtime Voice</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure the organization OpenAI key from Integrations, then tune
            the voice experience here.
          </p>
        </div>

        <FormField
          control={form.control}
          name="openaiRealtimeSettings.enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-3 py-3">
              <div className="space-y-0.5">
                <FormLabel>Enable OpenAI voice</FormLabel>
                <FormDescription className="text-xs">
                  Shows a WebRTC voice option in the widget.
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <FormField
            control={form.control}
            name="openaiRealtimeSettings.model"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Realtime model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden">
                      <SelectValue placeholder="Select a realtime model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-w-[min(560px,calc(100vw-2rem))]">
                    {getSelectableModelOptions(
                      openAIRealtimeModels,
                      field.value
                    ).map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Choose from the documented OpenAI Realtime model aliases and
                  snapshots.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openaiRealtimeSettings.voice"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Voice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {realtimeVoices.map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice.charAt(0).toUpperCase() + voice.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Controls the assistant&apos;s spoken voice.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40 p-4">
        <div>
          <p className="text-sm font-semibold">Gemini Live Voice</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure the organization Gemini key from Integrations, then tune
            the live voice experience here.
          </p>
        </div>

        <FormField
          control={form.control}
          name="geminiLiveSettings.enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-3 py-3">
              <div className="space-y-0.5">
                <FormLabel>Enable Gemini Live</FormLabel>
                <FormDescription className="text-xs">
                  Shows a Gemini speech-to-speech option in the widget.
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <FormField
            control={form.control}
            name="geminiLiveSettings.model"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Live model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden">
                      <SelectValue placeholder="Select a live model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-w-[min(560px,calc(100vw-2rem))]">
                    {getSelectableModelOptions(
                      geminiLiveModels,
                      field.value
                    ).map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Choose from the current documented Gemini Live model options.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="geminiLiveSettings.voice"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Voice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {geminiVoices.map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Voice names follow Gemini&apos;s prebuilt voice list.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )
}
