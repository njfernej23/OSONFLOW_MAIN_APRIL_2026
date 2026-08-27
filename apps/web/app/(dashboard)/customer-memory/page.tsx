import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { CustomerMemoryView } from "@/modules/dashboard/ui/views/customer-memory-view"

const Page = () => {
  return (
    <ProFeatureGate>
      <CustomerMemoryView />
    </ProFeatureGate>
  )
}

export default Page
