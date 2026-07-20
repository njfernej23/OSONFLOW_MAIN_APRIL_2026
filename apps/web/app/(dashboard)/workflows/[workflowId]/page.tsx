import { WorkflowBuilderView } from "@/features/workflows/components/workflow-builder-view"

const Page = async ({
  params,
}: {
  params: Promise<{
    workflowId: string
  }>
}) => {
  const { workflowId } = await params

  return <WorkflowBuilderView initialWorkflowId={workflowId} />
}

export default Page
