"use client"

import { useQuery } from "convex/react"
import { useSearchParams } from "next/navigation"
import { api } from "@workspace/backend/_generated/api"
import { CheckCircle2Icon } from "lucide-react"

import { PricingTable } from "../components/pricing-table"

export const BillingView = () => {
  const subscription = useQuery(api.private.subscriptions.getCurrent)
  const searchParams = useSearchParams()
  const checkoutId = searchParams.get("checkout_id")
  const isPro = subscription?.isPro ?? false
  const showCheckoutSuccess = Boolean(checkoutId) && isPro

  return (
    <div className="flex min-h-screen flex-col bg-transparent px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="surface-hero space-y-2 rounded-[30px] px-6 py-7 sm:px-8">
          <p className="section-kicker">Growth</p>
          <h1 className="text-2xl md:text-4xl">
            {isPro ? "Your Pro plan" : "Plans & Billing"}
          </h1>
          <p className="text-muted-foreground">
            {isPro
              ? "Your workspace has full access to premium AI features."
              : "Choose the plan that's right for you"}
          </p>
        </div>

        {showCheckoutSuccess ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Upgrade successful</p>
              <p className="text-muted-foreground">
                Your Pro subscription is active. Manage invoices and payment
                methods in the Polar customer portal.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <PricingTable subscription={subscription} />
        </div>
      </div>
    </div>
  )
}
