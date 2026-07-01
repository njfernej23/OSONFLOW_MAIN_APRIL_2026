"use client"

import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { AssistantToolsView } from "@/modules/assistant-tools/ui/views/assistant-tools-view"

const Page = () => {
  return (
    <ProFeatureGate>
      <AssistantToolsView />
    </ProFeatureGate>
  )
}

export default Page
