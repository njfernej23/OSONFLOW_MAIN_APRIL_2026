"use client"

import { use } from "react"
import { WidgetView } from "@/modules/widget/ui/views/widget-view"

interface Props {
  searchParams: Promise<{
    organizationId: string
    mode?: string
    pageUrl?: string
  }>
}

const Page = ({ searchParams }: Props) => {
  const { mode, organizationId, pageUrl } = use(searchParams)
  const widgetMode = mode === "voice" ? "voice" : "standard"

  return (
    <WidgetView
      mode={widgetMode}
      organizationId={organizationId}
      parentPageUrl={pageUrl}
    />
  )
}

export default Page
