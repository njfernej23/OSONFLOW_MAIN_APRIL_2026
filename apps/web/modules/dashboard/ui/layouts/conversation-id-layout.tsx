"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { ContactPanel } from "../components/contact-panel";

export const ConversationIdLayout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 flex-1"
      orientation="horizontal"
    >
      <ResizablePanel
        id="conversation-chat"
        defaultSize={860}
        minSize={460}
        className="flex min-h-0 min-w-0 flex-col"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="conversation-contact"
        defaultSize={360}
        minSize={240}
        maxSize={560}
        className="flex min-h-0 min-w-0 flex-col"
      >
        <ContactPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
