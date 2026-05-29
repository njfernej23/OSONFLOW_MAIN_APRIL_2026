import type { Metadata } from "next"

import {
  AnalyticsPanel,
  FeatureGrid,
  HeroMockup,
  PageHero,
  PageShell,
  ProductSystemPanel,
  SectionHeading,
  SecurityStrip,
  productHighlights,
} from "@/modules/marketing/ui/components/marketing-components"

export const metadata: Metadata = {
  title: "Product | Osonflow",
  description:
    "Explore the Osonflow AI support widget, shared inbox, analytics, customer memory, and human handoff workflow.",
}

export default function ProductPage() {
  return (
    <PageShell>
      <PageHero
        description="A polished AI support widget, shared conversation inbox, customer memory, voice support, and analytics designed as one operating system."
        title="Product command center"
      >
        <HeroMockup compact />
      </PageHero>

      <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12">
            <SectionHeading
              description="The product is intentionally quiet for agents and immediate for customers: answer, hand off, analyze, and improve from one place."
              title="Everything support needs in one calm surface"
            />
          </div>
          <FeatureGrid features={productHighlights} />
        </div>
      </section>

      <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <AnalyticsPanel />
          <div className="flex flex-col gap-7">
            <SectionHeading
              description="Your team can see what AI handled, what still needs a person, which answers were missing, and where customer friction is rising."
              title="A dashboard that makes support measurable"
            />
            <SecurityStrip />
          </div>
        </div>
      </section>

      <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeading
            description="Osonflow keeps AI, agents, channels, and knowledge in the same loop, so every solved question makes the next one easier."
            title="Built around the support loop"
          />
          <ProductSystemPanel />
        </div>
      </section>
    </PageShell>
  )
}
