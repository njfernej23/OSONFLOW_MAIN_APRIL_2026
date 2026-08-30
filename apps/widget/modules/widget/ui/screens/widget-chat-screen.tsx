"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react"
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header"
import { Button } from "@workspace/ui/components/button"
import { useAtomValue, useSetAtom } from "jotai"
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react"
import {
  chatReturnScreenAtom,
  workflowOnlyAtom,
  contactSessionIdAtomFamily,
  conversationIdAtom,
  organizationIdAtom,
  pendingInitialMessageAtom,
  screenAtom,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import {
  AIConversation,
  AIConversationContent,
} from "@workspace/ui/components/ai/conversation"
import {
  AIInput,
  AIInputSubmit,
  AIInputTextarea,
} from "@workspace/ui/components/ai/input"
import { Form, FormField } from "@workspace/ui/components/form"
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message"

import { AIResponse } from "@workspace/ui/components/ai/response"
import {
  parseRichMessages,
  richButtonIds,
} from "@workspace/ui/components/ai/rich-message"
import {
  AISuggestion,
  AISuggestions,
} from "@workspace/ui/components/ai/suggestion"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { useNotifyOnNewMessages } from "@workspace/ui/hooks/use-notify-on-new-messages"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  mergeWidgetAppearance,
  mergeWidgetCopy,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization"
import { cn } from "@workspace/ui/lib/utils"
import { WidgetEmailCapture } from "../components/widget-email-capture"

const formSchema = z.object({
  message: z.string().min(1, "Message is required"),
})

type ChatHistoryMessage = {
  id: string
  role: string
  text: string
  createdAt: number | null
}

type ChatHistoryExport = {
  conversationId: string
  exportedAt: number
  truncated: boolean
  messages: ChatHistoryMessage[]
}

const getUiMessageText = (message: {
  content?: unknown
  parts?: Array<{ type?: string; text?: string }>
}) => {
  if (typeof message.content === "string") {
    return message.content
  }

  return (
    message.parts
      ?.map((part) => (part.type === "text" ? (part.text ?? "") : ""))
      .join("") ?? ""
  )
}

const DownloadToLineIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M12 17V3" />
    <path d="m6 11 6 6 6-6" />
    <path d="M19 21H5" />
  </svg>
)

const formatChatHistoryTimestamp = (timestamp: number | null) => {
  if (!timestamp) {
    return "Unknown time"
  }

  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const getChatHistoryRoleLabel = (role: string, assistantName: string) => {
  if (role === "user") {
    return "You"
  }

  if (role === "assistant") {
    return assistantName || "Assistant"
  }

  return role.charAt(0).toUpperCase() + role.slice(1)
}

const buildChatHistoryText = ({
  assistantName,
  exportData,
}: {
  assistantName: string
  exportData: ChatHistoryExport
}) => {
  const headerLines = [
    "Chat history",
    `Assistant: ${assistantName || "Assistant"}`,
    `Conversation ID: ${exportData.conversationId}`,
    `Exported: ${formatChatHistoryTimestamp(exportData.exportedAt)}`,
    exportData.truncated
      ? "Note: This export includes the newest 1,000 messages."
      : null,
    "",
  ].filter((line): line is string => line !== null)

  const messageLines = exportData.messages.flatMap((message) => [
    `[${formatChatHistoryTimestamp(message.createdAt)}] ${getChatHistoryRoleLabel(
      message.role,
      assistantName
    )}:`,
    message.text,
    "",
  ])

  return `${[...headerLines, ...messageLines].join("\n").trimEnd()}\n`
}

const BUBBLE_CLASS =
  "owc-bubble bg-[var(--widget-bot-bubble)] text-[var(--widget-bot-bubble-foreground)] group-[.is-user]:bg-[var(--widget-user-bubble)] group-[.is-user]:text-[var(--widget-user-bubble-foreground)]"

const AssistantLoadingBubble = ({ logoUrl }: { logoUrl?: string }) => {
  return (
    <AIMessage className="owc-msg" from="assistant">
      <AIMessageContent
        className={cn(BUBBLE_CLASS, "owc-typing")}
      >
        <div
          aria-label="Assistant is preparing a response"
          className="flex h-3 items-center gap-1.5"
          role="status"
        >
          <span className="sr-only">Assistant is preparing a response</span>
          {[0, 1, 2].map((dot) => (
            <span
              aria-hidden="true"
              className="owc-typing-dot"
              key={dot}
              style={{ animationDelay: `${dot * 0.14}s` }}
            />
          ))}
        </div>
      </AIMessageContent>
      <DicebearAvatar
        className="owc-avatar"
        imageUrl={logoUrl || "/logo.svg"}
        seed="assistant"
        size={28}
      />
    </AIMessage>
  )
}

export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const setConversationId = useSetAtom(conversationIdAtom)
  const setPendingInitialMessage = useSetAtom(pendingInitialMessageAtom)
  const chatReturnScreen = useAtomValue(chatReturnScreenAtom)
  const workflowOnly = useAtomValue(workflowOnlyAtom)
  const conversationId = useAtomValue(conversationIdAtom)
  const pendingInitialMessage = useAtomValue(pendingInitialMessageAtom)
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const theme = mergeWidgetTheme(widgetSettings?.theme)
  const appearance = mergeWidgetAppearance(widgetSettings?.appearance)
  const copy = mergeWidgetCopy(widgetSettings?.widgetCopy)
  const canDownloadChatHistory = appearance.showChatHistoryDownload
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )

  const contactSessionDetails = useQuery(
    api.public.contactSessions.getDetails,
    contactSessionId && organizationId
      ? {
          contactSessionId,
          organizationId,
        }
      : "skip"
  )
  // undefined = still loading; hold messages until we know the session is identified.
  const needsEmail =
    contactSessionDetails === undefined
      ? undefined
      : contactSessionDetails === null
        ? false
        : contactSessionDetails.isAnonymous

  const onBack = () => {
    setConversationId(null)
    setScreen(chatReturnScreen)
  }

  const suggestions = useMemo(() => {
    if (!widgetSettings) {
      return []
    }

    return Object.keys(widgetSettings.defaultSuggestions).map((key) => {
      return widgetSettings.defaultSuggestions[
        key as keyof typeof widgetSettings.defaultSuggestions
      ]
    })
  }, [widgetSettings])

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        }
      : "skip"
  )
  const chatHistoryExport = useQuery(
    api.public.messages.getConversationExport,
    canDownloadChatHistory && conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        }
      : "skip"
  ) as ChatHistoryExport | undefined
  const workflowChoices = useQuery(
    api.public.workflows.getPendingChoices,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        }
      : "skip"
  ) as
    | {
        pendingNodeId: string | null
        buttons: Array<{ id: string; label: string }>
        waitingMode: "buttons" | "capture" | "choice" | "ai_turn" | null
        pendingPrompt: string | null
      }
    | null
    | undefined

  const messages = useThreadMessages(
    api.public.messages.getMany,

    conversation?.threadId && contactSessionId
      ? {
          threadId: conversation.threadId,
          contactSessionId,
        }
      : "skip",
    { initialNumItems: 10 }
  )
  const uiMessages = useMemo(
    () => toUIMessages(messages.results ?? []),
    [messages.results]
  )
  const visibleMessages = useMemo(
    () =>
      uiMessages.filter(
        (message) => getUiMessageText(message).trim().length > 0
      ),
    [uiMessages]
  )

  // Card and Carousel steps render their own buttons, so the choice row below
  // the thread must not repeat them.
  const latestAssistantMessage = useMemo(
    () =>
      [...visibleMessages]
        .reverse()
        .find((message) => message.role === "assistant") ?? null,
    [visibleMessages]
  )

  const cardButtonIds = useMemo(
    () =>
      latestAssistantMessage
        ? richButtonIds(
            parseRichMessages(getUiMessageText(latestAssistantMessage))
          )
        : new Set<string>(),
    [latestAssistantMessage]
  )

  // Operator replies are stored with the assistant role, so the sound is only
  // enabled once the thread is escalated to a human. While the conversation is
  // still unresolved the assistant messages are AI replies to something the
  // visitor just typed, which should not chime.
  useNotifyOnNewMessages(visibleMessages, {
    notifyForRole: "assistant",
    enabled:
      conversation?.status === "escalated" &&
      appearance.notificationSoundEnabled,
  })
  const assistantMessageCount = useMemo(
    () =>
      visibleMessages.filter((message) => message.role === "assistant").length,
    [visibleMessages]
  )
  const userMessageCount = useMemo(
    () => visibleMessages.filter((message) => message.role === "user").length,
    [visibleMessages]
  )
  const [pendingAssistantMessageCount, setPendingAssistantMessageCount] =
    useState<number | null>(null)
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<{
    text: string
    baseCount: number
  } | null>(null)
  const showOptimisticUserMessage =
    optimisticUserMessage !== null &&
    userMessageCount <= optimisticUserMessage.baseCount
  const submittedInitialMessageRef = useRef<string | null>(null)
  // Messages typed before the visitor shares their email; sent once identified.
  const [heldMessages, setHeldMessages] = useState<{
    baseCount: number
    messages: string[]
  } | null>(null)
  const [receivedDetails, setReceivedDetails] = useState<{
    name: string
    email: string
  } | null>(null)
  const isFlushingHeldMessagesRef = useRef(false)
  const visibleHeldMessages = useMemo(() => {
    if (!heldMessages) {
      return []
    }

    // Hide held bubbles as the server confirms them to avoid duplicates.
    return heldMessages.messages.slice(
      Math.max(0, userMessageCount - heldMessages.baseCount)
    )
  }, [heldMessages, userMessageCount])
  const showEmailCapture =
    (needsEmail === true &&
      (visibleHeldMessages.length > 0 || userMessageCount > 0)) ||
    receivedDetails !== null
  // After the first message, block the composer until a valid email is submitted.
  const isInputLockedForEmail =
    needsEmail === true &&
    ((heldMessages?.messages.length ?? 0) > 0 || userMessageCount > 0)
  const isAwaitingResponse =
    conversation?.status !== "resolved" &&
    pendingAssistantMessageCount !== null &&
    assistantMessageCount < pendingAssistantMessageCount

  const isConversationResolved = conversation?.status === "resolved"
  const isComposerDisabled = isConversationResolved || isInputLockedForEmail

  // Fallback mark when the merchant has not uploaded a logo.
  const assistantInitials = useMemo(() => {
    const parts = theme.assistantName.trim().split(/\s+/).filter(Boolean)

    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
    }

    return (parts[0] ?? "AI").slice(0, 2).toUpperCase()
  }, [theme.assistantName])

  // Says who is actually on the other end right now, not a fixed slogan.
  const presenceLabel = isConversationResolved
    ? "Conversation resolved"
    : conversation?.status === "escalated"
      ? "A teammate is on it"
      : isAwaitingResponse
        ? "Typing…"
        : copy.onlineLabel

  const composerPlaceholder = isConversationResolved
    ? "This conversation has been resolved"
    : isInputLockedForEmail
      ? "Enter your email above to continue…"
      : workflowChoices?.waitingMode === "capture"
        ? "Type your reply…"
        : workflowChoices?.waitingMode === "choice"
          ? "Choose an option or type it…"
          : copy.inputPlaceholder

  useEffect(() => {
    if (pendingAssistantMessageCount === null) {
      return
    }

    if (
      assistantMessageCount >= pendingAssistantMessageCount ||
      workflowChoices?.buttons?.length
    ) {
      setPendingAssistantMessageCount(null)
    }
  }, [
    assistantMessageCount,
    pendingAssistantMessageCount,
    workflowChoices?.buttons?.length,
  ])

  useEffect(() => {
    if (pendingAssistantMessageCount === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPendingAssistantMessageCount(null)
    }, 90_000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [pendingAssistantMessageCount])

  useEffect(() => {
    if (
      optimisticUserMessage !== null &&
      userMessageCount > optimisticUserMessage.baseCount
    ) {
      setOptimisticUserMessage(null)
    }
  }, [optimisticUserMessage, userMessageCount])

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: messages.status,
      loadMore: messages.loadMore,
      loadSize: 10,
    })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  })

  const createMessage = useAction(api.public.messages.create)
  const identifyContactSession = useAction(api.public.contactSessions.identify)
  const markConversationAsRead = useMutation(
    api.public.conversations.markAsRead
  )

  const holdMessage = (prompt: string) => {
    setHeldMessages((previous) =>
      previous
        ? { ...previous, messages: [...previous.messages, prompt] }
        : { baseCount: userMessageCount, messages: [prompt] }
    )
  }

  const onSubmitDetails = async ({
    name,
    email,
  }: {
    name: string
    email: string
  }) => {
    if (!contactSessionId || !organizationId) {
      throw new Error("Missing session")
    }

    const result = await identifyContactSession({
      contactSessionId,
      organizationId,
      email,
      name,
    })

    setReceivedDetails({ name: result.name, email: result.email })
  }

  // Once the visitor is identified, deliver any messages typed beforehand.
  useEffect(() => {
    const threadId = conversation?.threadId
    if (
      needsEmail !== false ||
      !heldMessages ||
      heldMessages.messages.length === 0 ||
      !threadId ||
      !contactSessionId ||
      isFlushingHeldMessagesRef.current
    ) {
      return
    }

    isFlushingHeldMessagesRef.current = true
    setPendingAssistantMessageCount(assistantMessageCount + 1)

    const flush = async () => {
      for (const prompt of heldMessages.messages) {
        await createMessage({
          threadId,
          prompt,
          contactSessionId,
        })
      }
    }

    void flush()
      .catch(() => {
        setPendingAssistantMessageCount(null)
        setHeldMessages(null)
      })
      .finally(() => {
        isFlushingHeldMessagesRef.current = false
      })
  }, [
    assistantMessageCount,
    contactSessionId,
    conversation?.threadId,
    createMessage,
    heldMessages,
    needsEmail,
  ])

  // Drop held state once every held message is confirmed by the server.
  useEffect(() => {
    if (
      heldMessages &&
      userMessageCount - heldMessages.baseCount >= heldMessages.messages.length
    ) {
      setHeldMessages(null)
    }
  }, [heldMessages, userMessageCount])

  useEffect(() => {
    const prompt = pendingInitialMessage?.trim()
    const threadId = conversation?.threadId
    if (!prompt || !threadId || !contactSessionId) {
      return
    }

    if (submittedInitialMessageRef.current === prompt) {
      return
    }

    submittedInitialMessageRef.current = prompt
    setPendingInitialMessage(null)

    if (needsEmail !== false) {
      if (!isInputLockedForEmail) {
        holdMessage(prompt)
      }
      return
    }

    setOptimisticUserMessage({ text: prompt, baseCount: userMessageCount })
    setPendingAssistantMessageCount(assistantMessageCount + 1)

    void createMessage({
      threadId,
      prompt,
      contactSessionId,
    }).catch(() => {
      setOptimisticUserMessage(null)
      setPendingAssistantMessageCount(null)
      form.setValue("message", prompt, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    })
  }, [
    assistantMessageCount,
    userMessageCount,
    contactSessionId,
    conversation?.threadId,
    createMessage,
    form,
    isInputLockedForEmail,
    needsEmail,
    pendingInitialMessage,
    setPendingInitialMessage,
  ])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const threadId = conversation?.threadId
    if (!threadId || !contactSessionId) {
      return
    }

    const prompt = values.message.trim()

    if (!prompt) {
      return
    }

    if (isInputLockedForEmail) {
      return
    }

    form.reset()

    if (needsEmail !== false) {
      holdMessage(prompt)
      return
    }

    setOptimisticUserMessage({ text: prompt, baseCount: userMessageCount })
    setPendingAssistantMessageCount(assistantMessageCount + 1)

    try {
      await createMessage({
        threadId,
        prompt,
        contactSessionId,
      })
    } catch {
      setOptimisticUserMessage(null)
      setPendingAssistantMessageCount(null)
      form.setValue("message", prompt, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }

  const submitWorkflowChoice = async (button: {
    id: string
    label: string
  }) => {
    const threadId = conversation?.threadId
    if (!threadId || !contactSessionId) {
      return
    }

    setOptimisticUserMessage({ text: button.label, baseCount: userMessageCount })
    setPendingAssistantMessageCount(assistantMessageCount + 1)

    try {
      await createMessage({
        threadId,
        prompt: button.label,
        contactSessionId,
        workflowButtonId: button.id,
      })
    } catch {
      setOptimisticUserMessage(null)
      setPendingAssistantMessageCount(null)
    }
  }

  // Anything the cards already offer is dropped from the row, so a carousel
  // shows one set of buttons rather than one per card plus a full row.
  const choiceRowButtons = (workflowChoices?.buttons ?? []).filter(
    (button) => !cardButtonIds.has(button.id)
  )

  const onDownloadChatHistory = () => {
    if (
      !canDownloadChatHistory ||
      !chatHistoryExport ||
      chatHistoryExport.messages.length === 0
    ) {
      return
    }

    const fileContent = buildChatHistoryText({
      assistantName: theme.assistantName,
      exportData: chatHistoryExport,
    })
    const blob = new Blob([fileContent], {
      type: "text/plain;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const safeConversationId = chatHistoryExport.conversationId.replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    )

    link.href = url
    link.download = `chat-history-${safeConversationId}-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  useEffect(() => {
    if (!conversationId || !contactSessionId || !conversation) {
      return
    }

    if ((conversation.unreadForContactCount ?? 0) === 0) {
      return
    }

    void markConversationAsRead({
      conversationId,
      contactSessionId,
    })
  }, [contactSessionId, conversation, conversationId, markConversationAsRead])

  return (
    <>
      <WidgetHeader className="owc-header relative z-10 flex shrink-0 items-center justify-between gap-2 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {workflowOnly ? null : (
            <Button
              className="owc-header-action size-8 shrink-0"
              onClick={onBack}
              size="icon"
              variant="transparent"
            >
              <ArrowLeftIcon className="size-4" />
              <span className="sr-only">Back</span>
            </Button>
          )}

          <span aria-hidden className="owc-header-avatar shrink-0">
            {theme.logoUrl ? (
              <img
                alt=""
                className="owc-protected-image"
                draggable={false}
                src={theme.logoUrl}
              />
            ) : (
              assistantInitials
            )}
          </span>

          <div className="min-w-0">
            <p className="owc-header-name truncate">{theme.assistantName}</p>
            <p className="owc-header-status">
              <span aria-hidden className="owc-header-status-dot" />
              <span className="truncate">{presenceLabel}</span>
            </p>
          </div>
        </div>

        {canDownloadChatHistory ? (
          <Button
            aria-label="Download chat history"
            className="owc-header-action size-8 shrink-0"
            disabled={
              !chatHistoryExport || chatHistoryExport.messages.length === 0
            }
            onClick={onDownloadChatHistory}
            size="icon"
            title="Download chat history"
            variant="transparent"
          >
            <DownloadToLineIcon className="size-4" />
          </Button>
        ) : null}
      </WidgetHeader>
      <AIConversation className="owc-thread">
        <AIConversationContent className="owc-thread-content">
          <InfiniteScrollTrigger
            ref={topElementRef}
            onLoadMore={handleLoadMore}
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            noMoreText="Beginning of chat"
          />
          {visibleMessages.map((message) => {
            return (
              <AIMessage
                className="owc-msg"
                from={message.role === "user" ? "user" : "assistant"}
                key={message.id}
              >
                <AIMessageContent className={BUBBLE_CLASS}>
                  <AIResponse
                    richActions={
                      message.id === latestAssistantMessage?.id
                        ? {
                            onButtonClick: submitWorkflowChoice,
                            disabled: !workflowChoices?.buttons?.length,
                          }
                        : undefined
                    }
                  >
                    {getUiMessageText(message)}
                  </AIResponse>
                </AIMessageContent>
                {message.role === "assistant" && (
                  <DicebearAvatar
                    className="owc-avatar"
                    imageUrl={theme.logoUrl || "/logo.svg"}
                    seed="assistant"
                    size={28}
                  />
                )}
              </AIMessage>
            )
          })}
          {showOptimisticUserMessage && optimisticUserMessage && (
            <AIMessage
              className="owc-msg"
              from="user"
              key="optimistic-user-message"
            >
              <AIMessageContent className={BUBBLE_CLASS}>
                <AIResponse>{optimisticUserMessage.text}</AIResponse>
              </AIMessageContent>
            </AIMessage>
          )}
          {visibleHeldMessages.map((heldMessage, index) => (
            <AIMessage
              className="owc-msg"
              from="user"
              key={`held-message-${index}`}
            >
              <AIMessageContent className={BUBBLE_CLASS}>
                <AIResponse>{heldMessage}</AIResponse>
              </AIMessageContent>
            </AIMessage>
          ))}
          {showEmailCapture ? (
            <WidgetEmailCapture
              onSubmitDetails={onSubmitDetails}
              receivedDetails={receivedDetails}
            />
          ) : null}
          {isAwaitingResponse && (
            <AssistantLoadingBubble logoUrl={theme.logoUrl} />
          )}
        </AIConversationContent>
      </AIConversation>
      {choiceRowButtons.length > 0 ? (
        <AISuggestions className="owc-suggestions">
          {choiceRowButtons.map((button) => (
            <AISuggestion
              className="owc-suggestion"
              key={button.id}
              onClick={() => submitWorkflowChoice(button)}
              suggestion={button.label}
            />
          ))}
        </AISuggestions>
      ) : !workflowChoices?.buttons?.length &&
        visibleMessages.length === 1 &&
        visibleHeldMessages.length === 0 ? (
        <AISuggestions className="owc-suggestions">
          {suggestions.map((suggestion) => {
            if (!suggestion) {
              return null
            }

            return (
              <AISuggestion
                className="owc-suggestion"
                key={suggestion}
                onClick={() => {
                  form.setValue("message", suggestion, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                  form.handleSubmit(onSubmit)()
                }}
                suggestion={suggestion}
              />
            )
          })}
        </AISuggestions>
      ) : null}

      <Form {...form}>
        <AIInput className="owc-composer" onSubmit={form.handleSubmit(onSubmit)}>
          {isConversationResolved ? (
            <p className="owc-composer-note">
              <CheckCircle2Icon className="size-3.5" />
              This conversation has been resolved.
            </p>
          ) : null}

          {/* One row, so the composer reads as a single control rather than a
              stacked field with a detached toolbar. */}
          <div className="owc-composer-row">
            <FormField
              control={form.control}
              disabled={isComposerDisabled}
              name="message"
              render={({ field }) => (
                <AIInputTextarea
                  className="owc-composer-input"
                  disabled={isComposerDisabled}
                  minHeight={36}
                  maxHeight={128}
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      form.handleSubmit(onSubmit)()
                    }
                  }}
                  placeholder={composerPlaceholder}
                  value={field.value}
                />
              )}
            />
            <AIInputSubmit
              aria-label="Send message"
              className="owc-composer-send"
              disabled={isComposerDisabled || !form.formState.isValid}
              status={isAwaitingResponse ? "submitted" : "ready"}
              type="submit"
            />
          </div>
        </AIInput>
      </Form>
    </>
  )
}
