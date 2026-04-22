import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { ConversationsPanel } from "../components/conversations-panel";

export const ConversationsLayout = ({
  children
}: { children: React.ReactNode; }) => {
  return (
    <ResizablePanelGroup className="h-full flex-1" orientation="horizontal">
      <ResizablePanel id="conversations-sidebar" defaultSize={200} minSize={245} maxSize={700}>
        <ConversationsPanel />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="conversations-content" className="h-full" defaultSize={600}>
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};