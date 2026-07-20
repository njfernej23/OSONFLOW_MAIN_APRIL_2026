import "@/features/workflows/styles/workflow-builder.css"
import { WorkflowsLiveblocksProvider } from "@/features/workflows/components/workflows-liveblocks-provider"

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <WorkflowsLiveblocksProvider>{children}</WorkflowsLiveblocksProvider>
}

export default Layout
