import Vapi from "@vapi-ai/web"
import { useAtomValue } from "jotai"
import { useEffect, useRef, useState } from "react"
import { vapiSecretsAtom, widgetSettingsAtom } from "../atoms/widget-atoms"
import { usePersistedVoiceConversation } from "./use-persisted-voice-conversation"

type TranscriptMessage =
  | {
      role: "user" | "assistant"
      text: string
    }
  | {
      role: "separator"
      id: string
    }

interface VoiceTranscriptMessage {
  role: "user" | "assistant"
  text: string
}

export const useVapi = () => {
  const vapiSecrets = useAtomValue(vapiSecretsAtom)
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const { finishConversation, persistedTranscript, persistTranscriptMessage } =
    usePersistedVoiceConversation("vapi")
  const vapiRef = useRef<Vapi | null>(null)
  const persistTranscriptMessageRef = useRef(persistTranscriptMessage)
  const finishConversationRef = useRef(finishConversation)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])

  useEffect(() => {
    if (isConnected || isConnecting || persistedTranscript.length === 0) {
      return
    }

    let isCancelled = false
    const hydratedTranscript = persistedTranscript.map((message) => ({
      role: message.role,
      text: message.text,
    }))

    queueMicrotask(() => {
      if (isCancelled) {
        return
      }

      setTranscript((current) =>
        current.length > 0 ? current : hydratedTranscript
      )
    })

    return () => {
      isCancelled = true
    }
  }, [isConnected, isConnecting, persistedTranscript])

  useEffect(() => {
    persistTranscriptMessageRef.current = persistTranscriptMessage
    finishConversationRef.current = finishConversation
  }, [finishConversation, persistTranscriptMessage])

  useEffect(() => {
    if (!vapiSecrets) {
      return
    }

    const vapiInstance = new Vapi(vapiSecrets.publicApiKey)
    vapiRef.current = vapiInstance

    vapiInstance.on("call-start", () => {
      setIsConnected(true)
      setIsConnecting(false)
      setTranscript((prev) => {
        if (prev.length === 0 || prev[prev.length - 1]?.role === "separator") {
          return prev
        }

        return [...prev, { role: "separator", id: `call-${Date.now()}` }]
      })
    })
    vapiInstance.on("call-end", () => {
      setIsConnected(false)
      setIsConnecting(false)
      setIsSpeaking(false)
      void finishConversationRef.current()
    })

    vapiInstance.on("speech-start", () => {
      setIsSpeaking(true)
    })

    vapiInstance.on("speech-end", () => {
      setIsSpeaking(false)
    })
    vapiInstance.on("error", (error) => {
      console.log(error, "VAPI_ERROR")
      setIsConnecting(false)
    })

    vapiInstance.on("message", (message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const transcriptMessage = {
          role: message.role === "user" ? "user" : "assistant",
          text: message.transcript,
        } satisfies VoiceTranscriptMessage

        setTranscript((prev) => [...prev, transcriptMessage])
        void persistTranscriptMessageRef.current(transcriptMessage)
      }
    })

    return () => {
      vapiInstance?.stop()
      vapiRef.current = null
    }
  }, [vapiSecrets])

  const startCall = () => {
    if (!vapiSecrets || !widgetSettings?.vapiSettings?.assistantId) {
      return
    }
    setIsConnecting(true)

    if (vapiRef.current) {
      vapiRef.current.start(widgetSettings.vapiSettings.assistantId)
    }
  }
  const endCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop()
    }
  }

  return {
    isSpeaking,
    isConnecting,
    isConnected,
    transcript,
    startCall,
    endCall,
  }
}
