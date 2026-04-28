"use client"
import { Button } from "@workspace/ui/components/button"
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header"
import {
  MessageSquareTextIcon,
  ChevronRightIcon,
  MicIcon,
  PhoneIcon,
  SparklesIcon,
} from "lucide-react"
import {
  chatReturnScreenAtom,
  contactSessionIdAtomFamily,
  conversationIdAtom,
  errorMessageAtom,
  hasGeminiLiveVoiceAtom,
  hasVapiSecretsAtom,
  hasOpenAIRealtimeVoiceAtom,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
  activeVoiceProviderAtom,
} from "../../atoms/widget-atoms"

import { useAtomValue, useSetAtom } from "jotai"
import { api } from "@workspace/backend/_generated/api"
import { useMutation } from "convex/react"
import { useState } from "react"
import { WidgetFooter } from "../components/widget-footer"
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization"

export const WidgetSelectionScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)
  const setConversationId = useSetAtom(conversationIdAtom)
  const setChatReturnScreen = useSetAtom(chatReturnScreenAtom)
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const theme = mergeWidgetTheme(widgetSettings?.theme)
  const hasVapiSecrets = useAtomValue(hasVapiSecretsAtom)
  const hasOpenAIRealtimeVoice = useAtomValue(hasOpenAIRealtimeVoiceAtom)
  const hasGeminiLiveVoice = useAtomValue(hasGeminiLiveVoiceAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const setActiveVoiceProvider = useSetAtom(activeVoiceProviderAtom)

  const createConversation = useMutation(api.public.conversations.create)
  const [isPending, setIsPending] = useState(false)

  const handleNewConversation = async () => {
    if (!organizationId) {
      setScreen("error")
      setErrorMessage("Missing Organization ID")
      return
    }
    if (!contactSessionId) {
      setScreen("auth")
      return
    }
    setIsPending(true)
    try {
      const conversationId = await createConversation({
        contactSessionId,
        organizationId,
      })
      setChatReturnScreen("selection")
      setConversationId(conversationId)
      setScreen("chat")
    } catch {
      setScreen("auth")
    } finally {
      setIsPending(false)
    }
  }

  const handleVoiceClick = (provider: "gemini" | "openai" | "vapi") => {
    setActiveVoiceProvider(provider)
    setScreen("voice")
  }

  return (
    <>
      <WidgetHeader className="widget-error-header">
        <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
          {theme.logoUrl ? (
            <img
              alt="Assistant logo"
              className="mb-3 h-10 w-10 rounded-2xl bg-white/90 object-cover p-1 shadow-sm"
              src={theme.logoUrl}
            />
          ) : null}
          <p className="text-3xl tracking-tight">Hi there</p>
          <p className="max-w-[18rem] text-base font-medium text-white/82">
            Choose how you want to talk to {theme.assistantName}.
          </p>
        </div>
      </WidgetHeader>
      <div className="flex flex-1 flex-col gap-y-4 overflow-y-auto p-4">
        <Button
          className="surface-panel h-[4.5rem] w-full justify-between border-0 bg-background/72 px-4 shadow-none"
          variant="outline"
          onClick={handleNewConversation}
          disabled={isPending}
        >
          <div className="flex items-center gap-x-2">
            <MessageSquareTextIcon className="size-4" />
            <span>Start Chat</span>
          </div>
          <ChevronRightIcon />
        </Button>

        {hasOpenAIRealtimeVoice && (
          <Button
            className="h-[4.5rem] w-full justify-between border-primary/15 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,white),transparent)] px-4"
            variant="outline"
            onClick={() => handleVoiceClick("openai")}
            disabled={isPending}
          >
            <div className="flex items-center gap-x-2">
              <SparklesIcon className="size-4" />
              <span>Talk with AI</span>
            </div>
            <ChevronRightIcon />
          </Button>
        )}

        {hasGeminiLiveVoice && (
          <Button
            className="h-[4.5rem] w-full justify-between border-cyan-500/20 bg-cyan-500/10 px-4"
            variant="outline"
            onClick={() => handleVoiceClick("gemini")}
            disabled={isPending}
          >
            <div className="flex items-center gap-x-2">
              <SparklesIcon className="size-4" />
              <span>Talk with Gemini</span>
            </div>
            <ChevronRightIcon />
          </Button>
        )}

        {hasVapiSecrets && widgetSettings?.vapiSettings?.assistantId && (
          <Button
            className="surface-panel h-[4.5rem] w-full justify-between border-0 bg-background/72 px-4 shadow-none"
            variant="outline"
            onClick={() => handleVoiceClick("vapi")}
            disabled={isPending}
          >
            <div className="flex items-center gap-x-2">
              <MicIcon className="size-4" />
              <span>Voice Call</span>
            </div>
            <ChevronRightIcon />
          </Button>
        )}

        {hasVapiSecrets && widgetSettings?.vapiSettings?.phoneNumber && (
          <Button
            className="surface-panel h-[4.5rem] w-full justify-between border-0 bg-background/72 px-4 shadow-none"
            variant="outline"
            onClick={() => setScreen("contact")}
            disabled={isPending}
          >
            <div className="flex items-center gap-x-2">
              <PhoneIcon className="size-4" />
              <span>Call us</span>
            </div>
            <ChevronRightIcon />
          </Button>
        )}
      </div>

      <WidgetFooter />
    </>
  )
}
