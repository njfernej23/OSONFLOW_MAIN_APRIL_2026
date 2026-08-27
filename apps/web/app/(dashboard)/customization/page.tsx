import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { CustomizationView } from "@/modules/customization/ui/views/customization-view"

const Page = () => {
  return (
    <ProFeatureGate>
      <CustomizationView />
    </ProFeatureGate>
  )
}

export default Page
