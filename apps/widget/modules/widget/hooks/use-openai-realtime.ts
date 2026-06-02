import { api } from "@workspace/backend/_generated/api"
import { useAction } from "convex/react"
import { useAtomValue } from "jotai"
import { useEffect, useRef, useState } from "react"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
} from "../atoms/widget-atoms"
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

type VoiceTranscriptMessage = {
  role: "user" | "assistant"
  text: string
}

type RealtimeEvent = {
  type?: string
  transcript?: string
  delta?: string
  call_id?: string
  name?: string
  arguments?: string
  item?: {
    role?: string
    type?: string
    name?: string
    call_id?: string
    arguments?: string
  }
  response?: {
    output?: Array<{ content?: Array<{ transcript?: string; text?: string }> }>
  }
  error?: { message?: string }
}

type TokenResponse = {
  value?: string
  error?: string
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  if (!text) return {} as T

  try {
    return JSON.parse(text) as T
  } catch {
    return { error: text } as T
  }
}

export const useOpenAIRealtime = () => {
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const searchKnowledgeBase = useAction(api.public.voiceKnowledgeBase.search)
  const { finishConversation, persistedTranscript, persistTranscriptMessage } =
    usePersistedVoiceConversation("openai_realtime")
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastTranscriptSignatureRef = useRef<string | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [error, setError] = useState<string | null>(null)

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

  const endCall = () => {
    dataChannelRef.current?.close()
    peerConnectionRef.current?.close()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioRef.current?.remove()

    dataChannelRef.current = null
    peerConnectionRef.current = null
    localStreamRef.current = null
    audioRef.current = null

    setIsConnected(false)
    setIsConnecting(false)
    setIsSpeaking(false)
    lastTranscriptSignatureRef.current = null

    void finishConversation()
  }

  const addCallSeparator = () => {
    setTranscript((prev) => {
      if (prev.length === 0 || prev[prev.length - 1]?.role === "separator") {
        return prev
      }

      return [...prev, { role: "separator", id: `call-${Date.now()}` }]
    })
  }

  const appendTranscript = (message: VoiceTranscriptMessage) => {
    const text = message.text.trim()

    if (!text) {
      return
    }

    const signature = `${message.role}:${text}`

    if (lastTranscriptSignatureRef.current === signature) {
      return
    }

    lastTranscriptSignatureRef.current = signature

    const normalizedMessage = { ...message, text }

    setTranscript((prev) => [...prev, normalizedMessage])
    void persistTranscriptMessage(normalizedMessage)
  }

  const sendClientEvent = (event: Record<string, unknown>) => {
    const dataChannel = dataChannelRef.current
    if (!dataChannel || dataChannel.readyState !== "open") return
    dataChannel.send(JSON.stringify(event))
  }

  const handleFunctionCall = async (event: RealtimeEvent) => {
    const callId = event.call_id ?? event.item?.call_id
    const name = event.name ?? event.item?.name
    const rawArguments = event.arguments ?? event.item?.arguments ?? "{}"

    if (!callId || !name) return

    if (!organizationId || name !== "search_knowledge_base") return

    let query =
      "Search the knowledge base for information related to the user's latest question."
    try {
      const parsedArgs = JSON.parse(rawArguments) as { query?: unknown }
      if (typeof parsedArgs.query === "string" && parsedArgs.query.trim()) {
        query = parsedArgs.query
      }
    } catch {
      // Keep the fallback query if the model emitted malformed JSON.
    }

    try {
      const result = await searchKnowledgeBase({ organizationId, query })
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: result,
        },
      })
    } catch {
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output:
            "The knowledge base search failed. Tell the user you could not search the knowledge base right now.",
        },
      })
    }

    sendClientEvent({ type: "response.create" })
  }

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    if (
      event.type === "response.function_call_arguments.done" ||
      (event.type === "response.output_item.done" &&
        event.item?.type === "function_call")
    ) {
      void handleFunctionCall(event)
      return
    }

    if (event.type === "input_audio_buffer.speech_started") {
      setIsSpeaking(false)
      return
    }

    if (event.type === "response.audio.started") {
      setIsSpeaking(true)
      return
    }

    if (
      event.type === "response.audio.done" ||
      event.type === "response.done"
    ) {
      setIsSpeaking(false)
    }

    if (
      event.type === "conversation.item.input_audio_transcription.completed" &&
      event.transcript
    ) {
      appendTranscript({ role: "user", text: event.transcript })
      return
    }

    if (event.type === "response.audio_transcript.done" && event.transcript) {
      appendTranscript({ role: "assistant", text: event.transcript })
      return
    }

    if (event.type === "response.done") {
      const assistantText = event.response?.output
        ?.flatMap((output) => output.content ?? [])
        .map((content) => content.transcript || content.text || "")
        .filter(Boolean)
        .join(" ")

      if (assistantText)
        appendTranscript({ role: "assistant", text: assistantText })
    }

    if (event.type === "error") {
      setError(event.error?.message || "OpenAI realtime session error.")
    }
  }

  const startCall = async () => {
    if (!organizationId) {
      setError("Missing organization ID.")
      return
    }

    if (!contactSessionId) {
      setError("Please start a contact session before using voice.")
      return
    }

    setIsConnecting(true)
    setError(null)
    addCallSeparator()
    lastTranscriptSignatureRef.current = null

    try {
      const tokenResponse = await fetch("/api/openai-realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, contactSessionId }),
      })
      const tokenData = await parseJsonResponse<TokenResponse>(tokenResponse)

      if (!tokenResponse.ok) {
        throw new Error(tokenData?.error || "Unable to start OpenAI voice.")
      }

      const ephemeralKey = tokenData.value

      if (!ephemeralKey) {
        throw new Error("OpenAI did not return a client secret.")
      }

      const peerConnection = new RTCPeerConnection()
      peerConnectionRef.current = peerConnection

      const audioElement = document.createElement("audio")
      audioElement.autoplay = true
      audioRef.current = audioElement
      peerConnection.ontrack = (event) => {
        audioElement.srcObject = event.streams[0] ?? null
      }

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      localStreamRef.current = localStream
      localStream
        .getAudioTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream))

      const dataChannel = peerConnection.createDataChannel("oai-events")
      dataChannelRef.current = dataChannel
      dataChannel.addEventListener("open", () => {
        setIsConnected(true)
        setIsConnecting(false)
      })
      dataChannel.addEventListener("message", (message) => {
        try {
          handleRealtimeEvent(JSON.parse(message.data))
        } catch {
          // Ignore non-JSON data channel messages.
        }
      })

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        }
      )

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text())
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      })
    } catch (err) {
      endCall()
      setError(
        err instanceof Error ? err.message : "Unable to start OpenAI voice."
      )
    }
  }

  useEffect(() => endCall, [])

  return {
    isSpeaking,
    isConnecting,
    isConnected,
    transcript,
    error,
    startCall,
    endCall,
  }
}
