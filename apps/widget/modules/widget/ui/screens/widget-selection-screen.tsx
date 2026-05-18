"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  ChevronRightIcon,
  MessageSquareTextIcon,
  MicIcon,
  PhoneIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization"
import {
  activeVoiceProviderAtom,
  contactSessionIdAtomFamily,
  helpSearchQueryAtom,
  hasGeminiLiveVoiceAtom,
  hasOpenAIRealtimeVoiceAtom,
  hasVapiSecretsAtom,
  organizationIdAtom,
  screenAtom,
  selectedHelpArticleAtom,
  selectedHelpTopicAtom,
  type WidgetHelpArticle,
  type WidgetHelpTopic,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms"
import { WidgetFooter } from "../components/widget-footer"
import { useStartWidgetConversation } from "../../hooks/use-start-widget-conversation"
import { useHelpTopics, useHomeHelpCards } from "../../hooks/use-help-articles"

const toCssImageUrl = (url: string) => url.replaceAll('"', "%22")
const DEFAULT_WIDGET_HEIGHT = 600
const HELP_HOME_WIDGET_HEIGHT = 680
const EMPTY_HOME_BACKGROUND_HEIGHT = DEFAULT_WIDGET_HEIGHT / 2
const homeActionButtonClassName =
  "flex min-h-14 w-full items-center justify-between rounded-[16px] border border-white/70 bg-white/72 px-4 py-3.5 text-left text-sm font-semibold shadow-[0_8px_24px_-22px_rgba(15,23,42,0.34)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:bg-white/88 hover:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.42)] active:translate-y-0"

export const WidgetSelectionScreen = () => {
  const setScreen = useSetAtom(screenAtom)
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
  const setSelectedHelpArticle = useSetAtom(selectedHelpArticleAtom)
  const setSelectedHelpTopic = useSetAtom(selectedHelpTopicAtom)
  const setHelpSearchQuery = useSetAtom(helpSearchQueryAtom)
  const { isPending, startConversation } = useStartWidgetConversation()
  const helpTopics = useHelpTopics()
  const homeHelpCards = useHomeHelpCards()
  const hasHelpContent = helpTopics.length > 0
  const hasHomeHelpCards = hasHelpContent && homeHelpCards.length > 0
  const [isScrolled, setIsScrolled] = useState(false)

  const backgroundImageUrl = theme.backgroundImageUrl.trim()
  const backgroundStyle: CSSProperties = {
    backgroundColor: theme.headerGradientEnd,
    backgroundImage: backgroundImageUrl
      ? `linear-gradient(180deg, rgba(5, 11, 22, 0.48), rgba(5, 11, 22, 0.84)), url("${toCssImageUrl(backgroundImageUrl)}")`
      : `linear-gradient(135deg, ${theme.headerGradientStart}, ${theme.headerGradientEnd})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  }
  const scrollFadeStyle: CSSProperties | undefined = isScrolled
    ? {
        maskImage:
          "linear-gradient(to bottom, transparent 0, black 56px, black 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0, black 56px, black 100%)",
      }
    : undefined
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return

    window.parent.postMessage(
      {
        type: "resize",
        payload: {
          height: hasHomeHelpCards
            ? HELP_HOME_WIDGET_HEIGHT
            : DEFAULT_WIDGET_HEIGHT,
        },
      },
      "*"
    )
  }, [hasHomeHelpCards])

  const closeWidget = () => {
    window.parent?.postMessage({ type: "close" }, "*")
  }

  const openHelpSearch = () => {
    setHelpSearchQuery("")
    setScreen("help")
  }

  const openTopic = (topic: WidgetHelpTopic) => {
    setSelectedHelpTopic(topic)
    setSelectedHelpArticle(null)
    setScreen("topic")
  }

  const openArticle = (topic: WidgetHelpTopic, article: WidgetHelpArticle) => {
    setSelectedHelpTopic(topic)
    setSelectedHelpArticle(article)
    setScreen("article")
  }

  const handleVoiceClick = (provider: "gemini" | "openai" | "vapi") => {
    if (!contactSessionId) {
      setScreen("auth")
      return
    }

    setActiveVoiceProvider(provider)
    setScreen("voice")
  }

  const handleContactClick = () => {
    if (!contactSessionId) {
      setScreen("auth")
      return
    }

    setScreen("contact")
  }

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            ...backgroundStyle,
            height: hasHomeHelpCards
              ? 320
              : EMPTY_HOME_BACKGROUND_HEIGHT,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]" />
        </div>
        <Button
          aria-label="Close widget"
          className="absolute top-6 right-6 z-30 size-9 rounded-full text-white hover:bg-white/12 hover:text-white"
          onClick={closeWidget}
          size="icon"
          type="button"
          variant="transparent"
        >
          <XIcon className="size-5" />
        </Button>
        <div
          className="relative z-10 min-h-0 flex-1 overflow-y-auto"
          onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 8)}
          style={scrollFadeStyle}
        >
          <section
            className="relative flex flex-col overflow-hidden px-6 pt-6 pb-8 text-white"
            style={{
              minHeight: hasHomeHelpCards ? 284 : EMPTY_HOME_BACKGROUND_HEIGHT,
            }}
          >
            <div className="relative flex items-start justify-between gap-3 pr-12">
              <div className="min-w-0">
                {theme.logoUrl ? (
                  <img
                    alt="Assistant logo"
                    className="size-10 rounded-full bg-white/92 object-contain p-1.5 shadow-sm"
                    src={theme.logoUrl}
                  />
                ) : (
                  <p className="max-w-[8rem] truncate rounded-full bg-white/16 px-3 py-2 text-sm font-extrabold tracking-tight">
                    {theme.assistantName}
                  </p>
                )}
              </div>
            </div>

            <div className="relative mt-12 max-w-[16rem]">
              <p className="text-2xl font-bold tracking-tight text-white/68">
                Hi there <span className="text-xl">👋</span>
              </p>
              <h1 className="mt-1 text-3xl leading-[1.08] font-extrabold tracking-tight">
                Let me know how we can help!
              </h1>
            </div>
          </section>

          <div
            className={cn(
              "relative space-y-3 px-4 pb-4",
              hasHomeHelpCards ? "-mt-6 pt-0" : "pt-4"
            )}
          >
            {homeHelpCards.map((card, index) => (
              <button
                className="w-full rounded-[18px] border border-black/5 bg-white px-4 py-4 text-left shadow-[0_10px_28px_-22px_rgba(15,23,42,0.58)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-26px_rgba(15,23,42,0.68)]"
                disabled={isPending}
                key={`${card.type}-${card.topic.title}-${index}`}
                onClick={() =>
                  card.type === "article"
                    ? openArticle(card.topic, card.article)
                    : openTopic(card.topic)
                }
                type="button"
              >
                <p className="line-clamp-2 text-[15px] leading-snug font-bold text-zinc-950">
                  {card.type === "article"
                    ? card.article.title
                    : card.topic.title}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-zinc-500">
                  {card.type === "article"
                    ? card.article.excerpt
                    : card.topic.excerpt}
                </p>
              </button>
            ))}

            {hasHelpContent ? (
              <button
                className={cn(homeActionButtonClassName, "text-zinc-600")}
                disabled={isPending}
                onClick={openHelpSearch}
                type="button"
              >
                <span>Search for help</span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-950">
                  <SearchIcon className="size-4" />
                </span>
              </button>
            ) : null}

            <button
              className={homeActionButtonClassName}
              disabled={isPending}
              onClick={() => startConversation({ returnScreen: "selection" })}
              type="button"
            >
              <span>Start a chat</span>
              <MessageSquareTextIcon className="size-4 text-zinc-500" />
            </button>

            <div className="grid gap-3">
              {hasOpenAIRealtimeVoice && (
                <ActionCard
                  disabled={isPending}
                  icon={<SparklesIcon className="size-5" />}
                  label="Talk with AI"
                  onClick={() => handleVoiceClick("openai")}
                />
              )}
              {hasGeminiLiveVoice && (
                <ActionCard
                  disabled={isPending}
                  icon={<SparklesIcon className="size-5" />}
                  label="Talk with Gemini"
                  onClick={() => handleVoiceClick("gemini")}
                />
              )}
              {hasVapiSecrets && widgetSettings?.vapiSettings?.assistantId && (
                <ActionCard
                  disabled={isPending}
                  icon={<MicIcon className="size-5" />}
                  label="Voice Call"
                  onClick={() => handleVoiceClick("vapi")}
                />
              )}
              {hasVapiSecrets && widgetSettings?.vapiSettings?.phoneNumber && (
                <ActionCard
                  disabled={isPending}
                  icon={<PhoneIcon className="size-5" />}
                  label="Call us"
                  onClick={handleContactClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <WidgetFooter />
    </>
  )
}

const ActionCard = ({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) => (
  <button
    className={cn(
      homeActionButtonClassName,
      disabled && "cursor-not-allowed opacity-60"
    )}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <span className="flex items-center gap-3">
      {icon}
      {label}
    </span>
    <ChevronRightIcon className="size-5 text-zinc-500" />
  </button>
)
