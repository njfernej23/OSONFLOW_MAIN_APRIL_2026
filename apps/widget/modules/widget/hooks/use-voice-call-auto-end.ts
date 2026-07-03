import { useCallback, useEffect, useRef } from "react"
import {
  END_CALL_TOOL_NAME,
  matchesGoodbyeIntent,
  resolveVoiceCallSettings,
  type VoiceCallSettings,
} from "@workspace/backend/lib/voiceCallSettings"

const END_CALL_DELAY_MS = 2000

export const useVoiceCallAutoEnd = ({
  isConnected,
  isSpeaking,
  settings,
  onEndCall,
}: {
  isConnected: boolean
  isSpeaking: boolean
  settings?: VoiceCallSettings | null
  onEndCall: () => void
}) => {
  const resolved = resolveVoiceCallSettings(settings)
  const onEndCallRef = useRef(onEndCall)
  const callStartedAtRef = useRef<number | null>(null)
  const lastActivityAtRef = useRef(Date.now())
  const endCallTimerRef = useRef<number | null>(null)

  onEndCallRef.current = onEndCall

  const clearScheduledEnd = useCallback(() => {
    if (endCallTimerRef.current !== null) {
      window.clearTimeout(endCallTimerRef.current)
      endCallTimerRef.current = null
    }
  }, [])

  const scheduleEnd = useCallback(
    (delayMs = END_CALL_DELAY_MS) => {
      clearScheduledEnd()
      endCallTimerRef.current = window.setTimeout(() => {
        onEndCallRef.current()
      }, delayMs)
    },
    [clearScheduledEnd]
  )

  const recordActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now()
    clearScheduledEnd()
  }, [clearScheduledEnd])

  useEffect(() => {
    if (isConnected) {
      callStartedAtRef.current = Date.now()
      lastActivityAtRef.current = Date.now()
      return
    }

    callStartedAtRef.current = null
    clearScheduledEnd()
  }, [clearScheduledEnd, isConnected])

  useEffect(() => {
    if (isSpeaking) {
      recordActivity()
    }
  }, [isSpeaking, recordActivity])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    const interval = window.setInterval(() => {
      const now = Date.now()
      const startedAt = callStartedAtRef.current

      if (
        resolved.maxDurationSeconds > 0 &&
        startedAt &&
        now - startedAt >= resolved.maxDurationSeconds * 1000
      ) {
        scheduleEnd(500)
        return
      }

      if (
        !isSpeaking &&
        resolved.idleTimeoutSeconds > 0 &&
        now - lastActivityAtRef.current >= resolved.idleTimeoutSeconds * 1000
      ) {
        scheduleEnd(500)
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [
    isConnected,
    isSpeaking,
    resolved.idleTimeoutSeconds,
    resolved.maxDurationSeconds,
    scheduleEnd,
  ])

  useEffect(
    () => () => {
      clearScheduledEnd()
    },
    [clearScheduledEnd]
  )

  const handleUserTranscript = useCallback(
    (text: string, isFinal = true) => {
      if (!isFinal) {
        recordActivity()
        return
      }

      recordActivity()

      if (
        resolved.autoEndOnGoodbye &&
        matchesGoodbyeIntent(text, resolved.customGoodbyePhrases)
      ) {
        scheduleEnd()
      }
    },
    [recordActivity, resolved, scheduleEnd]
  )

  const handleEndCallTool = useCallback(() => {
    scheduleEnd()
    return "The call will end shortly."
  }, [scheduleEnd])

  const isEndCallTool = useCallback(
    (toolName?: string | null) => toolName === END_CALL_TOOL_NAME,
    []
  )

  return {
    handleUserTranscript,
    handleEndCallTool,
    isEndCallTool,
    recordActivity,
  }
}
