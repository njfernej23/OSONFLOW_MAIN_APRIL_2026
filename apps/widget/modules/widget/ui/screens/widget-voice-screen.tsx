import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { useVapi } from "@/modules/widget/hooks/use-vapi"
import { useOpenAIRealtime } from "@/modules/widget/hooks/use-openai-realtime"
import { useGeminiLive } from "@/modules/widget/hooks/use-gemini-live"
import { useAtomValue, useSetAtom } from "jotai"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import {
  activeVoiceProviderAtom,
  screenAtom,
  widgetSettingsAtom,
  type WidgetMode,
} from "../../atoms/widget-atoms"
import { cn } from "@workspace/ui/lib/utils"
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization"

type TranscriptMessage =
  | {
      role: "user" | "assistant"
      text: string
    }
  | {
      role: "separator"
      id: string
    }

type VoiceCallUIProps = {
  assistantName: string
  error?: string | null
  isConnected: boolean
  isConnecting: boolean
  isSpeaking: boolean
  mode: WidgetMode
  transcript: TranscriptMessage[]
  startCall: () => void
  endCall: () => void
}

const VoiceTranscriptIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M14.65 20c-0.2125 0 -0.3906 -0.07235 -0.53425 -0.217 -0.14385 -0.1445 -0.21575 -0.32365 -0.21575 -0.5375 0 -0.21365 0.0719 -0.39135 0.21575 -0.533 0.14365 -0.14165 0.32175 -0.2125 0.53425 -0.2125h3.625l-2.95 -2.075c-0.16665 -0.11665 -0.27085 -0.275 -0.3125 -0.475 -0.04165 -0.2 -0.00415 -0.38335 0.1125 -0.55 0.11665 -0.16665 0.2736 -0.27085 0.47075 -0.3125 0.197 -0.04165 0.38175 -0.00415 0.55425 0.1125l2.975 2.05 -1.25 -3.4c-0.08335 -0.18335 -0.075 -0.36665 0.025 -0.55 0.1 -0.18335 0.25 -0.31665 0.45 -0.4 0.2 -0.08335 0.39165 -0.07915 0.575 0.0125 0.18335 0.09165 0.31665 0.2375 0.4 0.4375l1.2 3.4L21.5 13.275c0.05 -0.2 0.15835 -0.35 0.325 -0.45 0.16665 -0.1 0.35 -0.125 0.55 -0.075 0.2 0.05 0.35415 0.15835 0.4625 0.325 0.10835 0.16665 0.1375 0.35 0.0875 0.55l-1.55 5.825c-0.048 0.17115 -0.135 0.3056 -0.261 0.40325 -0.126 0.09785 -0.28065 0.14675 -0.464 0.14675h-6ZM6 17l-2.35 2.35c-0.116665 0.11665 -0.254165 0.1455 -0.4125 0.0865S3 19.26535 3 19.1V4.5c0 -0.4125 0.146915 -0.765665 0.44075 -1.0595C3.734415 3.146835 4.0875 3 4.5 3h13c0.4125 0 0.76565 0.146835 1.0595 0.4405C18.85315 3.734335 19 4.0875 19 4.5v5.225c0 0.2195 -0.075 0.4036 -0.225 0.55225 -0.15 0.1485 -0.33335 0.2144 -0.55 0.19775 -0.2 -0.01665 -0.37085 -0.0945 -0.5125 -0.2335 -0.14165 -0.13885 -0.2125 -0.311 -0.2125 -0.5165V4.5H4.5v11h7.225c0.2055 0 0.37765 0.0706 0.5165 0.21175 0.139 0.14135 0.2085 0.31635 0.2085 0.525 0 0.20885 -0.06665 0.38825 -0.2 0.53825 -0.13335 0.15 -0.30835 0.225 -0.525 0.225H6Zm1.75 -8.5h6.5c0.2125 0 0.39065 -0.07235 0.5345 -0.217 0.14365 -0.1445 0.2155 -0.32365 0.2155 -0.5375 0 -0.21365 -0.07185 -0.39135 -0.2155 -0.533 -0.14385 -0.14165 -0.322 -0.2125 -0.5345 -0.2125h-6.5c-0.2125 0 -0.3906 0.07235 -0.53425 0.217 -0.14385 0.1445 -0.21575 0.32365 -0.21575 0.5375 0 0.21365 0.0719 0.39135 0.21575 0.533 0.14365 0.14165 0.32175 0.2125 0.53425 0.2125Zm0 4.25h3.5c0.2125 0 0.39065 -0.07235 0.5345 -0.217 0.14365 -0.1445 0.2155 -0.32365 0.2155 -0.5375 0 -0.21365 -0.07185 -0.39135 -0.2155 -0.533 -0.14385 -0.14165 -0.322 -0.2125 -0.5345 -0.2125h-3.5c-0.2125 0 -0.3906 0.07235 -0.53425 0.217 -0.14385 0.1445 -0.21575 0.32365 -0.21575 0.5375 0 0.21365 0.0719 0.39135 0.21575 0.533 0.14365 0.14165 0.32175 0.2125 0.53425 0.2125Z"
    />
  </svg>
)

const VoiceBackIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="m10.1498 11.975 4.425 4.425c0.15 0.15 0.22085 0.325 0.2125 0.525 -0.00835 0.2 -0.0875 0.375 -0.2375 0.525 -0.15 0.15 -0.32915 0.225 -0.5375 0.225 -0.20835 0 -0.3875 -0.075 -0.5375 -0.225l-4.95 -4.95c-0.08335 -0.08335 -0.14165 -0.16665 -0.175 -0.25 -0.03335 -0.08335 -0.05 -0.175 -0.05 -0.275 0 -0.1 0.01665 -0.19165 0.05 -0.275 0.03335 -0.08335 0.09165 -0.16665 0.175 -0.25l4.975 -4.975c0.15 -0.15 0.32915 -0.225 0.5375 -0.225 0.20835 0 0.3875 0.075 0.5375 0.225 0.15 0.15 0.225 0.32915 0.225 0.5375 0 0.20835 -0.075 0.3875 -0.225 0.5375l-4.425 4.425Z"
    />
  </svg>
)

const VoiceCollapseIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M9.5 14.5h-3.75c-0.2125 0 -0.3906 -0.07235 -0.53425 -0.217 -0.14385 -0.1445 -0.21575 -0.32365 -0.21575 -0.5375 0 -0.21365 0.0719 -0.39135 0.21575 -0.533 0.14365 -0.14165 0.32175 -0.2125 0.53425 -0.2125h4.5c0.2125 0 0.39065 0.07185 0.5345 0.2155 0.14365 0.14385 0.2155 0.322 0.2155 0.5345v4.5c0 0.2125 -0.07235 0.3906 -0.217 0.53425 -0.1445 0.14385 -0.32365 0.21575 -0.5375 0.21575 -0.21365 0 -0.39135 -0.0719 -0.533 -0.21575C9.57085 18.6406 9.5 18.4625 9.5 18.25V14.5Zm5 -5h3.75c0.2125 0 0.39065 0.07235 0.5345 0.217 0.14365 0.1445 0.2155 0.32365 0.2155 0.5375 0 0.21365 -0.07185 0.39135 -0.2155 0.533 -0.14385 0.14165 -0.322 0.2125 -0.5345 0.2125h-4.5c-0.2125 0 -0.3906 -0.0719 -0.53425 -0.21575C13.0719 10.6406 13 10.4625 13 10.25v-4.5c0 -0.2125 0.07235 -0.39065 0.217 -0.5345 0.1445 -0.14365 0.32365 -0.2155 0.5375 -0.2155 0.21365 0 0.39135 0.07185 0.533 0.2155 0.14165 0.14385 0.2125 0.322 0.2125 0.5345V9.5Z"
    />
  </svg>
)

const VoiceCallIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M19.875 21c-1.93335 0 -3.90415 -0.46665 -5.9125 -1.4 -2.00835 -0.93335 -3.87085 -2.25835 -5.5875 -3.975 -1.71665 -1.71665 -3.04165 -3.57915 -3.975 -5.5875C3.466665 8.02915 3 6.05835 3 4.125c0 -0.3215 0.107165 -0.589335 0.3215 -0.8035C3.535665 3.107165 3.8035 3 4.125 3h3.5c0.23335 0 0.43335 0.083335 0.6 0.25 0.16665 0.166665 0.28335 0.375 0.35 0.625l0.67325 3.141c0.0345 0.23935 0.0309 0.45485 -0.01075 0.6465s-0.1311 0.3561 -0.26825 0.49325L6.475 10.675c0.43335 0.73335 0.89165 1.41665 1.375 2.05 0.48335 0.63335 1.01665 1.23335 1.6 1.8 0.61665 0.63335 1.26665 1.2125 1.95 1.7375 0.68335 0.525 1.4 0.9875 2.15 1.3875l2.375 -2.45c0.16665 -0.18335 0.3596 -0.30835 0.57875 -0.375 0.21915 -0.06665 0.4346 -0.08335 0.64625 -0.05l2.975 0.65c0.25 0.06665 0.45835 0.20035 0.625 0.401 0.16665 0.20085 0.25 0.4255 0.25 0.674v3.375c0 0.3215 -0.10715 0.58935 -0.3215 0.8035 -0.21415 0.21435 -0.482 0.3215 -0.8035 0.3215Zm-14.15 -11.7 2.025 -2.05L7.175 4.5H4.5c0.033335 0.7 0.145835 1.4375 0.3375 2.2125 0.19165 0.775 0.4875 1.6375 0.8875 2.5875ZM14.95 18.375c0.68335 0.31665 1.425 0.575 2.225 0.775 0.8 0.2 1.575 0.31665 2.325 0.35v-2.675l-2.575 -0.525 -1.975 2.075Z"
    />
  </svg>
)

const VoiceEndCallIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="m19.7999 22.05 -5.35 -5.325c-1.78335 1.45 -3.54585 2.525 -5.2875 3.225 -1.74165 0.7 -3.42085 1.05 -5.0375 1.05 -0.38333 0 -0.666665 -0.10415 -0.85 -0.3125 -0.18333 -0.20835 -0.275 -0.47915 -0.275 -0.8125V16.5c0 -0.26665 0.083335 -0.5 0.25 -0.7 0.16667 -0.2 0.375 -0.325 0.625 -0.375l2.975 -0.65c0.21665 -0.05 0.43335 -0.0375 0.65 0.0375s0.40835 0.20415 0.575 0.3875l2.375 2.45c0.48335 -0.23335 0.9875 -0.54165 1.5125 -0.925 0.525 -0.38335 0.99585 -0.74165 1.4125 -1.075l-11.25 -11.275c-0.15 -0.15 -0.225 -0.325 -0.225 -0.525s0.075 -0.375 0.225 -0.525c0.15 -0.15 0.33517 -0.225 0.5555 -0.225 0.220335 0 0.401835 0.075 0.5445 0.225l17.65 17.675c0.15 0.15 0.22085 0.325 0.2125 0.525 -0.00835 0.2 -0.0875 0.37085 -0.2375 0.5125 -0.15 0.14165 -0.325 0.21665 -0.525 0.225 -0.2 0.00835 -0.375 -0.0625 -0.525 -0.2125Zm-10.75 -3.675 -1.975 -2.075 -2.575 0.525V19.5c0.75 -0.03335 1.525 -0.15 2.325 -0.35 0.8 -0.2 1.54165 -0.45835 2.225 -0.775Zm7.525 -3.8 -1.075 -1.075c0.35 -0.41665 0.70415 -0.88335 1.0625 -1.4 0.35835 -0.51665 0.67915 -0.99165 0.9625 -1.425l-2.49425 -2.51925c-0.13715 -0.13715 -0.23075 -0.3016 -0.28075 -0.49325 -0.05 -0.19165 -0.05 -0.40415 0 -0.6375l0.675 -3.15c0.05 -0.266665 0.1625 -0.479165 0.3375 -0.6375 0.175 -0.158335 0.37915 -0.2375 0.6125 -0.2375h3.5c0.3215 0 0.58935 0.107165 0.8035 0.3215 0.21435 0.214165 0.3215 0.482 0.3215 0.8035 0 1.7 -0.4 3.4875 -1.2 5.3625 -0.8 1.875 -1.875 3.57085 -3.225 5.0875Zm1.7 -5.275c0.43335 -1 0.75 -1.8875 0.95 -2.6625 0.2 -0.775 0.29165 -1.4875 0.275 -2.1375h-2.675l-0.575 2.75 2.025 2.05Z"
    />
  </svg>
)

const useMicrophoneActivity = (enabled: boolean) => {
  const [level, setLevel] = useState(0)
  const levelRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      levelRef.current = 0
      const resetFrame = window.requestAnimationFrame(() => setLevel(0))
      return () => window.cancelAnimationFrame(resetFrame)
    }

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      levelRef.current = 0
      return
    }

    let isCancelled = false
    let animationFrame: number | null = null
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null

    const startAnalyser = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const AudioContextConstructor =
          window.AudioContext ||
          (
            window as Window & {
              webkitAudioContext?: typeof AudioContext
            }
          ).webkitAudioContext

        if (!AudioContextConstructor) {
          return
        }

        audioContext = new AudioContextConstructor()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const data = new Uint8Array(analyser.fftSize)

        const tick = () => {
          analyser.getByteTimeDomainData(data)

          let sum = 0
          for (const value of data) {
            const centered = (value - 128) / 128
            sum += centered * centered
          }

          const rms = Math.sqrt(sum / data.length)
          const nextLevel = Math.min(1, Math.max(0, (rms - 0.018) * 8))

          if (Math.abs(nextLevel - levelRef.current) > 0.025) {
            levelRef.current = nextLevel
            setLevel(nextLevel)
          }

          animationFrame = window.requestAnimationFrame(tick)
        }

        tick()
      } catch {
        setLevel(0)
        levelRef.current = 0
      }
    }

    void startAnalyser()

    return () => {
      isCancelled = true
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
      stream?.getTracks().forEach((track) => track.stop())
      void audioContext?.close()
      levelRef.current = 0
    }
  }, [enabled])

  return level
}

const VoiceOrb = ({
  audioLevel,
  disabled,
  isActive,
  isSpeaking,
  onClick,
}: {
  audioLevel: number
  disabled: boolean
  isActive: boolean
  isSpeaking: boolean
  onClick: () => void
}) => {
  const activityScale = 1 + audioLevel * 0.12
  const orbStyle = {
    "--voice-orb-activity": activityScale.toFixed(3),
  } as CSSProperties

  return (
    <button
      aria-label={isActive ? "Voice call active" : "Start voice chat"}
      className={cn(
        "group relative flex size-[min(52vw,204px)] shrink-0 items-center justify-center overflow-visible rounded-full transition-transform duration-300 outline-none focus-visible:ring-4 focus-visible:ring-sky-500/25",
        !isActive && "hover:scale-[1.02] active:scale-[0.98]",
        disabled && "cursor-wait opacity-75"
      )}
      disabled={disabled || isActive}
      onClick={onClick}
      style={orbStyle}
      type="button"
    >
      <span
        className={cn(
          "pointer-events-none absolute -inset-3 rounded-full bg-sky-400/10 opacity-0 blur-xl transition-opacity duration-500",
          isActive &&
            "[animation:voice-orb-halo_1.7s_ease-in-out_infinite] opacity-100",
          isSpeaking &&
            "[animation:voice-orb-halo_0.9s_ease-in-out_infinite] bg-cyan-400/20"
        )}
      />
      <span
        className={cn(
          "absolute inset-0 overflow-hidden rounded-full ring-1 ring-black/5 will-change-transform",
          "[animation:voice-orb-idle_7s_ease-in-out_infinite]",
          isActive &&
            "[animation:voice-orb-listening_2.1s_ease-in-out_infinite]",
          isSpeaking &&
            "[animation:voice-orb-speaking_0.82s_ease-in-out_infinite]"
        )}
      >
        <span
          className={cn(
            "absolute -inset-8 bg-[radial-gradient(circle_at_28%_22%,rgba(238,247,126,0.82),transparent_28%),radial-gradient(circle_at_72%_24%,rgba(139,211,255,0.95),transparent_34%),radial-gradient(circle_at_48%_82%,rgba(0,120,224,0.95),transparent_40%),radial-gradient(circle_at_84%_70%,rgba(4,31,43,0.86),transparent_42%),radial-gradient(circle_at_20%_70%,rgba(96,169,129,0.7),transparent_34%)] will-change-transform",
            "[animation:voice-orb-gradient_9s_linear_infinite]",
            isActive && "[animation-duration:4.8s]",
            isSpeaking && "[animation-duration:1.7s]"
          )}
        />
        <span className="absolute inset-0 [animation:voice-orb-spin_6s_linear_infinite] bg-[conic-gradient(from_120deg,rgba(255,255,255,0.16),rgba(255,255,255,0),rgba(255,255,255,0.22),rgba(255,255,255,0))] opacity-80 mix-blend-overlay" />
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-white/0",
            (isSpeaking || audioLevel > 0.08) &&
              "[animation:voice-orb-ripple_0.82s_ease-out_infinite] bg-[radial-gradient(circle_at_50%_50%,transparent_36%,rgba(255,255,255,0.26)_54%,transparent_72%)]"
          )}
        />
      </span>
      {!isActive ? (
        <span className="relative flex size-14 items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_18px_34px_-18px_rgba(15,23,42,0.55)]">
          <VoiceCallIcon className="size-5" />
        </span>
      ) : null}
    </button>
  )
}

const TranscriptBackControl = ({
  onClick,
}: {
  onClick: () => void
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleClick = () => {
    if (isPressed) {
      return
    }

    setIsPressed(true)
    timeoutRef.current = window.setTimeout(() => {
      onClick()
    }, 170)
  }

  return (
    <div className="relative -ml-0.5 flex size-12 items-center justify-center">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden rounded-full ring-1 ring-black/5 [animation:voice-orb-idle_5.5s_ease-in-out_infinite]",
          isPressed &&
            "[animation:voice-back-orb-press_170ms_cubic-bezier(0.16,1,0.3,1)_both]"
        )}
        style={{ "--voice-orb-activity": "1" } as CSSProperties}
      >
        <span className="absolute -inset-5 bg-[radial-gradient(circle_at_28%_22%,rgba(238,247,126,0.82),transparent_28%),radial-gradient(circle_at_72%_24%,rgba(139,211,255,0.95),transparent_34%),radial-gradient(circle_at_48%_82%,rgba(0,120,224,0.95),transparent_40%),radial-gradient(circle_at_84%_70%,rgba(4,31,43,0.86),transparent_42%),radial-gradient(circle_at_20%_70%,rgba(96,169,129,0.7),transparent_34%)] [animation:voice-orb-gradient_7s_linear_infinite]" />
        <span className="absolute inset-0 [animation:voice-orb-spin_5s_linear_infinite] bg-[conic-gradient(from_120deg,rgba(255,255,255,0.16),rgba(255,255,255,0),rgba(255,255,255,0.22),rgba(255,255,255,0))] opacity-80 mix-blend-overlay" />
      </span>
      <Button
        aria-label="Back to voice"
        className="relative z-10 size-8 rounded-full bg-transparent p-0 text-zinc-950 shadow-none transition-colors duration-200 hover:translate-y-0 hover:bg-transparent hover:text-zinc-950 active:translate-y-0"
        disabled={isPressed}
        onClick={handleClick}
        size="icon"
        type="button"
        variant="ghost"
      >
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_-14px_rgba(15,23,42,0.45)] transition-colors duration-200 group-hover/button:bg-white/82",
            isPressed &&
              "[animation:voice-back-button-press_170ms_cubic-bezier(0.16,1,0.3,1)_both]"
          )}
        >
          <VoiceBackIcon
            className={cn(
              "size-4",
              isPressed &&
                "[animation:voice-back-arrow-press_170ms_cubic-bezier(0.16,1,0.3,1)_both]"
            )}
          />
        </span>
      </Button>
    </div>
  )
}

const TranscriptOpenControl = ({
  onClick,
}: {
  onClick: () => void
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleClick = () => {
    if (isPressed) {
      return
    }

    setIsPressed(true)
    timeoutRef.current = window.setTimeout(() => {
      onClick()
    }, 150)
  }

  return (
    <Button
      aria-label="Show transcript"
      className={cn(
        "size-11 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950",
        isPressed &&
          "[animation:voice-message-button-press_150ms_cubic-bezier(0.16,1,0.3,1)_both]"
      )}
      disabled={isPressed}
      onClick={handleClick}
      size="icon"
      type="button"
      variant="ghost"
    >
      <VoiceTranscriptIcon
        className={cn(
          "size-5",
          isPressed &&
            "[animation:voice-message-icon-press_150ms_cubic-bezier(0.16,1,0.3,1)_both]"
        )}
      />
    </Button>
  )
}

const TranscriptView = ({
  transcript,
}: {
  transcript: TranscriptMessage[]
}) => (
  <ScrollArea className="min-h-0 flex-1 px-5">
    <div className="flex min-h-[20rem] flex-col gap-3 pt-2 pb-4">
      {transcript.length > 0 ? (
        transcript.map((message, index) =>
          message.role === "separator" ? (
            <div
              aria-hidden="true"
              className="my-5 h-px w-full bg-[radial-gradient(circle,currentColor_1.1px,transparent_1.3px)] bg-[length:7px_1px] text-zinc-300"
              key={message.id}
            />
          ) : (
            <div
              className={cn(
                "max-w-[86%] px-4 py-3 text-[15px] leading-relaxed text-zinc-950",
                message.role === "assistant"
                  ? "self-start rounded-[24px] rounded-tl-[10px] bg-zinc-100/90"
                  : "self-end rounded-[18px] rounded-tr-[10px] border border-zinc-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
              )}
              key={`${message.role}-${index}-${message.text}`}
            >
              {message.text}
            </div>
          )
        )
      ) : (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-zinc-500">
          Transcript appears here after the voice agent returns final lines.
        </div>
      )}
    </div>
  </ScrollArea>
)

const VoiceCallUI = ({
  assistantName,
  error,
  isConnected,
  isConnecting,
  isSpeaking,
  mode,
  transcript,
  startCall,
  endCall,
}: VoiceCallUIProps) => {
  const setScreen = useSetAtom(screenAtom)
  const [view, setView] = useState<"talk" | "transcript">("talk")
  const isActive = isConnected || isConnecting
  const microphoneLevel = useMicrophoneActivity(isConnected)
  const canShowTranscript = isActive || transcript.length > 0
  const statusLabel = isConnecting
    ? "Connecting..."
    : isSpeaking
      ? "Speaking..."
      : isConnected
        ? "Listening..."
        : null
  const description = useMemo(() => {
    if (isConnected) return null
    if (isConnecting) return null
    return `Talk with ${assistantName}.`
  }, [assistantName, isConnected, isConnecting])

  const closeVoice = () => {
    if (isActive) {
      endCall()
    }

    if (mode === "voice") {
      window.parent?.postMessage({ type: "close" }, "*")
      return
    }

    setScreen("selection")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white text-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="w-12">
            {canShowTranscript ? (
              view === "transcript" ? (
                <TranscriptBackControl onClick={() => setView("talk")} />
              ) : (
                <TranscriptOpenControl onClick={() => setView("transcript")} />
              )
            ) : null}
          </div>

          <div className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
            Voice only
          </div>

          <Button
            aria-label={mode === "voice" ? "Close voice widget" : "Back"}
            className="size-11 rounded-full bg-zinc-100 text-zinc-700 transition-colors duration-200 hover:translate-y-0 hover:bg-zinc-200 hover:text-zinc-950 active:translate-y-0"
            onClick={closeVoice}
            size="icon"
            type="button"
            variant="ghost"
          >
            {mode === "voice" ? (
              <VoiceCollapseIcon className="size-6" />
            ) : (
              <ArrowLeftIcon className="size-5" />
            )}
          </Button>
        </div>

        {view === "transcript" ? (
          <TranscriptView transcript={transcript} />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
            <VoiceOrb
              audioLevel={microphoneLevel}
              disabled={isConnecting}
              isActive={isActive}
              isSpeaking={isSpeaking}
              onClick={startCall}
            />
            {statusLabel ? (
              <p className="mt-7 text-[15px] font-medium text-zinc-700">
                {statusLabel}
              </p>
            ) : null}
            {description ? (
              <p
                className={cn(
                  "max-w-[17rem] text-sm leading-relaxed text-balance text-zinc-500",
                  statusLabel ? "mt-2" : "mt-7"
                )}
              >
                {description}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
          </section>
        )}

        <div className="flex h-16 shrink-0 items-center justify-end px-5 pb-5">
          {isActive ? (
            <Button
              aria-label="End voice chat"
              className="size-14 rounded-full bg-zinc-950 text-white shadow-[0_18px_32px_-20px_rgba(15,23,42,0.75)] hover:bg-zinc-800 hover:text-white"
              onClick={endCall}
              size="icon"
              type="button"
            >
              <VoiceEndCallIcon className="size-5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const VapiVoice = ({
  assistantName,
  mode,
}: {
  assistantName: string
  mode: WidgetMode
}) => {
  const {
    isConnected,
    isSpeaking,
    startCall,
    endCall,
    isConnecting,
    transcript,
  } = useVapi()

  return (
    <VoiceCallUI
      assistantName={assistantName}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isSpeaking={isSpeaking}
      mode={mode}
      transcript={transcript}
      startCall={startCall}
      endCall={endCall}
    />
  )
}

const OpenAIRealtimeVoice = ({
  assistantName,
  mode,
}: {
  assistantName: string
  mode: WidgetMode
}) => {
  const {
    isConnected,
    isSpeaking,
    startCall,
    endCall,
    isConnecting,
    error,
    transcript,
  } = useOpenAIRealtime()

  return (
    <VoiceCallUI
      assistantName={assistantName}
      error={error}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isSpeaking={isSpeaking}
      mode={mode}
      transcript={transcript}
      startCall={startCall}
      endCall={endCall}
    />
  )
}

const GeminiLiveVoice = ({
  assistantName,
  mode,
}: {
  assistantName: string
  mode: WidgetMode
}) => {
  const {
    isConnected,
    isSpeaking,
    startCall,
    endCall,
    isConnecting,
    error,
    transcript,
  } = useGeminiLive()

  return (
    <VoiceCallUI
      assistantName={assistantName}
      error={error}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isSpeaking={isSpeaking}
      mode={mode}
      transcript={transcript}
      startCall={startCall}
      endCall={endCall}
    />
  )
}

export const WidgetVoiceScreen = ({
  mode = "standard",
}: {
  mode?: WidgetMode
}) => {
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const activeVoiceProvider = useAtomValue(activeVoiceProviderAtom)
  const theme = mergeWidgetTheme(widgetSettings?.theme)
  const provider = activeVoiceProvider ?? "openai"

  if (provider === "vapi") {
    return <VapiVoice assistantName={theme.assistantName} mode={mode} />
  }

  if (provider === "gemini") {
    return <GeminiLiveVoice assistantName={theme.assistantName} mode={mode} />
  }

  return <OpenAIRealtimeVoice assistantName={theme.assistantName} mode={mode} />
}
