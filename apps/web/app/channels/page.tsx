import type { Metadata } from "next"

import {
  ChannelStrip,
  FeatureGrid,
  IntegrationConstellation,
  PageHero,
  PageShell,
  SectionHeading,
  SupportMap,
  integrationHighlights,
} from "@/modules/marketing/ui/components/marketing-components"

export const metadata: Metadata = {
  title: "Integrations | Osonflow",
  description:
    "Connect Osonflow to chat channels, AI model providers, voice support, and customer support workflows.",
}

export default function ChannelsPage() {
  return (
    <PageShell>
      <PageHero
        description="Bring website chat, WhatsApp, Telegram, ChatGPT, Gemini, Vapi, and future channels into one support layer."
        title="Integrations without tab chaos"
      >
        <IntegrationConstellation />
      </PageHero>

      <ChannelStrip />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12">
            <SectionHeading
              description="Customers can arrive from any channel. Your agents still get one context-rich queue."
              title="The right channel, one operating view"
            />
          </div>
          <FeatureGrid features={integrationHighlights} />
        </div>
      </section>

      <section className="bg-[#F6F8FB] py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <SectionHeading
            description="Track which channels create the most demand, which deserve automation, and where voice is faster than typing."
            title="Channel analytics without the spreadsheet ritual"
          />
          <SupportMap />
        </div>
      </section>
    </PageShell>
  )
}
