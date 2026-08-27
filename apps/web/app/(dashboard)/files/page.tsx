import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { FilesView } from "@/modules/files/ui/views/files-view"

const Page = () => {
  return (
    <ProFeatureGate>
      <FilesView />
    </ProFeatureGate>
  )
}

export default Page
