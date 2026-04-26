"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { ArrowLeftIcon } from "lucide-react"
import {
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
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Badge } from "@workspace/ui/components/badge"

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const setConversationId = useSetAtom(conversationIdAtom)

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

  return (
    <>
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
      <div className="flex flex-1 flex-col gap-y-2 overflow-y-auto p-4">
        {conversations.status === "LoadingFirstPage" ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 w-full rounded-lg border p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {conversations?.results.length > 0 &&
              conversations?.results.map((conversation) => {
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
                        <p
                          className={`truncate text-sm ${isUnread ? "font-semibold text-foreground" : ""}`}
                        >
                          {conversation.lastMessage?.text}
                        </p>
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
