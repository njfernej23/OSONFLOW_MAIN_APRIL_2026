import type { Metadata } from "next"

import {
  AutomationFlowPanel,
  FeatureGrid,
  PageHero,
  PageShell,
  SectionHeading,
  SecurityStrip,
  WorkflowCards,
  automationHighlights,
} from "@/modules/marketing/ui/components/marketing-components"

export const metadata: Metadata = {
  title: "Automation | Osonflow",
  description:
    "Route intents, draft AI answers, escalate sensitive work, and keep support workflows moving with Osonflow automation.",
}

export default function AutomationPage() {
  return (
    <PageShell>
      <PageHero
        description="Automate repetitive support without losing judgment. Osonflow routes by intent, confidence, urgency, and customer context."
        title="Automation that knows when to pause"
      >
        <AutomationFlowPanel />
      </PageHero>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12">
            <SectionHeading
              description="The goal is not to hide humans. It is to let humans spend their time on work that needs taste, judgment, or trust."
              title="Rules that protect the customer experience"
            />
          </div>
          <FeatureGrid features={automationHighlights} />
        </div>
      </section>

      <section className="bg-[#F6F8FB] py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col gap-7">
            <SectionHeading
              description="Start simple, then refine routing and escalation with real conversation data."
              title="From install to continuous learning"
            />
            <SecurityStrip />
          </div>
          <WorkflowCards />
        </div>
      </section>
    </PageShell>
  )
}
