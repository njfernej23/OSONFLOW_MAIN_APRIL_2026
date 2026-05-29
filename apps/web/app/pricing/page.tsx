import type { Metadata } from "next"

import {
  PageHero,
  PageShell,
  PricingCards,
  SectionHeading,
  SecurityStrip,
  WidgetPreview,
} from "@/modules/marketing/ui/components/marketing-components"

export const metadata: Metadata = {
  title: "Pricing | Osonflow",
  description:
    "Compare Osonflow plans for AI website support, automation, voice support, analytics, and custom integrations.",
}

export default function PricingPage() {
  return (
    <PageShell>
      <PageHero
        description="Choose the support layer that fits your current queue, then add automation, voice, and custom routing as the team grows."
        title="Pricing for calm support growth"
      >
        <WidgetPreview />
      </PageHero>

      <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12">
            <SectionHeading
              description="Every plan starts with a real support workflow: AI answers, a shared inbox, and the visibility needed to improve."
              title="Start focused, scale gracefully"
            />
          </div>
          <PricingCards />
        </div>
      </section>

      <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            description="Security and routing controls are part of the product foundation, not an afterthought bolted onto a chat bubble."
            title="Built for responsible AI handoff"
          />
          <SecurityStrip />
        </div>
      </section>
    </PageShell>
  )
}
