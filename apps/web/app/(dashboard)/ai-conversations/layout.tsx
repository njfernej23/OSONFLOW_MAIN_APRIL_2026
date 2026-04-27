import { auth } from "@clerk/nextjs/server"
import { AIConversationsLayout } from "@/modules/dashboard/ui/layouts/ai-conversations-layout"

const Layout = async ({ children }: { children: React.ReactNode }) => {
  await auth.protect()

  return <AIConversationsLayout>{children}</AIConversationsLayout>
}

export default Layout
