"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { usePathname } from "next/navigation"
import { AIConversationsPanel } from "../components/ai-conversations-panel"

export const AIConversationsLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const isMobile = useIsMobile()
  const pathname = usePathname()

  if (isMobile) {
    const isDetailPage = pathname !== "/ai-conversations"

    return (
      <div className="console-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {isDetailPage ? (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <AIConversationsPanel />
          </div>
        )}
      </div>
    )
  }

  return (
    <ResizablePanelGroup
      className="console-page h-full min-h-0 flex-1 gap-3 p-3"
      orientation="horizontal"
    >
      <ResizablePanel
        id="ai-conversations-sidebar"
        defaultSize={320}
        minSize={260}
        maxSize={520}
        groupResizeBehavior="preserve-pixel-size"
        className="flex min-w-0 flex-col"
      >
        <AIConversationsPanel />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className="w-0 bg-transparent [&>div]:h-12 [&>div]:w-4 [&>div]:rounded-full [&>div]:border-[var(--console-hairline)] [&>div]:bg-card [&>div]:shadow-none"
      />
      <ResizablePanel
        id="ai-conversations-content"
        minSize={420}
        className="flex min-h-0 min-w-0 flex-col"
      >
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
