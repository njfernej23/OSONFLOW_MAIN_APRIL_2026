"use client"
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react"
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
  workflowOnlyAtom,
  conversationIdAtom,
  chatReturnScreenAtom,
  type WidgetMode,
  type VoiceProvider,
} from "@/modules/widget/atoms/widget-atoms"
import { useEffect, useRef, useState } from "react"
import { api } from "@workspace/backend/_generated/api"
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization"
import { Spinner } from "@workspace/ui/components/spinner"
import { useEnsureVoiceContactSession } from "../../hooks/use-ensure-voice-contact-session"
import { useStartWidgetConversation } from "../../hooks/use-start-widget-conversation"

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
  const startingVoiceSessionRef = useRef(false)
  const setWidgetSettings = useSetAtom(widgetSettingsAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)
  const setOrganizationId = useSetAtom(organizationIdAtom)
  const setAgentId = useSetAtom(agentIdAtom)
  const setActiveVoiceProvider = useSetAtom(activeVoiceProviderAtom)
  const setWidgetMode = useSetAtom(widgetModeAtom)
  const { ensureSession } = useEnsureVoiceContactSession()
  const setWorkflowOnly = useSetAtom(workflowOnlyAtom)
  const setConversationId = useSetAtom(conversationIdAtom)
  const setChatReturnScreen = useSetAtom(chatReturnScreenAtom)
  const { startConversation } = useStartWidgetConversation()
  const startingWorkflowRef = useRef(false)

  const validateOrganization = useAction(api.public.organizations.validate)
  const setScreen = useSetAtom(screenAtom)

  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId || "")
  )

  // A published workflow turns the widget into a single-purpose chat: no home
  // screen, no help centre, and no contact details asked for up front.
  const activeWorkflow = useQuery(
    api.public.workflows.getActiveSummary,
    organizationId ? { organizationId } : "skip"
  )
  // Reuse this visitor's latest conversation rather than opening a new one on
  // every page load — the widget iframe mounts before they click anything.
  const recentConversations = usePaginatedQuery(
    api.public.conversations.getMany,
    contactSessionId ? { contactSessionId } : "skip",
    { initialNumItems: 1 }
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

    if (!organizationId || !contactSessionId) {
      if (contactSessionId) {
        setContactSessionId(null)
      }
      setStep("settings")
      return
    }

    validateContactSession({
      organizationId,
      contactSessionId,
    })
      .then((result) => {
        if (!result.valid) {
          setContactSessionId(null)
        }
        setStep("settings")
      })
      .catch(() => {
        setContactSessionId(null)
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

      // Still resolving whether a workflow is live.
      if (activeWorkflow === undefined) {
        return
      }

      if (activeWorkflow) {
        setWorkflowOnly(true)

        if (contactSessionId && recentConversations.isLoading) {
          return
        }

        const existing = recentConversations.results[0] as
          | { _id: string }
          | undefined

        if (existing) {
          setChatReturnScreen("selection")
          setConversationId(existing._id as never)
          setScreen("chat")
          return
        }

        if (!startingWorkflowRef.current) {
          startingWorkflowRef.current = true
          void startConversation({ returnScreen: "selection" })
        }

        return
      }

      setWorkflowOnly(false)
      setScreen("selection")
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

    if (!contactSessionId) {
      if (startingVoiceSessionRef.current) {
        return
      }

      startingVoiceSessionRef.current = true
      void ensureSession().then((sessionId) => {
        if (!sessionId) {
          startingVoiceSessionRef.current = false
          setErrorMessage("Failed to start voice session")
          setScreen("error")
          return
        }

        setScreen("voice")
      })
      return
    }

    setScreen("voice")
  }, [
    activeWorkflow,
    contactSessionId,
    mode,
    recentConversations.isLoading,
    recentConversations.results,
    setActiveVoiceProvider,
    setChatReturnScreen,
    setConversationId,
    setErrorMessage,
    setScreen,
    setWidgetMode,
    setWorkflowOnly,
    startConversation,
    step,
    widgetSettings,
    ensureSession,
  ])

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-white text-zinc-400">
      <Spinner className="size-5" />
    </div>
  )
}
