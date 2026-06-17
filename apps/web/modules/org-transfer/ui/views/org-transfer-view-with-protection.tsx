"use client"

import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { OrgTransferView } from "./org-transfer-view"

export const OrgTransferViewWithProtection = () => {
  return (
    <ProFeatureGate>
      <OrgTransferView />
    </ProFeatureGate>
  )
}
