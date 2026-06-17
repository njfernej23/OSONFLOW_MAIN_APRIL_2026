import { Suspense } from "react"

import { BillingView } from "@/modules/billing/ui/views/billing-view"

const Page = () => {
  return (
    <Suspense fallback={null}>
      <BillingView />
    </Suspense>
  )
}

export default Page