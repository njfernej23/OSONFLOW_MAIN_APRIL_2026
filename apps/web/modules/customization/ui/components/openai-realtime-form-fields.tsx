import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { KeyRoundIcon, Loader2Icon, Trash2Icon } from "lucide-react"

import { api } from "@workspace/backend/_generated/api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
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

interface OpenAIRealtimeFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

type ProviderService = "openai_realtime" | "gemini_live"

const VoiceApiKeyManager = ({
  configured,
  inputValue,
  isRemoving,
  isSaving,
  label,
  onChange,
  onRemove,
  onSave,
  placeholder,
}: {
  configured: boolean
  inputValue: string
  isRemoving: boolean
  isSaving: boolean
  label: string
  onChange: (value: string) => void
  onRemove: () => void
  onSave: () => void
  placeholder: string
}) => {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Stored securely per organization and used immediately for new voice
            sessions.
          </p>
        </div>
        <div
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            configured
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          {configured
            ? "Custom key saved"
            : "Using workspace default if available"}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder={placeholder}
          type="password"
          value={inputValue}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          className="gap-1.5 sm:min-w-32"
          disabled={isSaving || inputValue.trim().length === 0}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <KeyRoundIcon className="size-3.5" />
          )}
          {configured ? "Update key" : "Save key"}
        </Button>
        {configured ? (
          <Button
            className="gap-1.5"
            disabled={isRemoving || isSaving}
            onClick={onRemove}
            type="button"
            variant="outline"
          >
            {isRemoving ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
            Remove
          </Button>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        This secure credential is not part of draft history or published widget
        versions.
      </p>
    </div>
  )
}

export const OpenAIRealtimeFormFields = ({
  form,
}: OpenAIRealtimeFormFieldsProps) => {
  const providerStatuses = useQuery(
    api.private.secrets.getVoiceProviderStatuses
  )
  const upsertSecret = useMutation(api.private.secrets.upsert)
  const removePlugin = useMutation(api.private.plugins.remove)

  const [openAIKey, setOpenAIKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [savingService, setSavingService] = useState<ProviderService | null>(
    null
  )
  const [removingService, setRemovingService] =
    useState<ProviderService | null>(null)

  const saveKey = async (
    service: ProviderService,
    apiKey: string,
    reset: () => void
  ) => {
    const trimmedKey = apiKey.trim()

    if (!trimmedKey) {
      toast.error("Enter an API key first")
      return
    }

    setSavingService(service)
    try {
      await upsertSecret({
        service,
        value: { apiKey: trimmedKey },
      })
      reset()
      toast.success(
        service === "openai_realtime"
          ? "OpenAI realtime key saved"
          : "Gemini Live key saved"
      )
    } catch {
      toast.error("Unable to save API key")
    } finally {
      setSavingService(null)
    }
  }

  const removeKey = async (service: ProviderService) => {
    setRemovingService(service)
    try {
      await removePlugin({ service })
      toast.success(
        service === "openai_realtime"
          ? "OpenAI realtime key removed"
          : "Gemini Live key removed"
      )
    } catch {
      toast.error("Unable to remove API key")
    } finally {
      setRemovingService(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5 rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40 p-4">
        <div>
          <p className="text-sm font-semibold">OpenAI Realtime Voice</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bring your own OpenAI realtime key for this organization, or fall
            back to the workspace-level backend key when one is configured.
          </p>
        </div>

        <VoiceApiKeyManager
          configured={Boolean(providerStatuses?.openaiRealtimeConfigured)}
          inputValue={openAIKey}
          isRemoving={removingService === "openai_realtime"}
          isSaving={savingService === "openai_realtime"}
          label="Organization OpenAI API key"
          onChange={setOpenAIKey}
          onRemove={() => void removeKey("openai_realtime")}
          onSave={() =>
            void saveKey("openai_realtime", openAIKey, () => setOpenAIKey(""))
          }
          placeholder="sk-..."
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="openaiRealtimeSettings.model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Realtime model</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="gpt-realtime" />
                </FormControl>
                <FormDescription className="text-xs">
                  Default: gpt-realtime.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openaiRealtimeSettings.voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
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
            Bring your own Gemini API key for this organization, or fall back to
            the workspace-level backend key when one is configured.
          </p>
        </div>

        <VoiceApiKeyManager
          configured={Boolean(providerStatuses?.geminiLiveConfigured)}
          inputValue={geminiKey}
          isRemoving={removingService === "gemini_live"}
          isSaving={savingService === "gemini_live"}
          label="Organization Gemini API key"
          onChange={setGeminiKey}
          onRemove={() => void removeKey("gemini_live")}
          onSave={() =>
            void saveKey("gemini_live", geminiKey, () => setGeminiKey(""))
          }
          placeholder="AIza..."
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="geminiLiveSettings.model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Live model</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="gemini-2.5-flash-native-audio-preview-12-2025"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Default: Gemini 2.5 Flash Native Audio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="geminiLiveSettings.voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
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
