"use client"

import { useAtomValue, useSetAtom } from "jotai"
import Image from "next/image"
import { ArrowLeftIcon } from "lucide-react"
import {
  chatReturnScreenAtom,
  screenAtom,
  contactSessionIdAtomFamily,
  organizationIdAtom,
  conversationIdAtom,
} from "@/modules/widget/atoms/widget-atoms"
import { formatDistanceToNow } from "date-fns"
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header"
import { WidgetFooter } from "../components/widget-footer"
import { Button } from "@workspace/ui/components/button"
import { api } from "@workspace/backend/_generated/api"
import { usePaginatedQuery } from "convex/react"
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { Badge } from "@workspace/ui/components/badge"
import {
  AIResponse,
  type AIResponseProps,
} from "@workspace/ui/components/ai/response"
import { cn } from "@workspace/ui/lib/utils"
import { useStartWidgetConversation } from "../../hooks/use-start-widget-conversation"

const inboxPreviewMarkdownComponents: NonNullable<
  AIResponseProps["options"]
>["components"] = {
  p: ({ children }) => <span>{children}</span>,
  ul: ({ children }) => <span>{children}</span>,
  ol: ({ children }) => <span>{children}</span>,
  li: ({ children }) => <span>{children}</span>,
  strong: ({ children }) => <span className="font-semibold">{children}</span>,
  em: ({ children }) => <span className="italic">{children}</span>,
  a: ({ children }) => <span>{children}</span>,
  code: ({ children }) => (
    <span className="rounded bg-muted px-1 font-mono text-[0.92em]">
      {children}
    </span>
  ),
  h1: ({ children }) => <span className="font-semibold">{children}</span>,
  h2: ({ children }) => <span className="font-semibold">{children}</span>,
  h3: ({ children }) => <span className="font-semibold">{children}</span>,
  h4: ({ children }) => <span className="font-semibold">{children}</span>,
  h5: ({ children }) => <span className="font-semibold">{children}</span>,
  h6: ({ children }) => <span className="font-semibold">{children}</span>,
}

const EmptyInboxState = ({
  isPending,
  onStartChat,
}: {
  isPending: boolean
  onStartChat: () => void
}) => (
  <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-10 text-center">
    <div className="mb-5 flex h-36 w-44 items-center justify-center">
      <Image
        alt=""
        aria-hidden="true"
        className="size-full object-contain drop-shadow-[0_18px_28px_rgba(37,99,235,0.12)]"
        height={176}
        src="/empty-states/inbox-empty.png"
        width={176}
      />
    </div>

    <div className="max-w-[15rem]">
      <p className="text-lg font-bold tracking-tight text-foreground">
        No conversations yet
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Start a chat and your replies will appear here when you need them.
      </p>
    </div>

    <Button
      className="mt-6 h-11 rounded-full px-5 text-sm font-semibold shadow-[0_14px_34px_-24px_rgba(15,23,42,0.7)]"
      disabled={isPending}
      onClick={onStartChat}
      type="button"
    >
      Start a chat
    </Button>
  </div>
)

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const { isPending, startConversation } = useStartWidgetConversation()
  const setConversationId = useSetAtom(conversationIdAtom)
  const setChatReturnScreen = useSetAtom(chatReturnScreenAtom)

  const conversations = usePaginatedQuery(
    api.public.conversations.getMany,
    contactSessionId
      ? {
          contactSessionId,
        }
      : "skip",
    {
      initialNumItems: 10,
    }
  )

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: conversations.status,
      loadMore: conversations.loadMore,
      loadSize: 10,
    })
  const hasConversations = conversations.results.length > 0
  const isInboxEmpty =
    conversations.status !== "LoadingFirstPage" && !hasConversations

  return (
    <>
      {hasConversations ? (
        <WidgetHeader className="widget-error-header">
          <div className="flex items-center gap-x-2">
            <Button
              variant="transparent"
              size="icon"
              onClick={() => setScreen("selection")}
            >
              <ArrowLeftIcon />
            </Button>
            <p>Inbox</p>
          </div>
        </WidgetHeader>
      ) : null}
      <div className="flex flex-1 flex-col gap-y-2 overflow-y-auto bg-gradient-to-b from-background to-muted/30 p-4">
        {conversations.status === "LoadingFirstPage" ? (
          <div aria-hidden="true" className="flex min-h-full flex-1" />
        ) : isInboxEmpty ? (
          <EmptyInboxState
            isPending={isPending}
            onStartChat={() => startConversation({ returnScreen: "inbox" })}
          />
        ) : (
          <>
            {conversations?.results.map((conversation) => {
              const unreadCount = conversation.unreadForContactCount ?? 0
              const isUnread = unreadCount > 0
              const activityAt =
                conversation.lastOperatorMessageAt ??
                conversation.lastCustomerMessageAt ??
                conversation._creationTime

              return (
                <Button
                  className="h-20 w-full justify-between"
                  key={conversation._id}
                  onClick={() => {
                    setChatReturnScreen("inbox")
                    setScreen("chat")
                    setConversationId(conversation._id)
                  }}
                  variant="outline"
                >
                  <div className="flex w-full flex-col gap-4 overflow-hidden text-start">
                    <div className="flex w-full items-center justify-between gap-x-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Chat</p>
                        {isUnread ? (
                          <Badge className="h-5 rounded-full bg-rose-500 px-2 text-[10px] text-white hover:bg-rose-500">
                            {unreadCount > 9 ? "9+" : unreadCount} new
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activityAt))}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-x-2">
                      <AIResponse
                        className={cn(
                          "h-auto min-w-0 flex-1 truncate text-sm [&_*]:inline",
                          isUnread && "font-semibold text-foreground"
                        )}
                        options={{
                          components: inboxPreviewMarkdownComponents,
                        }}
                      >
                        {conversation.lastMessage?.text ?? ""}
                      </AIResponse>
                      <ConversationStatusIcon status={conversation.status} />
                    </div>
                  </div>
                </Button>
              )
            })}
            <InfiniteScrollTrigger
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              ref={topElementRef}
            />
          </>
        )}
      </div>
      <WidgetFooter />
    </>
  )
}
