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
import { AudioLinesIcon, SparklesIcon } from "lucide-react"

import { FormSchema } from "../../types"
import {
  SettingRow,
  SettingsDivider,
  SettingsGroup,
} from "./settings-primitives"

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
    <>
      <SettingsGroup
        description="Add the organization's OpenAI key in Integrations first, then choose the realtime model and voice used here."
        icon={SparklesIcon}
        title="OpenAI Realtime"
      >
        <FormField
          control={form.control}
          name="openaiRealtimeSettings.enabled"
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
                description="Opens the widget directly into live voice and hides the regular chat and contact form."
                label="Enable OpenAI voice"
              />
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <FormField
            control={form.control}
            name="openaiRealtimeSettings.model"
            render={({ field }) => (
              <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                <FormLabel className="text-xs font-medium">
                  Realtime model
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="mt-2.5 h-9 w-full min-w-0 overflow-hidden bg-background">
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
                <FormDescription className="mt-2 text-[11px] leading-relaxed">
                  Documented OpenAI Realtime aliases and dated snapshots.
                </FormDescription>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openaiRealtimeSettings.voice"
            render={({ field }) => (
              <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                <FormLabel className="text-xs font-medium">Voice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="mt-2.5 h-9 w-full min-w-0 overflow-hidden bg-background">
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
                <FormDescription className="mt-2 text-[11px] leading-relaxed">
                  The assistant&apos;s spoken voice.
                </FormDescription>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
        </div>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Add the organization's Gemini key in Integrations first, then choose the live model and voice used here."
        icon={AudioLinesIcon}
        title="Gemini Live"
      >
        <FormField
          control={form.control}
          name="geminiLiveSettings.enabled"
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
                description="Opens the widget directly into live voice and hides the regular chat and contact form."
                label="Enable Gemini Live"
              />
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <FormField
            control={form.control}
            name="geminiLiveSettings.model"
            render={({ field }) => (
              <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                <FormLabel className="text-xs font-medium">
                  Live model
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="mt-2.5 h-9 w-full min-w-0 overflow-hidden bg-background">
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
                <FormDescription className="mt-2 text-[11px] leading-relaxed">
                  Current documented Gemini Live model options.
                </FormDescription>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="geminiLiveSettings.voice"
            render={({ field }) => (
              <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                <FormLabel className="text-xs font-medium">Voice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="mt-2.5 h-9 w-full min-w-0 overflow-hidden bg-background">
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
                <FormDescription className="mt-2 text-[11px] leading-relaxed">
                  Names follow Gemini&apos;s prebuilt voice list.
                </FormDescription>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
        </div>
      </SettingsGroup>
    </>
  )
}
