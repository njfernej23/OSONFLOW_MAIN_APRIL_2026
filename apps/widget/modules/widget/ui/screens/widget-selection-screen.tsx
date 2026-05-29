"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useAtomValue, useSetAtom } from "jotai"
import {
  ChevronRightIcon,
  MicIcon,
  PhoneIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization"
import { usePaginatedQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import {
  activeVoiceProviderAtom,
  chatReturnScreenAtom,
  contactSessionIdAtomFamily,
  conversationIdAtom,
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
const DEFAULT_WIDGET_HEIGHT = 640
const HOME_BACKGROUND_HEIGHT = DEFAULT_WIDGET_HEIGHT * 0.58
const RECENT_HOME_CONTENT_HEIGHT = DEFAULT_WIDGET_HEIGHT * 0.75
const homeActionButtonClassName =
  "flex min-h-14 w-full items-center justify-between rounded-[16px] border border-white/70 bg-white/72 px-4 py-3.5 text-left text-sm font-semibold shadow-[0_8px_24px_-22px_rgba(15,23,42,0.34)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:bg-white/88 hover:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.42)] active:translate-y-0"
const headerChatButtonClassName =
  "flex min-h-12 w-full items-center justify-between rounded-[14px] border border-white/70 bg-zinc-100/95 px-4 py-3 text-left text-sm font-semibold text-zinc-950 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.42)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:bg-zinc-100 hover:shadow-[0_16px_34px_-24px_rgba(15,23,42,0.5)] active:translate-y-0"

type RecentConversation = {
  _id: Id<"conversations">
  _creationTime: number
  lastCustomerMessageAt: number | null
  lastOperatorMessageAt: number | null
  lastMessage: { text?: string | null } | null
  unreadForContactCount: number
}

type HomeHelpCard = ReturnType<typeof useHomeHelpCards>[number]

const MailSendIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.664 1.998C3.367 1.2 1.253 3.363 2.131 5.64c2.108 5.467 4.672 10.89 5.881 13.376a4.415 4.415 0 0 0 2.445 2.205L17.96 24l-7.503 2.78a4.415 4.415 0 0 0 -2.445 2.204C6.803 31.47 4.24 36.893 2.131 42.36c-0.878 2.277 1.236 4.439 3.533 3.642 7.718 -2.676 24.001 -8.999 38.018 -18.917a3.764 3.764 0 0 0 0 -6.17c-14.017 -9.918 -30.3 -16.24 -38.018 -18.917Z"
      fill="currentColor"
    />
  </svg>
)

const PinIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M29 1.5c-9.665 0 -17.5 7.83502 -17.5 17.5 0 9.665 7.835 17.5 17.5 17.5S46.5 28.665 46.5 19c0 -9.66498 -7.835 -17.5 -17.5 -17.5Zm-8.4865 11.8429c-0.781 -0.781 -0.781 -2.0474 0 -2.8284 4.6863 -4.68629 12.2843 -4.68629 16.9706 0 0.781 0.781 0.781 2.0474 0 2.8284 -0.7811 0.7811 -2.0474 0.7811 -2.8284 0 -3.1242 -3.1242 -8.1896 -3.1242 -11.3138 0 -0.781 0.7811 -2.0473 0.7811 -2.8284 0Zm-1.0267 23.8209c-3.6885 -1.9358 -6.7148 -4.9622 -8.6506 -8.6506 -1.67166 2.3605 -3.28465 4.6652 -4.67177 6.7418 -1.51913 2.2742 -2.81085 4.338 -3.63173 5.9504 -0.40541 0.7964 -0.73637 1.5597 -0.90499 2.2234 -0.08396 0.3305 -0.14869 0.7151 -0.12298 1.108 0.02603 0.3979 0.15625 0.9317 0.59142 1.3669 0.43516 0.4352 0.96904 0.5654 1.36692 0.5914 0.39293 0.0257 0.7775 -0.039 1.10796 -0.1229 0.66373 -0.1687 1.42705 -0.4996 2.2234 -0.905 1.61246 -0.8209 3.67627 -2.1126 5.95047 -3.6317 2.0766 -1.3871 4.3814 -3.0001 6.7419 -4.6717Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
)

const RecentConversationButton = ({
  conversation,
  disabled,
  onClick,
}: {
  conversation: RecentConversation
  disabled: boolean
  onClick: () => void
}) => {
  const activityAt =
    conversation.lastOperatorMessageAt ??
    conversation.lastCustomerMessageAt ??
    conversation._creationTime
  const preview = conversation.lastMessage?.text?.trim() || "Chat started"
  const unreadCount = conversation.unreadForContactCount ?? 0

  return (
    <button
      className={cn(
        "w-full rounded-[16px] border border-white/55 bg-white/78 px-4 py-3 text-left text-zinc-950 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.55)] backdrop-blur-md transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:bg-white/90 hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.62)] active:translate-y-0",
        disabled && "cursor-not-allowed opacity-70"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">
              Recent chat
            </p>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-bold text-zinc-950">
            {preview}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatDistanceToNow(new Date(activityAt), { addSuffix: true })}
          </p>
        </div>
        <ChevronRightIcon className="size-5 shrink-0 text-zinc-500" />
      </div>
    </button>
  )
}

const HomeHelpPanel = ({
  cards,
  disabled,
  onArticleClick,
  onSearchClick,
  onTopicClick,
}: {
  cards: HomeHelpCard[]
  disabled: boolean
  onArticleClick: (topic: WidgetHelpTopic, article: WidgetHelpArticle) => void
  onSearchClick: () => void
  onTopicClick: (topic: WidgetHelpTopic) => void
}) => (
  <div className="rounded-[16px] border border-white/70 bg-zinc-100/95 p-2.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.42)]">
    <button
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-[11px] bg-white/70 px-3.5 text-left text-[15px] font-bold text-zinc-950 transition-colors hover:bg-white/90",
        disabled && "cursor-not-allowed opacity-60"
      )}
      disabled={disabled}
      onClick={onSearchClick}
      type="button"
    >
      <span className="truncate">Search for help</span>
      <PinIcon className="size-[18px] shrink-0 text-zinc-950" />
    </button>

    <div className="mt-1.5">
      {cards.map((card, index) => (
        <button
          className={cn(
            "flex min-h-12 w-full items-center justify-between gap-3 rounded-[9px] px-3.5 py-2 text-left text-sm leading-snug font-medium text-zinc-500 transition-colors hover:bg-zinc-50",
            disabled && "cursor-not-allowed opacity-60"
          )}
          disabled={disabled}
          key={`${card.type}-${card.topic.title}-${index}`}
          onClick={() =>
            card.type === "article"
              ? onArticleClick(card.topic, card.article)
              : onTopicClick(card.topic)
          }
          type="button"
        >
          <span className="line-clamp-2 min-w-0">
            {card.type === "article" ? card.article.title : card.topic.title}
          </span>
          <ChevronRightIcon className="size-[18px] shrink-0 text-zinc-950" />
        </button>
      ))}
    </div>
  </div>
)

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
  const setConversationId = useSetAtom(conversationIdAtom)
  const setChatReturnScreen = useSetAtom(chatReturnScreenAtom)
  const { isPending, startConversation } = useStartWidgetConversation()
  const helpTopics = useHelpTopics()
  const homeHelpCards = useHomeHelpCards()
  const hasHelpContent = helpTopics.length > 0
  const hasHomeHelpCards = hasHelpContent && homeHelpCards.length > 0
  const [isScrolled, setIsScrolled] = useState(false)
  const recentConversations = usePaginatedQuery(
    api.public.conversations.getMany,
    contactSessionId ? { contactSessionId } : "skip",
    { initialNumItems: 1 }
  )
  const recentConversation = recentConversations.results[0] as
    | RecentConversation
    | undefined
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
          height: DEFAULT_WIDGET_HEIGHT,
        },
      },
      "*"
    )
  }, [])

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

  const openRecentConversation = (conversationId: Id<"conversations">) => {
    setChatReturnScreen("selection")
    setConversationId(conversationId)
    setScreen("chat")
  }

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={backgroundStyle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-background/70 to-background" />
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
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto"
          onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 8)}
          style={scrollFadeStyle}
        >
          <section
            className="relative flex flex-col overflow-hidden px-6 pt-6 pb-4 text-white"
            style={{
              minHeight: recentConversation
                ? RECENT_HOME_CONTENT_HEIGHT
                : HOME_BACKGROUND_HEIGHT,
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

            <div className={recentConversation ? "mt-20" : "mt-auto"}>
              <div className="relative max-w-[16rem]">
                <p className="text-2xl font-bold tracking-tight text-white/68">
                  Hi there <span className="text-xl">👋</span>
                </p>
                <h1 className="mt-1 text-3xl leading-[1.08] font-extrabold tracking-tight">
                  Let me know how we can help!
                </h1>
              </div>

              {recentConversation ? (
                <div className="mt-5 flex flex-col gap-3">
                  <RecentConversationButton
                    conversation={recentConversation}
                    disabled={isPending}
                    onClick={() =>
                      openRecentConversation(recentConversation._id)
                    }
                  />
                  <button
                    className={headerChatButtonClassName}
                    disabled={isPending}
                    onClick={() =>
                      startConversation({ returnScreen: "selection" })
                    }
                    type="button"
                  >
                    <span>Start a chat</span>
                    <MailSendIcon className="size-5 text-zinc-500" />
                  </button>
                </div>
              ) : null}

              {recentConversation ? null : (
                <button
                  className={cn(headerChatButtonClassName, "mt-6")}
                  disabled={isPending}
                  onClick={() =>
                    startConversation({ returnScreen: "selection" })
                  }
                  type="button"
                >
                  <span>Start a chat</span>
                  <MailSendIcon className="size-5 text-zinc-500" />
                </button>
              )}
            </div>
          </section>

          <div
            className={cn(
              "relative flex flex-1 flex-col gap-3 px-4 pb-4",
              recentConversation
                ? "pt-3"
                : hasHomeHelpCards
                  ? "pt-3"
                  : "pt-4"
            )}
          >
            {hasHelpContent ? (
              <HomeHelpPanel
                cards={homeHelpCards}
                disabled={isPending}
                onArticleClick={openArticle}
                onSearchClick={openHelpSearch}
                onTopicClick={openTopic}
              />
            ) : null}

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
