"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react"
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header"
import { Button } from "@workspace/ui/components/button"
import { useAtomValue, useSetAtom } from "jotai"
import { ArrowLeftIcon } from "lucide-react"
import {
  chatReturnScreenAtom,
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
  AIInputToolbar,
  AIInputTools,
} from "@workspace/ui/components/ai/input"
import { Form, FormField } from "@workspace/ui/components/form"
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message"

import { AIResponse } from "@workspace/ui/components/ai/response"
import {
  AISuggestion,
  AISuggestions,
} from "@workspace/ui/components/ai/suggestion"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infitnite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  mergeWidgetAppearance,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization"

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

const AssistantLoadingBubble = ({ logoUrl }: { logoUrl?: string }) => {
  return (
    <AIMessage from="assistant">
      <AIMessageContent className="border-white/60 bg-[var(--widget-bot-bubble)] text-[var(--widget-bot-bubble-foreground)] shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div
          aria-label="Assistant is preparing a response"
          className="flex items-center gap-1.5"
          role="status"
        >
          <span className="sr-only">Assistant is preparing a response</span>
          {[0, 1, 2].map((dot) => (
            <span
              aria-hidden="true"
              className="size-2 animate-bounce rounded-full bg-current/65"
              key={dot}
              style={{ animationDelay: `${dot * 0.15}s` }}
            />
          ))}
        </div>
      </AIMessageContent>
      <DicebearAvatar
        imageUrl={logoUrl || "/logo.svg"}
        seed="assistant"
        size={32}
      />
    </AIMessage>
  )
}

export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const setConversationId = useSetAtom(conversationIdAtom)
  const setPendingInitialMessage = useSetAtom(pendingInitialMessageAtom)
  const chatReturnScreen = useAtomValue(chatReturnScreenAtom)
  const conversationId = useAtomValue(conversationIdAtom)
  const pendingInitialMessage = useAtomValue(pendingInitialMessageAtom)
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const theme = mergeWidgetTheme(widgetSettings?.theme)
  const appearance = mergeWidgetAppearance(widgetSettings?.appearance)
  const canDownloadChatHistory = appearance.showChatHistoryDownload
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )

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
  const assistantMessageCount = useMemo(
    () => uiMessages.filter((message) => message.role === "assistant").length,
    [uiMessages]
  )
  const lastMessage = uiMessages.at(-1)
  const [pendingAssistantMessageCount, setPendingAssistantMessageCount] =
    useState<number | null>(null)
  const submittedInitialMessageRef = useRef<string | null>(null)
  const isAwaitingResponse =
    conversation?.status !== "resolved" &&
    pendingAssistantMessageCount !== null &&
    assistantMessageCount < pendingAssistantMessageCount &&
    lastMessage?.role === "user"

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
  const markConversationAsRead = useMutation(
    api.public.conversations.markAsRead
  )

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
    setPendingAssistantMessageCount(assistantMessageCount + 1)

    void createMessage({
      threadId,
      prompt,
      contactSessionId,
    }).catch(() => {
      setPendingAssistantMessageCount(null)
      form.setValue("message", prompt, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    })
  }, [
    assistantMessageCount,
    contactSessionId,
    conversation?.threadId,
    createMessage,
    form,
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

    form.reset()
    setPendingAssistantMessageCount(assistantMessageCount + 1)

    try {
      await createMessage({
        threadId,
        prompt,
        contactSessionId,
      })
    } catch {
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

    setPendingAssistantMessageCount(assistantMessageCount + 1)

    try {
      await createMessage({
        threadId,
        prompt: button.label,
        contactSessionId,
        workflowButtonId: button.id,
      })
    } catch {
      setPendingAssistantMessageCount(null)
    }
  }

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
      <WidgetHeader className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Button onClick={onBack} size="icon" variant="transparent">
            <ArrowLeftIcon />
          </Button>
          {theme.logoUrl ? (
            <img
              alt="Assistant logo"
              className="size-6 rounded-md bg-white/90 object-cover p-1"
              src={theme.logoUrl}
            />
          ) : null}
          <p>{theme.assistantName}</p>
        </div>
        {canDownloadChatHistory ? (
          <Button
            aria-label="Download chat history"
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
      <AIConversation>
        <AIConversationContent>
          <InfiniteScrollTrigger
            ref={topElementRef}
            onLoadMore={handleLoadMore}
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
          />
          {uiMessages.map((message) => {
            return (
              <AIMessage
                from={message.role === "user" ? "user" : "assistant"}
                key={message.id}
              >
                <AIMessageContent className="bg-[var(--widget-bot-bubble)] text-[var(--widget-bot-bubble-foreground)] group-[.is-user]:bg-[var(--widget-user-bubble)] group-[.is-user]:text-[var(--widget-user-bubble-foreground)]">
                  <AIResponse>{message.content}</AIResponse>
                </AIMessageContent>
                {message.role === "assistant" && (
                  <DicebearAvatar
                    imageUrl={theme.logoUrl || "/logo.svg"}
                    seed="assistant"
                    size={32}
                    //badgeImageUrl="/logo.svg"
                  />
                )}
              </AIMessage>
            )
          })}
          {isAwaitingResponse && (
            <AssistantLoadingBubble logoUrl={theme.logoUrl} />
          )}
        </AIConversationContent>
      </AIConversation>
      {workflowChoices?.buttons?.length ? (
        <AISuggestions className="flex w-full flex-col items-end p-2">
          {workflowChoices.buttons.map((button) => (
            <AISuggestion
              key={button.id}
              onClick={() => submitWorkflowChoice(button)}
              suggestion={button.label}
            />
          ))}
        </AISuggestions>
      ) : uiMessages.length === 1 ? (
        <AISuggestions className="flex w-full flex-col items-end p-2">
          {suggestions.map((suggestion) => {
            if (!suggestion) {
              return null
            }

            return (
              <AISuggestion
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
        <AIInput
          className="rounded-none border-x-0 border-b-0"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            disabled={conversation?.status === "resolved"}
            name="message"
            render={({ field }) => (
              <AIInputTextarea
                disabled={conversation?.status === "resolved"}
                onChange={field.onChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    form.handleSubmit(onSubmit)()
                  }
                }}
                placeholder={
                  conversation?.status === "resolved"
                    ? "This conversation has been resolved."
                    : "Type your message..."
                }
                value={field.value}
              />
            )}
          />
          <AIInputToolbar>
            <AIInputTools />
            <AIInputSubmit
              disabled={
                conversation?.status === "resolved" || !form.formState.isValid
              }
              status={isAwaitingResponse ? "submitted" : "ready"}
              type="submit"
            />
          </AIInputToolbar>
        </AIInput>
      </Form>

      {/* todo: add suggestions */}
    </>
  )
}
