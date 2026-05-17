"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { usePathname } from "next/navigation"
import { ConversationsPanel } from "../components/conversations-panel"

export const ConversationsLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const isMobile = useIsMobile()
  const pathname = usePathname()

  // On mobile: show either the list OR the detail, never both
  if (isMobile) {
    const isDetailPage = pathname !== "/conversations"

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {isDetailPage ? (
          // Detail view takes full screen on mobile
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          // List view takes full screen on mobile
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <ConversationsPanel />
          </div>
        )}
      </div>
    )
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 flex-1 gap-1.5 px-2 py-2"
      orientation="horizontal"
    >
      <ResizablePanel
        id="conversations-sidebar"
        defaultSize={304}
        minSize={280}
        maxSize={420}
        groupResizeBehavior="preserve-pixel-size"
        className="flex min-w-0 flex-col"
      >
        <ConversationsPanel />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className="w-0 bg-transparent [&>div]:h-10 [&>div]:w-3.5 [&>div]:rounded-full [&>div]:border-border/70 [&>div]:bg-background/92 [&>div]:shadow-sm"
      />
      <ResizablePanel
        id="conversations-content"
        defaultSize="100%"
        minSize={420}
        className="flex min-h-0 min-w-0 flex-col"
      >
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
