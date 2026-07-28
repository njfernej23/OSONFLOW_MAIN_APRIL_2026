"use client"

import { use } from "react"
import { WidgetView } from "@/modules/widget/ui/views/widget-view"

interface Props {
  searchParams: Promise<{
    organizationId: string
    agentId?: string
    mode?: string
    pageUrl?: string
  }>
}

const Page = ({ searchParams }: Props) => {
  const { mode, organizationId, agentId, pageUrl } = use(searchParams)
  const widgetMode = mode === "voice" ? "voice" : "standard"

  return (
    <WidgetView
      mode={widgetMode}
      organizationId={organizationId}
      agentId={agentId}
      parentPageUrl={pageUrl}
    />
  )
}

export default Page
