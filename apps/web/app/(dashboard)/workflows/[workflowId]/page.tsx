// Workflows disabled — not developing this feature for now
// import { WorkflowBuilderView } from "@/features/workflows/components/workflow-builder-view"

const Page = async ({
  params,
}: {
  params: Promise<{
    workflowId: string
  }>
}) => {
  await params

  return null
  // return <WorkflowBuilderView initialWorkflowId={workflowId} />
}

export default Page
