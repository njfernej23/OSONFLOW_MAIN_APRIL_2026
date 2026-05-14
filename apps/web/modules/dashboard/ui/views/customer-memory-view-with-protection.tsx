"use client"

import { Show } from "@clerk/nextjs"

import { PremiumFeatureOverlay } from "@/modules/billing/ui/components/premium-feature-overlay"
import { CustomerMemoryView } from "./customer-memory-view"

export const CustomerMemoryViewWithProtection = () => {
  return (
    <Show
      when={{ plan: "pro" }}
      fallback={
        <PremiumFeatureOverlay>
          <CustomerMemoryView />
        </PremiumFeatureOverlay>
      }
    >
      <CustomerMemoryView />
    </Show>
  )
}
