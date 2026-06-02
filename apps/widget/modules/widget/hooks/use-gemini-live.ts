import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from "@google/genai"
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

type GeminiTokenResponse = {
  token?: string
  model?: string
  voice?: string
  error?: string
}

const INPUT_SAMPLE_RATE = 16000
const DEFAULT_OUTPUT_SAMPLE_RATE = 24000

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0)
  }
  return btoa(binary)
}

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const parseSampleRate = (mimeType?: string) => {
  const match = mimeType?.match(/rate=(\d+)/i)
  return match?.[1] ? Number(match[1]) : DEFAULT_OUTPUT_SAMPLE_RATE
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

const floatTo16BitPcm = (input: Float32Array) => {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

const downsample = (
  input: Float32Array,
  sourceRate: number,
  targetRate: number
) => {
  if (sourceRate === targetRate) return input
  const ratio = sourceRate / targetRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j] ?? 0
    output[i] = sum / Math.max(1, end - start)
  }

  return output
}

export const useGeminiLive = () => {
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const searchKnowledgeBase = useAction(api.public.voiceKnowledgeBase.search)
  const { finishConversation, persistedTranscript, persistTranscriptMessage } =
    usePersistedVoiceConversation("gemini_live")
  const sessionRef = useRef<Session | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const inputContextRef = useRef<AudioContext | null>(null)
  const outputContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const silenceGainRef = useRef<GainNode | null>(null)
  const playbackTimeRef = useRef(0)
  const playbackGenerationRef = useRef(0)
  const activeOutputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const transcriptRef = useRef<TranscriptMessage[]>([])
  const draftTranscriptRef = useRef({
    user: { index: -1, text: "" },
    assistant: { index: -1, text: "" },
  })
  const assistantTextBufferRef = useRef("")
  const lastPersistedTranscriptSignatureRef = useRef<string | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const mergeTranscriptText = (currentText: string, incomingText: string) => {
    if (!currentText) {
      return incomingText
    }

    if (incomingText.startsWith(currentText)) {
      return incomingText
    }

    if (currentText.startsWith(incomingText)) {
      return currentText
    }

    const joinWithoutSpace = /^[.,!?;:)\]%]/.test(incomingText)
    return `${currentText}${joinWithoutSpace ? "" : " "}${incomingText}`.trim()
  }

  const persistFinalTranscript = (message: VoiceTranscriptMessage) => {
    const text = message.text.trim()

    if (!text) {
      return
    }

    const signature = `${message.role}:${text}`

    if (lastPersistedTranscriptSignatureRef.current === signature) {
      return
    }

    lastPersistedTranscriptSignatureRef.current = signature

    const normalizedMessage = { ...message, text }
    void persistTranscriptMessage(normalizedMessage)
  }

  const syncTranscript = (nextTranscript: TranscriptMessage[]) => {
    transcriptRef.current = nextTranscript
    setTranscript(nextTranscript)
  }

  useEffect(() => {
    if (isConnected || isConnecting || persistedTranscript.length === 0) {
      return
    }

    if (transcriptRef.current.length > 0) {
      return
    }

    syncTranscript(
      persistedTranscript.map((message) => ({
        role: message.role,
        text: message.text,
      }))
    )
  }, [isConnected, isConnecting, persistedTranscript])

  const updateTranscriptDraft = (
    role: VoiceTranscriptMessage["role"],
    rawText: string,
    { isFinal = false }: { isFinal?: boolean } = {}
  ) => {
    const text = rawText.trim()

    if (!text) {
      return
    }

    const draft = draftTranscriptRef.current[role]
    const nextText = mergeTranscriptText(draft.text, text)
    const nextTranscript = [...transcriptRef.current]

    if (draft.index >= 0 && nextTranscript[draft.index]?.role === role) {
      nextTranscript[draft.index] = { role, text: nextText }
    } else {
      draft.index = nextTranscript.length
      nextTranscript.push({ role, text: nextText })
    }

    draft.text = nextText
    syncTranscript(nextTranscript)

    if (isFinal) {
      draft.index = -1
      draft.text = ""
      persistFinalTranscript({ role, text: nextText })
    }
  }

  const finalizeTranscriptDraft = (
    role: VoiceTranscriptMessage["role"],
    { persist = true }: { persist?: boolean } = {}
  ) => {
    const draft = draftTranscriptRef.current[role]

    if (draft.index < 0 || !draft.text.trim()) {
      draft.index = -1
      draft.text = ""
      return
    }

    const finalizedMessage = { role, text: draft.text.trim() }
    draft.index = -1
    draft.text = ""

    if (persist) {
      persistFinalTranscript(finalizedMessage)
    }
  }

  const resetTranscriptState = ({
    clear = false,
  }: { clear?: boolean } = {}) => {
    draftTranscriptRef.current = {
      user: { index: -1, text: "" },
      assistant: { index: -1, text: "" },
    }
    assistantTextBufferRef.current = ""
    lastPersistedTranscriptSignatureRef.current = null

    if (clear) {
      syncTranscript([])
    }
  }

  const addCallSeparator = () => {
    const currentTranscript = transcriptRef.current

    if (
      currentTranscript.length === 0 ||
      currentTranscript[currentTranscript.length - 1]?.role === "separator"
    ) {
      return
    }

    syncTranscript([
      ...currentTranscript,
      { role: "separator", id: `call-${Date.now()}` },
    ])
  }

  const stopPlayback = () => {
    playbackGenerationRef.current += 1
    playbackTimeRef.current = outputContextRef.current?.currentTime ?? 0

    for (const source of activeOutputSourcesRef.current) {
      try {
        source.stop()
      } catch {
        // Source may have already ended.
      }
      source.disconnect()
    }

    activeOutputSourcesRef.current.clear()
  }

  const playPcmAudio = async (
    base64Data: string,
    mimeType?: string,
    generation = playbackGenerationRef.current
  ) => {
    const outputContext = outputContextRef.current ?? new AudioContext()
    outputContextRef.current = outputContext

    if (outputContext.state === "suspended") {
      await outputContext.resume()
    }

    if (generation !== playbackGenerationRef.current) {
      return
    }

    const sampleRate = parseSampleRate(mimeType)
    const pcm = new Int16Array(base64ToArrayBuffer(base64Data))
    const audioBuffer = outputContext.createBuffer(1, pcm.length, sampleRate)
    const channel = audioBuffer.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = (pcm[i] ?? 0) / 0x8000
    }

    const source = outputContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(outputContext.destination)
    activeOutputSourcesRef.current.add(source)
    source.onended = () => {
      activeOutputSourcesRef.current.delete(source)
      source.disconnect()
    }
    const startAt = Math.max(outputContext.currentTime, playbackTimeRef.current)

    if (generation !== playbackGenerationRef.current) {
      activeOutputSourcesRef.current.delete(source)
      source.disconnect()
      return
    }

    source.start(startAt)
    playbackTimeRef.current = startAt + audioBuffer.duration
  }

  const handleToolCall = async (message: LiveServerMessage) => {
    const functionCalls = message.toolCall?.functionCalls ?? []
    const session = sessionRef.current

    if (!session || functionCalls.length === 0) return

    const functionResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        if (functionCall.name !== "search_knowledge_base") {
          return {
            id: functionCall.id,
            name: functionCall.name,
            response: { error: `Unknown function: ${functionCall.name}` },
          }
        }

        if (!organizationId) {
          return {
            id: functionCall.id,
            name: functionCall.name,
            response: { error: "Missing organization ID." },
          }
        }

        const query =
          typeof functionCall.args?.query === "string"
            ? functionCall.args.query
            : "Search the knowledge base for information related to the user's latest question."

        try {
          const result = await searchKnowledgeBase({ organizationId, query })
          return {
            id: functionCall.id,
            name: functionCall.name,
            response: { output: result },
          }
        } catch {
          return {
            id: functionCall.id,
            name: functionCall.name,
            response: {
              error:
                "The knowledge base search failed. Tell the user you could not search the knowledge base right now.",
            },
          }
        }
      })
    )

    session.sendToolResponse({ functionResponses })
  }

  const handleServerMessage = (message: LiveServerMessage) => {
    void handleToolCall(message)

    const serverContent = message.serverContent

    if (serverContent?.interrupted) {
      stopPlayback()
      setIsSpeaking(false)
      assistantTextBufferRef.current = ""
      finalizeTranscriptDraft("assistant", { persist: false })
    }

    if (serverContent?.inputTranscription?.text) {
      updateTranscriptDraft("user", serverContent.inputTranscription.text, {
        isFinal: Boolean(serverContent.inputTranscription.finished),
      })
    }

    if (serverContent?.outputTranscription?.text) {
      updateTranscriptDraft(
        "assistant",
        serverContent.outputTranscription.text,
        {
          isFinal: Boolean(serverContent.outputTranscription.finished),
        }
      )
    }

    const hasOutputTranscription = Boolean(
      serverContent?.outputTranscription?.text
    )
    const parts = serverContent?.modelTurn?.parts ?? []
    for (const part of parts) {
      if (part.inlineData?.data) {
        setIsSpeaking(true)
        void playPcmAudio(part.inlineData.data, part.inlineData.mimeType)
      }

      if (part.thought) {
        continue
      }

      if (part.text && !hasOutputTranscription) {
        assistantTextBufferRef.current = mergeTranscriptText(
          assistantTextBufferRef.current,
          part.text.trim()
        )
        updateTranscriptDraft("assistant", assistantTextBufferRef.current)
      }
    }

    if (serverContent?.turnComplete || serverContent?.generationComplete) {
      setIsSpeaking(false)
      if (!hasOutputTranscription && assistantTextBufferRef.current.trim()) {
        updateTranscriptDraft("assistant", assistantTextBufferRef.current, {
          isFinal: true,
        })
      } else {
        finalizeTranscriptDraft("assistant")
      }
      finalizeTranscriptDraft("user")
      assistantTextBufferRef.current = ""
    }
  }

  const stopInputCapture = () => {
    processorRef.current?.disconnect()
    inputSourceRef.current?.disconnect()
    silenceGainRef.current?.disconnect()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())

    processorRef.current = null
    inputSourceRef.current = null
    silenceGainRef.current = null
    localStreamRef.current = null

    void inputContextRef.current?.close()
    inputContextRef.current = null
  }

  const startInputCapture = async (session: Session) => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    })
    const inputContext = new AudioContext()
    const source = inputContext.createMediaStreamSource(localStream)
    const processor = inputContext.createScriptProcessor(4096, 1, 1)
    const silenceGain = inputContext.createGain()
    silenceGain.gain.value = 0

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      const resampled = downsample(
        input,
        inputContext.sampleRate,
        INPUT_SAMPLE_RATE
      )
      const pcm = floatTo16BitPcm(resampled)
      session.sendRealtimeInput({
        audio: {
          data: arrayBufferToBase64(pcm.buffer),
          mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
        },
      })
    }

    source.connect(processor)
    processor.connect(silenceGain)
    silenceGain.connect(inputContext.destination)

    localStreamRef.current = localStream
    inputContextRef.current = inputContext
    inputSourceRef.current = source
    processorRef.current = processor
    silenceGainRef.current = silenceGain
  }

  const endCall = () => {
    try {
      sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
      sessionRef.current?.close()
    } catch {
      // Session may already be closed.
    }

    sessionRef.current = null
    stopInputCapture()
    stopPlayback()
    void outputContextRef.current?.close()
    outputContextRef.current = null
    playbackTimeRef.current = 0

    setIsConnected(false)
    setIsConnecting(false)
    setIsSpeaking(false)
    resetTranscriptState()

    void finishConversation()
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
    resetTranscriptState()
    addCallSeparator()

    try {
      const tokenResponse = await fetch("/api/gemini-live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, contactSessionId }),
      })
      const tokenData =
        await parseJsonResponse<GeminiTokenResponse>(tokenResponse)

      if (!tokenResponse.ok || !tokenData.token || !tokenData.model) {
        throw new Error(tokenData.error || "Unable to start Gemini Live.")
      }

      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: "v1alpha" },
      })

      const session = await ai.live.connect({
        model: tokenData.model,
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true)
            setIsConnecting(false)
          },
          onmessage: handleServerMessage,
          onerror: (event) => {
            setError(event.message || "Gemini Live session error.")
            setIsConnecting(false)
          },
          onclose: () => {
            setIsConnected(false)
            setIsConnecting(false)
            setIsSpeaking(false)
          },
        },
      })

      sessionRef.current = session
      await startInputCapture(session)
    } catch (err) {
      endCall()
      setError(
        err instanceof Error ? err.message : "Unable to start Gemini Live."
      )
    }
  }

  // Close sockets and media devices if the user navigates away mid-call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
