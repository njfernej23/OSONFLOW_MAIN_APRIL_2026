"use client"

import { PricingTable } from "../components/pricing-table"

export const BillingView = () => {
  return (
    <div className="flex min-h-screen flex-col bg-transparent px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="surface-hero space-y-2 rounded-[30px] px-6 py-7 sm:px-8">
          <p className="section-kicker">Growth</p>
          <h1 className="text-2xl md:text-4xl">Plans & Billing</h1>
          <p className="text-muted-foreground">
            Choose the plan that&apos;s right for you
          </p>
        </div>

        <div className="mt-8">
          <PricingTable />
        </div>
      </div>
    </div>
  )
}
