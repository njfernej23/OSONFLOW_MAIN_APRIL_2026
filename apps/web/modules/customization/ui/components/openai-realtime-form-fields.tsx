import { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { FormSchema } from "../../types";

const realtimeVoices = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"];
const geminiVoices = ["Kore", "Puck", "Charon", "Fenrir", "Aoede", "Zephyr", "Leda", "Orus", "Callirrhoe"];

interface OpenAIRealtimeFormFieldsProps {
  form: UseFormReturn<FormSchema>;
}

export const OpenAIRealtimeFormFields = ({ form }: OpenAIRealtimeFormFieldsProps) => {
  return (
    <div className="space-y-5">
      <div className="space-y-5 rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40 p-4">
        <div>
          <p className="text-sm font-semibold">OpenAI Realtime Voice</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses your server-side OPENAI_API_KEY to mint short-lived browser voice sessions.
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
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
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
            Uses your server-side GEMINI_API_KEY to mint short-lived Live API tokens.
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
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
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
                  <Input {...field} placeholder="gemini-2.5-flash-native-audio-preview-12-2025" />
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
  );
};
