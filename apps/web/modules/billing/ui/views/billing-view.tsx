"use client"

import { useQuery } from "convex/react"
import { useSearchParams } from "next/navigation"
import { api } from "@workspace/backend/_generated/api"
import { CheckCircle2Icon, CreditCardIcon } from "lucide-react"

import {
  ConsoleHeader,
  ConsoleMeta,
  ConsolePage,
} from "@/modules/dashboard/ui/components/console"
import { PricingTable } from "../components/pricing-table"

export const BillingView = () => {
  const subscription = useQuery(api.private.subscriptions.getCurrent)
  const searchParams = useSearchParams()
  const checkoutId = searchParams.get("checkout_id")
  const isPro = subscription?.isPro ?? false
  const showCheckoutSuccess = Boolean(checkoutId) && isPro

  return (
    <ConsolePage className="max-w-4xl" width="narrow">
      <ConsoleHeader
        description={
          isPro
            ? "Your workspace has full access to premium AI features. Invoices and payment methods live in the Polar portal."
            : "Start on the free workspace and move to Pro when you need voice AI, knowledge base training, and analytics."
        }
        eyebrow="Growth"
        icon={CreditCardIcon}
        meta={
          subscription ? (
            <ConsoleMeta
              dot
              label="Plan"
              tone={isPro ? "positive" : "neutral"}
              value={isPro ? "Pro" : "Free"}
            />
          ) : null
        }
        title={isPro ? "Your Pro plan" : "Plans & billing"}
      />

      {showCheckoutSuccess ? (
        <div className="console-card console-tone-positive flex items-start gap-3 px-4 py-3.5">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Upgrade successful
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Your Pro subscription is active. Manage invoices and payment
              methods in the Polar customer portal.
            </p>
          </div>
        </div>
      ) : null}

      <PricingTable subscription={subscription} />
    </ConsolePage>
  )
}
