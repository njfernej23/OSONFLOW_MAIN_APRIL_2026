import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { OrgTransferView } from "@/modules/org-transfer/ui/views/org-transfer-view"

const Page = () => {
  return (
    <ProFeatureGate>
      <OrgTransferView />
    </ProFeatureGate>
  )
}

export default Page
