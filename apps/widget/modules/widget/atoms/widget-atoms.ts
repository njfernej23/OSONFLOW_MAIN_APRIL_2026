import { atomFamily, atomWithStorage } from "jotai/utils";
import { WidgetScreen } from "@/modules/widget/types";
import { CONTACT_SESSION_KEY } from "../constants";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { atom } from "jotai";

export type VoiceProvider = "gemini" | "openai" | "vapi";

export const screenAtom = atom<WidgetScreen>("loading");
export const organizationIdAtom = atom<string | null>(null);
export const contactSessionIdAtomFamily = atomFamily((organizationId: string) => {
  return atomWithStorage<Id<"contactSessions"> | null>(
    `${CONTACT_SESSION_KEY}_${organizationId}`,
    null
  );
});

export const errorMessageAtom = atom<string | null>(null);
export const loadingMessageAtom = atom<string | null>(null);
export const conversationIdAtom = atom<Id<"conversations"> | null>(null);

export const widgetSettingsAtom = atom<Doc<"widgetSettings"> | null>(null);

export const vapiSecretsAtom = atom<{
  publicApiKey: string;
} | null>(null);

export const activeVoiceProviderAtom = atom<VoiceProvider | null>(null);

export const hasVapiSecretsAtom = atom((get) => get(vapiSecretsAtom) !== null);

export const hasOpenAIRealtimeVoiceAtom = atom((get) => {
  const settings = get(widgetSettingsAtom);
  return Boolean(settings?.openaiRealtimeSettings?.enabled);
});

export const hasGeminiLiveVoiceAtom = atom((get) => {
  const settings = get(widgetSettingsAtom);
  return Boolean(settings?.geminiLiveSettings?.enabled);
});

export const hasAnyVoiceAtom = atom(
  (get) => get(hasVapiSecretsAtom) || get(hasOpenAIRealtimeVoiceAtom) || get(hasGeminiLiveVoiceAtom)
);
