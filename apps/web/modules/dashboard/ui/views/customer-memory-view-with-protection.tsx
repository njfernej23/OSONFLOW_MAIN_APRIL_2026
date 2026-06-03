"use client"

import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"
import { CustomerMemoryView } from "./customer-memory-view"

export const CustomerMemoryViewWithProtection = () => {
  return (
    <ProFeatureGate>
      <CustomerMemoryView />
    </ProFeatureGate>
  )
}
