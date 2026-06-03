"use client"

import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"

import { PremiumFeatureOverlay } from "./premium-feature-overlay"

type ProFeatureGateProps = {
  children: React.ReactNode
}

export const ProFeatureGate = ({ children }: ProFeatureGateProps) => {
  const subscription = useQuery(api.private.subscriptions.getCurrent)

  if (subscription === undefined) {
    return null
  }

  if (!subscription.isActive) {
    return <PremiumFeatureOverlay>{children}</PremiumFeatureOverlay>
  }

  return <>{children}</>
}
