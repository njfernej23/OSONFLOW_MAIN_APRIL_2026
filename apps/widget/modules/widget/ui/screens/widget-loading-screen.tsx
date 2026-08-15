"use client"
import { useAction, useMutation, useQuery } from "convex/react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  activeVoiceProviderAtom,
  agentIdAtom,
  errorMessageAtom,
  screenAtom,
  organizationIdAtom,
  contactSessionIdAtomFamily,
  widgetSettingsAtom,
  widgetModeAtom,
  type WidgetMode,
  type VoiceProvider,
} from "@/modules/widget/atoms/widget-atoms"
import { useEffect, useRef, useState } from "react"
import { api } from "@workspace/backend/_generated/api"
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization"
import { Spinner } from "@workspace/ui/components/spinner"

type InitStep = "org" | "session" | "settings" | "voice" | "done"

export const WidgetLoadingScreen = ({
  mode = "standard",
  organizationId,
  agentId,
}: {
  mode?: WidgetMode
  organizationId: string | null
  agentId?: string | null
  parentPageUrl?: string
}) => {
  const [step, setStep] = useState<InitStep>("org")
  const ensuringSessionRef = useRef(false)
  const setWidgetSettings = useSetAtom(widgetSettingsAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)
  const setOrganizationId = useSetAtom(organizationIdAtom)
  const setAgentId = useSetAtom(agentIdAtom)
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
          setAgentId(agentId?.trim() || null)
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
    agentId,
    setScreen,
    setErrorMessage,
    setOrganizationId,
    setAgentId,
    validateOrganization,
    setStep,
  ])

  // Step 2: validate session if it exists
  const validateContactSession = useMutation(
    api.public.contactSessions.validate
  )
  useEffect(() => {
    if (step !== "session") return
    if (ensuringSessionRef.current) return
    ensuringSessionRef.current = true

    const startAnonymousSession = async () => {
      if (!organizationId) {
        setStep("settings")
        return
      }

      try {
        const anonymousSessionId = await createAnonymousContactSession({
          organizationId,
          metadata: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages?.join(","),
            platform: navigator.platform,
            vendor: navigator.vendor,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            cookieEnabled: navigator.cookieEnabled,
            referrer: document.referrer || "direct",
            currentUrl: window.location.href,
            source: "workflow_widget",
          },
        })
        setContactSessionId(anonymousSessionId)
      } catch {
        setContactSessionId(null)
      }

      setStep("settings")
    }

    if (!contactSessionId) {
      void startAnonymousSession()
      return
    }

    validateContactSession({
      organizationId: organizationId!,
      contactSessionId,
    })
      .then((result) => {
        if (!result.valid) {
          void startAnonymousSession()
          return
        }
        setStep("settings")
      })
      .catch(() => {
        void startAnonymousSession()
      })
  }, [
    step,
    contactSessionId,
    organizationId,
    createAnonymousContactSession,
    setContactSessionId,
    validateContactSession,
  ])

  // Step 3: load widget settings
  const widgetSettings = useQuery(
    api.public.widgetSettings.getByOrganizationId,
    organizationId
      ? { organizationId, agentId: agentId?.trim() || undefined }
      : "skip"
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

  // Step 4: finish voice config
  useEffect(() => {
    if (step !== "voice") return
    setStep("done")
  }, [setStep, step])

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
      setScreen(contactSessionId ? "selection" : "auth")
      return
    }

    setWidgetMode("voice")

    const nextVoiceProvider: VoiceProvider | null = widgetSettings
      ?.openaiRealtimeSettings?.enabled
      ? "openai"
      : widgetSettings?.geminiLiveSettings?.enabled
        ? "gemini"
        : null

    if (!nextVoiceProvider) {
      setErrorMessage("Voice AI is not enabled for this widget.")
      setScreen("error")
      return
    }

    setActiveVoiceProvider(nextVoiceProvider)

    // Require name/email before creating a session or conversation.
    if (!contactSessionId) {
      setScreen("auth")
      return
    }

    setScreen("voice")
  }, [
    contactSessionId,
    mode,
    setActiveVoiceProvider,
    setErrorMessage,
    setScreen,
    setWidgetMode,
    step,
    widgetSettings,
  ])

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-white text-zinc-400">
      <Spinner className="size-5" />
    </div>
  )
}
