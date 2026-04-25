"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { usePathname } from "next/navigation";
import { AIConversationsPanel } from "../components/ai-conversations-panel";

export const AIConversationsLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (isMobile) {
    const isDetailPage = pathname !== "/ai-conversations";

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
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
    );
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 flex-1"
      orientation="horizontal"
    >
      <ResizablePanel
        id="ai-conversations-sidebar"
        defaultSize={320}
        minSize={260}
        maxSize={520}
        className="flex min-w-0 flex-col"
      >
        <AIConversationsPanel />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="ai-conversations-content"
        defaultSize={900}
        minSize={420}
        className="flex min-h-0 min-w-0 flex-col"
      >
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
