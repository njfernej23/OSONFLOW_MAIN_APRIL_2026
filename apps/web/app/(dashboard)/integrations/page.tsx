import { Suspense } from "react"

import { IntegrationsView } from "@/modules/integrations/ui/views/integrations-view"

const Page = () => {
  return (
    <Suspense fallback={null}>
      <IntegrationsView />
    </Suspense>
  )
}

export default Page