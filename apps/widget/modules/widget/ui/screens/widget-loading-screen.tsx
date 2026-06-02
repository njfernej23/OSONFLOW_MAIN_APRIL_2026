"use client"
import { useAction, useMutation, useQuery } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  activeVoiceProviderAtom,
  errorMessageAtom,
  screenAtom,
  organizationIdAtom,
  contactSessionIdAtomFamily,
  widgetSettingsAtom,
  widgetModeAtom,
  vapiSecretsAtom,
  type WidgetMode,
  type VoiceProvider,
} from "@/modules/widget/atoms/widget-atoms"
import { useState, useEffect } from "react"
import { api } from "@workspace/backend/_generated/api"
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization"
import type { Doc } from "@workspace/backend/_generated/dataModel"
import { Spinner } from "@workspace/ui/components/spinner"

type InitStep = "org" | "session" | "settings" | "voice" | "done"

const VOICE_VISITOR_KEY_PREFIX = "echo_voice_visitor"

const getVoiceVisitorId = (organizationId: string) => {
  if (typeof window === "undefined") {
    return `voice_${Date.now().toString(36)}`
  }

  const key = `${VOICE_VISITOR_KEY_PREFIX}_${organizationId}`
  const existingVisitorId = window.localStorage.getItem(key)

  if (existingVisitorId) {
    return existingVisitorId
  }

  const randomValue =
    window.crypto?.randomUUID?.() ??
    `voice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  const visitorId = `voice_${randomValue.replace(/[^a-zA-Z0-9_-]/g, "")}`

  window.localStorage.setItem(key, visitorId)

  return visitorId
}

const getBrowserMetadata = (
  organizationId: string,
  parentPageUrl?: string
): Doc<"contactSessions">["metadata"] => {
  if (typeof window === "undefined") {
    return {
      source: "voice_widget",
      visitorId: `voice_${Date.now().toString(36)}`,
    }
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(","),
    platform: navigator.platform,
    vendor: navigator.vendor,
    screenResolution: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookieEnabled: navigator.cookieEnabled,
    referrer: document.referrer || "direct",
    currentUrl: parentPageUrl || document.referrer || window.location.href,
    source: "voice_widget",
    visitorId: getVoiceVisitorId(organizationId),
  }
}

export const WidgetLoadingScreen = ({
  mode = "standard",
  organizationId,
  parentPageUrl,
}: {
  mode?: WidgetMode
  organizationId: string | null
  parentPageUrl?: string
}) => {
  const [step, setStep] = useState<InitStep>("org")
  const [validatedContactSessionIsAnonymous, setValidatedContactSessionIsAnonymous] =
    useState(false)
  const setWidgetSettings = useSetAtom(widgetSettingsAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)
  const setOrganizationId = useSetAtom(organizationIdAtom)
  const setVapiSecrets = useSetAtom(vapiSecretsAtom)
  const vapiSecrets = useAtomValue(vapiSecretsAtom)
  const setActiveVoiceProvider = useSetAtom(activeVoiceProviderAtom)
  const setWidgetMode = useSetAtom(widgetModeAtom)

  const validateOrganization = useAction(api.public.organizations.validate)
  const createAnonymousContactSession = useAction(
    api.public.contactSessions.createAnonymous
  )
  const setScreen = useSetAtom(screenAtom)

  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId || "")
  )

  // Step 1: validate organization
  useEffect(() => {
    if (step != "org") return

    if (!organizationId) {
      setErrorMessage("Organization ID is required")
      setScreen("error")
      return
    }
    validateOrganization({ organizationId })
      .then((result) => {
        if (result.valid) {
          setOrganizationId(organizationId)
          setStep("session")
        } else {
          setErrorMessage(result.reason || "Invalid configuration")
          setScreen("error")
        }
      })
      .catch(() => {
        setErrorMessage("Failed to validate organization")
        setScreen("error")
      })
  }, [
    step,
    organizationId,
    setScreen,
    setErrorMessage,
    setOrganizationId,
    validateOrganization,
    setStep,
  ])

  // Step 2: validate session if it exists
  const validateContactSession = useMutation(
    api.public.contactSessions.validate
  )
  useEffect(() => {
    if (step !== "session") return
    if (!contactSessionId) {
      queueMicrotask(() => {
        setValidatedContactSessionIsAnonymous(false)
        setStep("settings")
      })
      return
    }
    validateContactSession({
      organizationId: organizationId!,
      contactSessionId,
    })
      .then((result) => {
        if (!result.valid) {
          setContactSessionId(null)
          setValidatedContactSessionIsAnonymous(false)
        } else {
          setValidatedContactSessionIsAnonymous(
            Boolean(result.contactSession?.isAnonymous)
          )
        }
        setStep("settings")
      })
      .catch(() => {
        setContactSessionId(null)
        setValidatedContactSessionIsAnonymous(false)
        setStep("settings")
      })
  }, [
    step,
    contactSessionId,
    organizationId,
    setContactSessionId,
    validateContactSession,
  ])

  // Step 3: load widget settings
  const widgetSettings = useQuery(
    api.public.widgetSettings.getByOrganizationId,
    organizationId ? { organizationId } : "skip"
  )

  useEffect(() => {
    if (step !== "settings") return
    if (widgetSettings !== undefined) {
      queueMicrotask(() => {
        setWidgetSettings(widgetSettings)
        setStep("voice")
      })
    }
  }, [step, widgetSettings, setStep, setWidgetSettings])

  useEffect(() => {
    if (widgetSettings === undefined) return
    if (typeof window === "undefined" || window.parent === window) return

    const appearance = mergeWidgetAppearance(widgetSettings?.appearance)
    const liveVoiceEnabled = Boolean(
      mode === "voice" ||
      widgetSettings?.openaiRealtimeSettings?.enabled ||
      widgetSettings?.geminiLiveSettings?.enabled
    )

    window.parent.postMessage(
      { type: "widget-settings", payload: { appearance, liveVoiceEnabled } },
      "*"
    )
  }, [mode, widgetSettings])

  // Step 4: load voice config
  const getVapiSecrets = useAction(api.public.secrets.getVapiSecrets)

  useEffect(() => {
    if (step !== "voice") return
    if (!organizationId) {
      setErrorMessage("Organization ID is required")
      setScreen("error")
      return
    }

    getVapiSecrets({ organizationId })
      .catch(() => null)
      .then((vapiSecrets) => {
        setVapiSecrets(vapiSecrets)
        setStep("done")
      })
  }, [
    step,
    organizationId,
    getVapiSecrets,
    setVapiSecrets,
    setStep,
    setErrorMessage,
    setScreen,
  ])

  // Step 5: navigate
  useEffect(() => {
    if (step !== "done") return

    const hasPublishedLiveVoice = Boolean(
      widgetSettings?.openaiRealtimeSettings?.enabled ||
      widgetSettings?.geminiLiveSettings?.enabled
    )
    const shouldOpenVoiceOnly = mode === "voice" || hasPublishedLiveVoice

    if (!shouldOpenVoiceOnly) {
      setWidgetMode("standard")
      if (validatedContactSessionIsAnonymous) {
        setContactSessionId(null)
        setScreen("auth")
        return
      }
      setScreen(contactSessionId ? "selection" : "auth")
      return
    }

    setWidgetMode("voice")

    const openVoiceScreen = async () => {
      if (!organizationId) {
        setErrorMessage("Organization ID is required")
        setScreen("error")
        return
      }

      const nextVoiceProvider: VoiceProvider | null = widgetSettings
        ?.openaiRealtimeSettings?.enabled
        ? "openai"
        : widgetSettings?.geminiLiveSettings?.enabled
          ? "gemini"
          : mode === "voice" &&
              widgetSettings?.vapiSettings?.assistantId &&
              vapiSecrets
            ? "vapi"
            : null

      if (!nextVoiceProvider) {
        setErrorMessage("Voice AI is not enabled for this widget.")
        setScreen("error")
        return
      }

      setActiveVoiceProvider(nextVoiceProvider)

      if (contactSessionId) {
        setScreen("voice")
        return
      }

      try {
        const anonymousContactSessionId = await createAnonymousContactSession({
          organizationId,
          metadata: getBrowserMetadata(organizationId, parentPageUrl),
        })

        setContactSessionId(anonymousContactSessionId)
        setScreen("voice")
      } catch {
        setErrorMessage("Unable to start an anonymous voice session.")
        setScreen("error")
      }
    }

    void openVoiceScreen()
  }, [
    contactSessionId,
    createAnonymousContactSession,
    mode,
    organizationId,
    parentPageUrl,
    setActiveVoiceProvider,
    setContactSessionId,
    setErrorMessage,
    setScreen,
    setWidgetMode,
    step,
    validatedContactSessionIsAnonymous,
    vapiSecrets,
    widgetSettings,
  ])

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-white text-zinc-400">
      <Spinner className="size-5" />
    </div>
  )
}
