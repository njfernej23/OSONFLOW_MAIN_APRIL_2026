import { AIConversationIdView } from "@/modules/dashboard/ui/views/ai-conversation-id-view";
import { Id } from "@workspace/backend/_generated/dataModel";

const Page = async ({
  params,
}: {
  params: Promise<{
    aiConversationId: string;
  }>;
}) => {
  const { aiConversationId } = await params;

  return (
    <AIConversationIdView
      conversationId={aiConversationId as Id<"aiVoiceConversations">}
    />
  );
};

export default Page;
