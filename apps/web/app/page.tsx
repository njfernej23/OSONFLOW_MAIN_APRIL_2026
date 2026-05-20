import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  AnalyticsPanel,
  AutomationFlowPanel,
  ChannelStrip,
  CtaSection,
  FeatureGrid,
  HeroMockup,
  IntegrationConstellation,
  LandingNav,
  LiquidBackdrop,
  MarketingFooter,
  MetricsBand,
  PricingCards,
  ProductSystemPanel,
  SectionHeading,
  SecurityStrip,
  SupportMap,
  automationHighlights,
  featureCards,
  integrationHighlights,
  proofItems,
} from "@/modules/marketing/ui/components/marketing-components"

export const metadata: Metadata = {
  title: "Osonflow | AI Customer Support",
  description:
    "Launch a polished AI support widget, voice assistant, and human handoff inbox from one calm customer support platform.",
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white [font-family:var(--font-display)] text-[#101828]">
      <LandingNav />

      <section className="relative overflow-hidden border-b border-[#101828]/8 bg-[#F6F8FB]">
        <div className="absolute inset-x-0 top-0 h-px bg-[#3A04FF]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,24,40,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,24,40,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <LiquidBackdrop />
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
          <div className="flex max-w-3xl flex-col gap-6">
            <h1 className="max-w-4xl text-5xl leading-[0.96] font-semibold text-[#080A12] sm:text-6xl lg:text-7xl">
              AI customer support in one calm inbox
            </h1>
            <p className="max-w-2xl text-xl leading-8 text-[#475467]">
              Osonflow gives your website a beautiful chat widget, trained AI
              answers, voice support, and a dashboard for the conversations that
              still need a human touch.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-13 rounded-full bg-[#3A04FF] px-6 text-base font-semibold text-white shadow-[0_20px_48px_-28px_rgba(58,4,255,0.8)] hover:bg-[#2F00D6]"
              >
                <Link href="/sign-up">
                  Build my support widget
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                className="h-13 rounded-full border-[#101828]/12 bg-white px-6 text-base font-semibold text-[#101828] shadow-[0_18px_48px_-34px_rgba(15,23,42,0.5)] hover:bg-[#F8FAFC]"
                variant="outline"
              >
                <Link href="/product">
                  See product
                  <ChevronRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {proofItems.map((item) => (
                <div
                  className="osonflow-liquid-card rounded-2xl px-4 py-3 text-sm font-semibold text-[#344054]"
                  key={item}
                >
                  <ShieldCheckIcon className="mb-2 size-4 text-[#157A43]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      <ChannelStrip />
      <MetricsBand />

      <section className="relative overflow-hidden bg-white py-24">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#F6F8FB] to-white" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <SectionHeading
              description="Customers get answers from the widget. Your team gets context, priority, and analytics when a human should step in."
              title="A support layer that feels instant, not robotic"
            />
            <FeatureGrid features={featureCards} />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F6F8FB] py-24">
        <LiquidBackdrop />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <AnalyticsPanel />
          <div className="flex flex-col gap-7">
            <SectionHeading
              description="Osonflow turns conversations into signals: unanswered questions, escalation reasons, resolution source, intent, sentiment, and customer memory."
              title="Know exactly where support is leaking time"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Intent detection",
                "CSV export",
                "Customer memory",
                "Unanswered questions",
              ].map((item) => (
                <div
                  className="osonflow-liquid-card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#344054]"
                  key={item}
                >
                  <ZapIcon className="size-4 text-[#FFB020]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="flex flex-col gap-7">
              <SectionHeading
                description="The product is built around one operating loop: answer what AI can, hand off what humans should own, and learn from every gap."
                title="Designed as a system, not another widget"
              />
              <SecurityStrip />
            </div>
            <ProductSystemPanel />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#101828] py-24 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(58,4,255,0.22),transparent_32%,rgba(52,211,153,0.12)_64%,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div className="flex flex-col gap-5">
            <h2 className="text-5xl leading-none font-semibold text-white sm:text-6xl">
              Automations with a human-shaped safety net
            </h2>
            <p className="max-w-xl text-lg leading-8 text-white/66">
              Route repetitive questions, draft answers, and surface urgent work
              while keeping your team in control of edge cases.
            </p>
            <Button
              asChild
              className="h-12 w-fit rounded-full bg-white px-5 text-base font-semibold text-[#101828] hover:bg-white/90"
            >
              <Link href="/automation">
                Explore automation
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <AutomationFlowPanel />
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F6F8FB] py-24">
        <LiquidBackdrop />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <SectionHeading
              description="Bring chat, voice, model providers, and channel data into one support layer without making agents switch tabs all day."
              title="Connect every place customers ask for help"
            />
            <FeatureGrid features={integrationHighlights} />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <IntegrationConstellation />
            <SupportMap />
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <SectionHeading
              description="Start with the widget and inbox, then add automations, voice, analytics, and custom integrations when your team is ready."
              title="Plans that scale with support complexity"
            />
            <FeatureGrid features={automationHighlights} />
          </div>
          <PricingCards compact />
        </div>
      </section>

      <CtaSection />
      <MarketingFooter />
    </main>
  )
}
