import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  DatabaseZapIcon,
  FileTextIcon,
  HeadphonesIcon,
  MessageCircleMoreIcon,
  Mic2Icon,
  PhoneCallIcon,
  PlugZapIcon,
  RadioTowerIcon,
  SendIcon,
  SparklesIcon,
  TrendingUpIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { LandingNav } from "./landing-nav"
import { MarketingFooter, channelLogos } from "./marketing-components"

const heroSignals = [
  "Website chat",
  "AI voice",
  "Human handoff",
  "Customer memory",
]

const queueRows = [
  {
    name: "Amina",
    issue: "Plan change before renewal",
    state: "AI drafting",
    tone: "text-[#0B6B3A]",
  },
  {
    name: "Bekzod",
    issue: "Payment failed twice",
    state: "Human priority",
    tone: "text-[#BC4A10]",
  },
  {
    name: "Maya",
    issue: "Invoice export",
    state: "Resolved",
    tone: "text-[#235BDB]",
  },
]

const loopSteps = [
  {
    title: "Answer instantly",
    description:
      "Ground the assistant in your files, help center, and policies so common questions do not wait for an agent.",
    icon: BotIcon,
  },
  {
    title: "Handoff with context",
    description:
      "When the question needs judgment, agents receive the customer history, priority, sentiment, and a clean next action.",
    icon: HeadphonesIcon,
  },
  {
    title: "Improve the source",
    description:
      "Every missed answer becomes a visible gap in docs, routing, automation, or product education.",
    icon: DatabaseZapIcon,
  },
]

const insightRows = [
  ["Billing change", "Resolved by AI", "42s", "bg-[#DFF7EA] text-[#0B6B3A]"],
  ["Payment failure", "Needs person", "2m", "bg-[#FFF0DF] text-[#BC4A10]"],
  ["Voice support", "In call", "Live", "bg-[#E8F0FF] text-[#235BDB]"],
  ["Refund policy", "Missing doc", "New gap", "bg-[#F1F4F8] text-[#475467]"],
]

const automationRows = [
  {
    from: "New billing question",
    route: "AI answer with policy citation",
    state: "94% confidence",
    icon: FileTextIcon,
  },
  {
    from: "Payment failure",
    route: "Create human priority thread",
    state: "Escalated",
    icon: CircleAlertIcon,
  },
  {
    from: "Voice request",
    route: "Start realtime assistant",
    state: "In call",
    icon: PhoneCallIcon,
  },
]

const pricingRows: Array<[string, boolean, boolean, boolean]> = [
  ["AI website widget", true, true, true],
  ["Knowledge base uploads", true, true, true],
  ["Shared inbox", true, true, true],
  ["Automation rules", false, true, true],
  ["Voice support", false, true, true],
  ["Custom integrations", false, false, true],
]

const pricingPlans = [
  {
    name: "Launch",
    price: "$29",
    cta: "Start Launch",
    href: "/sign-up",
  },
  {
    name: "Scale",
    price: "$79",
    cta: "Start Scale",
    href: "/sign-up",
    featured: true,
  },
  {
    name: "Custom",
    price: "Talk",
    cta: "Book custom demo",
    href: "/sign-up",
  },
]

const channelCapabilities: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Chat", icon: MessageCircleMoreIcon },
  { label: "Models", icon: SparklesIcon },
  { label: "Voice", icon: RadioTowerIcon },
]

const channelRoutes = [
  {
    source: "Website widget",
    signal: "Plans, billing, product questions",
    route: "AI answer with source",
    destination: "Customer resolved",
    icon: MessageCircleMoreIcon,
    tone: "text-[#235BDB]",
  },
  {
    source: "WhatsApp + Telegram",
    signal: "Repeat questions from existing customers",
    route: "Same memory, same inbox",
    destination: "Thread unified",
    icon: RadioTowerIcon,
    tone: "text-[#0B6B3A]",
  },
  {
    source: "Voice request",
    signal: "Urgent issue or typing is too slow",
    route: "Realtime assistant then handoff",
    destination: "Agent brief ready",
    icon: PhoneCallIcon,
    tone: "text-[#BC4A10]",
  },
]

const launchSteps = [
  {
    title: "Install the widget",
    description:
      "Drop the script into your site and match the launcher to your brand.",
    icon: PlugZapIcon,
  },
  {
    title: "Load the answers",
    description:
      "Add files, help articles, product pages, policies, and pricing details.",
    icon: FileTextIcon,
  },
  {
    title: "Set the handoff rules",
    description:
      "Choose when AI answers, when voice starts, and when humans step in.",
    icon: WorkflowIcon,
  },
]

const evidenceSlots = [
  {
    title: "Dashboard command view",
    description: "Queue, AI confidence, customer memory, and escalation state.",
    imageSrc: null,
  },
  {
    title: "Website widget moment",
    description: "A branded customer-facing assistant on the live site.",
    imageSrc: null,
  },
  {
    title: "Voice handoff trace",
    description: "Realtime voice support with transcript and next action.",
    imageSrc: null,
  },
] satisfies Array<{
  title: string
  description: string
  imageSrc: string | null
}>

export const HomeLandingPage = () => (
  <main className="osonflow-motion-page min-h-screen bg-white [font-family:var(--font-display)] text-[#101828]">
    <LandingNav />
    <HeroSection />
    <SignalStrip />
    <EvidenceSection />
    <LoopSection />
    <WorkspaceSection />
    <AutomationSection />
    <ChannelsSection />
    <PricingSection />
    <HomeCta />
    <MarketingFooter />
  </main>
)

const HeroSection = () => (
  <section className="osonflow-hero-motion relative overflow-hidden border-b border-[#101828]/10 bg-[#F7F8F5]">
    <div className="osonflow-home-field absolute inset-0" />
    <div className="relative mx-auto grid max-w-[88rem] items-start gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:py-10">
      <div className="max-w-3xl lg:pt-4">
        <h1 className="osonflow-hero-title max-w-4xl text-5xl leading-[0.92] font-semibold text-[#080A12] sm:text-6xl lg:text-[4.15rem] xl:text-[4.85rem]">
          Osonflow support desk
        </h1>
        <p className="osonflow-hero-copy mt-5 max-w-2xl text-xl leading-8 text-[#475467] lg:text-[1.22rem] lg:leading-8 xl:text-[1.35rem] xl:leading-9">
          Turn chat, voice, help content, and human follow-up into one live
          support workspace that answers quickly and escalates cleanly.
        </p>
        <div className="osonflow-hero-actions mt-7 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            className="osonflow-primary-cta h-13 rounded-full bg-[#101828] px-6 text-base font-semibold text-white shadow-[0_22px_54px_-30px_rgba(16,24,40,0.82)] hover:bg-[#1D2939]"
          >
            <Link href="/sign-up">
              Build my support desk
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            className="osonflow-secondary-cta h-13 rounded-full border-[#101828]/16 bg-white/78 px-6 text-base font-semibold text-[#101828] backdrop-blur hover:bg-white"
            variant="outline"
          >
            <Link href="/product">
              See product
              <ChevronRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="osonflow-signal-grid mt-7 grid max-w-2xl grid-cols-2 border-y border-[#101828]/14 text-sm font-semibold text-[#344054] sm:grid-cols-4">
          {heroSignals.map((signal, index) => (
            <span
              className={cn(
                "osonflow-signal-item py-4 sm:px-4",
                index % 2 === 1 && "pl-4",
                index > 0 && "sm:border-l sm:border-[#101828]/14",
                index === 1 && "border-l border-[#101828]/14 sm:border-l",
                index === 3 && "border-l border-[#101828]/14 sm:border-l"
              )}
              key={signal}
            >
              {signal}
            </span>
          ))}
        </div>
      </div>

      <HeroDesk />
    </div>
    <div className="osonflow-hero-note relative mx-auto max-w-[88rem] border-t border-[#101828]/10 px-5 py-4 sm:px-8">
      <div className="grid gap-3 text-sm font-medium text-[#667085] md:grid-cols-[0.9fr_1.1fr]">
        <span>For teams that want fewer support tools and better answers.</span>
        <span className="text-[#101828]">
          Widget, inbox, voice, analytics, automations, and integrations move as
          one system.
        </span>
      </div>
    </div>
  </section>
)

const HeroDesk = () => (
  <div className="osonflow-hero-desk relative min-h-[500px] lg:min-h-[540px]">
    <div className="osonflow-desk-shadow absolute inset-x-6 top-12 bottom-4" />
    <div className="osonflow-routing-line absolute top-10 right-0 left-8 h-[86%]" />
    <div className="osonflow-desk-window relative ml-auto overflow-hidden rounded-lg border border-[#101828]/14 bg-white shadow-[0_36px_100px_-60px_rgba(15,23,42,0.7)]">
      <div className="grid min-h-[500px] lg:min-h-[540px] lg:grid-cols-[10.5rem_1fr] xl:grid-cols-[11.5rem_1fr]">
        <aside className="hidden border-r border-[#101828]/10 bg-[#F4F6F8] p-4 lg:block">
          <div className="flex items-center gap-2 border-b border-[#101828]/10 pb-4">
            <span className="osonflow-live-dot size-2.5 rounded-full bg-[#16A163]" />
            <span className="text-sm font-semibold text-[#101828]">
              Osonflow live
            </span>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            {["Inbox", "AI chats", "Voice", "Memory", "Analytics"].map(
              (item, index) => (
                <div
                  className={cn(
                    "osonflow-nav-item flex items-center justify-between border-l-2 py-1.5 pl-3",
                    index === 0
                      ? "border-[#235BDB] text-[#101828]"
                      : "border-transparent text-[#667085]"
                  )}
                  key={item}
                >
                  <span className="font-semibold">{item}</span>
                  {index === 0 ? (
                    <span className="text-xs text-[#235BDB]">18</span>
                  ) : null}
                </div>
              )
            )}
          </div>
        </aside>

        <div className="grid bg-[#FBFCFD] md:grid-cols-[0.95fr_1.2fr]">
          <section className="border-b border-[#101828]/10 bg-white md:border-r md:border-b-0">
            <div className="border-b border-[#101828]/10 px-5 py-4">
              <p className="text-sm font-semibold text-[#101828]">
                Priority queue
              </p>
              <p className="mt-1 text-xs text-[#667085]">
                Ranked by urgency, revenue, and sentiment
              </p>
            </div>
            <div className="divide-y divide-[#101828]/10">
              {queueRows.map((row, index) => (
                <div
                  className={cn(
                    "osonflow-queue-row px-5 py-4",
                    index === 0 && "is-active bg-[#EFF4FF]"
                  )}
                  key={row.name}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#101828]">
                      {row.name}
                    </p>
                    <span className={cn("text-xs font-semibold", row.tone)}>
                      {row.state}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#667085]">
                    {row.issue}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 border-t border-[#101828]/10">
              {[
                ["94%", "AI confidence"],
                ["42s", "first reply"],
                ["12", "doc gaps"],
              ].map(([value, label]) => (
                <div
                  className="osonflow-desk-metric border-r border-[#101828]/10 px-4 py-5 last:border-r-0"
                  key={label}
                >
                  <p className="osonflow-metric-value text-2xl leading-none font-semibold text-[#101828]">
                    {value}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 font-medium text-[#667085]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-[420px] flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-[#101828]/10 bg-white px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#101828]">
                  Conversation with Amina
                </p>
                <p className="mt-1 text-xs text-[#667085]">
                  Customer memory loaded
                </p>
              </div>
              <button
                className="osonflow-call-button inline-flex h-9 items-center gap-2 rounded-full bg-[#101828] px-3 text-xs font-semibold text-white"
                type="button"
              >
                <PhoneCallIcon className="size-3.5" />
                Call
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="osonflow-message-in max-w-[84%] rounded-lg rounded-tl-sm border border-[#101828]/10 bg-white px-4 py-3 text-sm leading-6 text-[#344054]">
                Can I change my plan today and keep the same billing cycle?
              </div>
              <div className="osonflow-message-out ml-auto max-w-[88%] rounded-lg rounded-tr-sm bg-[#235BDB] px-4 py-3 text-sm leading-6 text-white">
                Yes. Your cycle stays the same, and the difference is prorated
                automatically.
              </div>
              <div className="osonflow-suggestion-panel border-l-2 border-[#16A163] bg-[#F0FBF5] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#101828]">
                  <SparklesIcon className="size-4 text-[#16A163]" />
                  Suggested next action
                </div>
                <p className="mt-2 text-sm leading-6 text-[#475467]">
                  Send upgrade link, mention prorated billing, and watch the
                  account if payment fails.
                </p>
              </div>
              <div className="osonflow-reply-box mt-auto flex items-center gap-2 border border-[#101828]/10 bg-white px-3 py-2">
                <span className="flex-1 text-sm text-[#98A2B3]">
                  Reply with AI assistance...
                </span>
                <span className="osonflow-send-button flex size-9 items-center justify-center rounded-md bg-[#16A163] text-white">
                  <SendIcon className="size-4" />
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
)

const SignalStrip = () => (
  <section className="border-b border-[#101828]/10 bg-white">
    <div className="mx-auto grid max-w-[88rem] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
      <div>
        <p className="text-2xl leading-8 font-semibold text-[#101828]">
          One support layer for the channels customers already use.
        </p>
      </div>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          {channelLogos.map((logo) => (
            <div
              className="osonflow-logo-chip inline-flex items-center gap-2.5"
              key={logo.label}
            >
              <Image
                alt={`${logo.label} logo`}
                className="size-8 rounded-full object-contain"
                height={32}
                src={logo.src}
                width={32}
              />
              <span className="text-sm font-semibold text-[#344054]">
                {logo.label}
              </span>
            </div>
          ))}
        </div>
        <div className="grid border-t border-[#101828]/10 pt-6 sm:grid-cols-3">
          {[
            ["72%", "fewer repeat questions"],
            ["4.8x", "faster first response"],
            ["24/7", "coverage across chat and voice"],
          ].map(([value, label]) => (
            <div
              className="osonflow-proof-metric border-b border-[#101828]/10 py-4 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0"
              key={label}
            >
              <p className="text-5xl leading-none font-semibold text-[#101828]">
                {value}
              </p>
              <p className="mt-2 max-w-40 text-sm leading-5 font-medium text-[#667085]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const EvidenceSection = () => (
  <section className="overflow-hidden bg-white py-24">
    <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <h2 className="max-w-3xl text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
            Show the product doing the work
          </h2>
        </div>
        <p className="max-w-2xl text-lg leading-8 text-[#667085]">
          Customers see one story three ways: the dashboard steering work, the
          website widget answering on-site, and voice handoff preserving
          context.
        </p>
      </div>
      <div className="mt-12 grid border-y border-[#101828]/12 lg:grid-cols-3">
        {evidenceSlots.map((slot, index) => (
          <article
            className="osonflow-evidence-item group border-b border-[#101828]/12 py-8 lg:border-r lg:border-b-0 lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            key={slot.title}
          >
            <div className="osonflow-evidence-frame relative aspect-[1.28] overflow-hidden rounded-lg border border-[#101828]/12 bg-[#F7F8F5]">
              {slot.imageSrc ? (
                <Image
                  alt={slot.title}
                  className="size-full object-cover"
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  src={slot.imageSrc}
                />
              ) : (
                <EvidenceMockup index={index} />
              )}
            </div>
            <div className="mt-6 flex items-start justify-between gap-5">
              <div>
                <h3 className="text-2xl leading-7 font-semibold text-[#101828]">
                  {slot.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-[#667085]">
                  {slot.description}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-[#98A2B3]">
                0{index + 1}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
)

const EvidenceMockup = ({ index }: { index: number }) => {
  if (index === 1) {
    return (
      <div className="absolute inset-0 bg-[#EEF3FF] p-5">
        <div className="h-full rounded-md bg-white p-4 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.65)]">
          <div className="osonflow-skeleton-line mb-5 h-5 w-28 rounded-full bg-[#101828]" />
          <div className="grid h-[calc(100%-2rem)] grid-cols-[1fr_9rem] gap-4">
            <div className="space-y-3">
              <div className="osonflow-skeleton-line h-20 rounded-sm bg-[#DDE7FF]" />
              <div className="osonflow-skeleton-line h-12 rounded-sm bg-[#F7F8F5]" />
              <div className="osonflow-skeleton-line h-12 rounded-sm bg-[#F7F8F5]" />
            </div>
            <div className="mt-auto rounded-lg border border-[#101828]/12 bg-white p-3">
              <div className="mb-3 flex items-center gap-2">
                <BotIcon className="size-4 text-[#235BDB]" />
                <span className="osonflow-skeleton-line h-2 w-16 rounded-full bg-[#101828]" />
              </div>
              <div className="space-y-2">
                <div className="osonflow-skeleton-line h-10 rounded-md bg-[#F7F8F5]" />
                <div className="osonflow-skeleton-line ml-auto h-9 w-24 rounded-md bg-[#235BDB]" />
                <div className="osonflow-skeleton-line h-8 rounded-md border border-[#101828]/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (index === 2) {
    return (
      <div className="absolute inset-0 bg-[#101828] p-5 text-white">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/14 pb-4">
            <div>
              <div className="osonflow-skeleton-line h-3 w-28 rounded-full bg-white" />
              <div className="osonflow-skeleton-line mt-2 h-2 w-20 rounded-full bg-white/32" />
            </div>
            <div className="osonflow-voice-orb flex size-12 items-center justify-center rounded-full bg-[#92F2B8] text-[#101828]">
              <Mic2Icon className="size-5" />
            </div>
          </div>
          <div className="space-y-4">
            {[72, 44, 88].map((width) => (
              <div className="flex items-center gap-3" key={width}>
                <span className="osonflow-wave-dot size-2 rounded-full bg-[#92F2B8]" />
                <span
                  className="osonflow-wave-line h-3 rounded-full bg-white/72"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-white/14 pt-4">
            {["Intent", "Tone", "Next"].map((label) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-white/40">
                  {label}
                </p>
                <div className="osonflow-skeleton-line mt-2 h-2 rounded-full bg-white/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-white">
      <div className="grid h-full grid-cols-[7rem_1fr]">
        <div className="border-r border-[#101828]/10 bg-[#F4F6F8] p-4">
          <div className="h-3 w-16 rounded-full bg-[#101828]" />
          <div className="mt-7 space-y-4">
            {[100, 70, 82, 58].map((width) => (
              <div
                className="osonflow-skeleton-line h-2 rounded-full bg-[#667085]/34"
                key={width}
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-rows-[auto_1fr]">
          <div className="grid grid-cols-3 border-b border-[#101828]/10">
            {["94%", "42s", "12"].map((value) => (
              <div
                className="border-r border-[#101828]/10 p-4 last:border-r-0"
                key={value}
              >
                <p className="text-2xl font-semibold text-[#101828]">{value}</p>
                <div className="osonflow-skeleton-line mt-2 h-2 rounded-full bg-[#CBD5E1]" />
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="osonflow-dashboard-screen mb-4 h-28 rounded-sm bg-[#101828]" />
            <div className="space-y-3">
              <div className="osonflow-skeleton-line h-9 rounded-sm bg-[#EFF4FF]" />
              <div className="osonflow-skeleton-line h-9 rounded-sm bg-[#F7F8F5]" />
              <div className="osonflow-skeleton-line h-9 rounded-sm bg-[#F7F8F5]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LoopSection = () => (
  <section className="relative overflow-hidden bg-[#F7F8F5] py-24">
    <div className="osonflow-ruled absolute inset-0" />
    <div className="relative mx-auto max-w-[88rem] px-5 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div className="max-w-xl">
          <h2 className="text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
            One operating loop, not five disconnected tools
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#667085]">
            Osonflow keeps the customer-facing assistant, the agent inbox, and
            the improvement loop in the same mental model.
          </p>
        </div>
        <div className="grid border-t border-[#101828]/12 lg:grid-cols-3 lg:border-t-0 lg:border-l">
          {loopSteps.map(({ title, description, icon: Icon }, index) => (
            <article
              className="osonflow-loop-step border-b border-[#101828]/12 px-0 py-8 lg:border-r lg:border-b-0 lg:px-8 lg:last:border-r-0"
              key={title}
            >
              <div className="mb-8 flex items-center justify-between">
                <Icon className="size-8 text-[#235BDB]" />
                <span className="font-mono text-sm font-semibold text-[#98A2B3]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-3xl leading-8 font-semibold text-[#101828]">
                {title}
              </h3>
              <p className="mt-4 text-base leading-7 text-[#667085]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const WorkspaceSection = () => (
  <section className="overflow-hidden bg-white py-24">
    <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
      <div className="mb-12 grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
        <h2 className="max-w-3xl text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
          See where support is leaking time
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-[#667085]">
          Analytics are attached to the real queue: unanswered questions,
          escalation reasons, sentiment, resolution source, and customer memory
          stay visible while the team works.
        </p>
      </div>
      <div className="osonflow-workspace-grid overflow-hidden rounded-lg border border-[#101828]/12 bg-[#101828] text-white shadow-[0_38px_110px_-68px_rgba(16,24,40,0.86)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/12 p-5 sm:p-7 lg:border-r lg:border-b-0">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">AI analytics</p>
                <p className="mt-1 text-xs text-white/54">Last 30 days</p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#92F2B8]">
                <TrendingUpIcon className="size-4" />
                Improving
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["1,248", "answered"],
                ["89%", "resolved"],
                ["312h", "saved"],
              ].map(([value, label]) => (
                <div
                  className="osonflow-analytics-stat border-t border-white/16 pt-4"
                  key={label}
                >
                  <p className="text-5xl leading-none font-semibold text-white">
                    {value}
                  </p>
                  <p className="mt-2 text-xs font-medium text-white/54">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10 h-52">
              <div className="flex h-full items-end gap-3 border-b border-l border-white/16 px-4 pt-4">
                {[38, 62, 44, 78, 66, 88, 72, 96].map((height, index) => (
                  <span
                    className={cn(
                      "osonflow-chart-bar block w-full rounded-t-sm",
                      index % 3 === 0
                        ? "bg-[#92F2B8]"
                        : index % 3 === 1
                          ? "bg-[#78A6FF]"
                          : "bg-[#FFD978]"
                    )}
                    key={height}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white text-[#101828]">
            <div className="grid grid-cols-[1fr_auto_auto] border-b border-[#101828]/10 px-5 py-4 text-xs font-semibold text-[#667085] sm:px-7">
              <span>Topic</span>
              <span>Status</span>
              <span className="pl-6">Time</span>
            </div>
            <div className="divide-y divide-[#101828]/10">
              {insightRows.map(([topic, status, time, tone]) => (
                <div
                  className="osonflow-insight-row grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-5 text-sm sm:px-7"
                  key={topic}
                >
                  <span className="font-semibold">{topic}</span>
                  <span
                    className={cn("rounded-full px-3 py-1 font-semibold", tone)}
                  >
                    {status}
                  </span>
                  <span className="font-semibold text-[#667085]">{time}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#101828]/10 bg-[#F7F8F5] px-5 py-6 sm:px-7">
              <div className="flex items-start gap-3">
                <BrainCircuitIcon className="mt-1 size-5 text-[#235BDB]" />
                <p className="text-sm leading-6 text-[#475467]">
                  The queue learns from every unresolved question, then points
                  your team at the exact source that needs a better answer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const AutomationSection = () => (
  <section className="relative overflow-hidden bg-[#0D1118] py-24 text-white">
    <div className="osonflow-dark-lines absolute inset-0" />
    <div className="relative mx-auto grid max-w-[88rem] gap-12 px-5 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
      <div className="max-w-2xl">
        <h2 className="text-5xl leading-none font-semibold text-white sm:text-6xl">
          Automations with a human-shaped safety net
        </h2>
        <p className="mt-6 text-lg leading-8 text-white/66">
          Route repetitive questions, draft answers, and surface urgent work
          while keeping your team in control of edge cases.
        </p>
        <Button
          asChild
          className="mt-8 h-12 rounded-full bg-white px-5 text-base font-semibold text-[#101828] hover:bg-white/90"
        >
          <Link href="/automation">
            Explore automation
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <div className="osonflow-automation-panel overflow-hidden rounded-lg border border-white/14">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] border-b border-white/14 px-4 py-3 text-xs font-semibold text-white/50 sm:px-5">
          <span>Signal</span>
          <span />
          <span>Route</span>
          <span>State</span>
        </div>
        <div className="divide-y divide-white/14">
          {automationRows.map(({ from, route, state, icon: Icon }) => (
            <div
              className="osonflow-automation-row grid gap-4 px-4 py-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center sm:px-5"
              key={from}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5 text-[#92F2B8]" />
                <span className="font-semibold text-white">{from}</span>
              </div>
              <ChevronRightIcon className="hidden size-4 text-white/34 sm:block" />
              <span className="text-white/72">{route}</span>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#101828]">
                {state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const ChannelsSection = () => (
  <section className="relative overflow-hidden bg-[#F7F8F5] py-24">
    <div className="osonflow-ruled absolute inset-0 opacity-60" />
    <div className="relative mx-auto grid max-w-[88rem] gap-14 px-5 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
      <div className="max-w-2xl">
        <h2 className="text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
          Route every customer channel into one desk
        </h2>
        <p className="mt-6 text-lg leading-8 text-[#667085]">
          Osonflow keeps website chat, messaging apps, model providers, and
          voice support moving through the same memory, queue, and handoff
          rules.
        </p>
        <div className="mt-8 border-y border-[#101828]/12">
          {channelCapabilities.map(({ label, icon: Icon }) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-[#101828]/12 py-4 last:border-b-0"
              key={label}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5 text-[#235BDB]" />
                <span className="text-sm font-semibold text-[#344054]">
                  {label}
                </span>
              </div>
              <span className="text-sm font-medium text-[#667085]">
                lands in one timeline
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="osonflow-channel-router overflow-hidden rounded-lg border border-[#101828]/12 bg-white shadow-[0_32px_100px_-72px_rgba(15,23,42,0.7)]">
        <div className="grid gap-5 border-b border-[#101828]/10 bg-[#101828] p-5 text-white sm:grid-cols-[0.72fr_1.28fr] sm:items-center">
          <div>
            <p className="text-sm font-semibold">Inbound signals</p>
            <p className="mt-1 text-xs text-white/54">
              One router for chat, messaging, voice, and API events
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {channelLogos.map((logo) => (
              <div
                className="osonflow-channel-logo inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"
                key={logo.label}
              >
                <Image
                  alt={`${logo.label} logo`}
                  className="size-6 rounded-full object-contain"
                  height={24}
                  src={logo.src}
                  width={24}
                />
                <span className="text-xs font-semibold text-white/78">
                  {logo.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#101828]/10">
          {channelRoutes.map(
            ({ source, signal, route, destination, icon: Icon, tone }) => (
              <div
                className="osonflow-channel-route grid gap-4 px-5 py-5 md:grid-cols-[0.9fr_auto_1fr_auto] md:items-center"
                key={source}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-1 size-5", tone)} />
                  <div>
                    <p className="text-base font-semibold text-[#101828]">
                      {source}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#667085]">
                      {signal}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="hidden size-4 text-[#98A2B3] md:block" />
                <div className="border-l border-[#101828]/10 pl-4 md:border-l-0 md:pl-0">
                  <p className="text-sm font-semibold text-[#101828]">
                    {route}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#667085]">
                    Memory, confidence, and routing policy attached
                  </p>
                </div>
                <span className="w-fit rounded-full bg-[#F1F4F8] px-3 py-1 text-xs font-semibold text-[#344054]">
                  {destination}
                </span>
              </div>
            )
          )}
        </div>

        <div className="grid border-t border-[#101828]/10 bg-[#F7F8F5] md:grid-cols-3">
          {[
            "Shared customer memory",
            "Priority queue",
            "Channel analytics",
          ].map((label) => (
            <div
              className="osonflow-channel-footer-cell border-b border-[#101828]/10 px-5 py-4 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
              key={label}
            >
              <p className="text-sm font-semibold text-[#101828]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const PricingSection = () => (
  <section className="bg-white py-24">
    <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
      <div className="mb-12 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <h2 className="max-w-3xl text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
          Plans that scale with support complexity
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-[#667085]">
          Start with the widget and inbox, then add automation, voice,
          analytics, and custom integrations when your team is ready.
        </p>
      </div>
      <div className="osonflow-pricing-matrix overflow-x-auto rounded-lg border border-[#101828]/12">
        <div className="grid min-w-[720px] grid-cols-[1fr_repeat(3,minmax(8rem,0.72fr))] border-b border-[#101828]/12 bg-[#F7F8F5]">
          <div className="px-4 py-5 text-sm font-semibold text-[#667085] sm:px-6">
            Capability
          </div>
          {pricingPlans.map((plan) => (
            <div
              className={cn(
                "osonflow-plan-head border-l border-[#101828]/12 px-4 py-5 sm:px-6",
                plan.featured && "bg-[#101828] text-white"
              )}
              key={plan.name}
            >
              <p className="text-2xl font-semibold">{plan.name}</p>
              <p
                className={cn(
                  "mt-3 text-4xl leading-none font-semibold",
                  plan.featured ? "text-white" : "text-[#101828]"
                )}
              >
                {plan.price}
              </p>
            </div>
          ))}
        </div>
        <div className="divide-y divide-[#101828]/10">
          {pricingRows.map(([label, launch, scale, custom]) => (
            <div
              className="osonflow-pricing-row grid min-w-[720px] grid-cols-[1fr_repeat(3,minmax(8rem,0.72fr))]"
              key={label}
            >
              <div className="px-4 py-4 text-sm font-semibold text-[#344054] sm:px-6">
                {label}
              </div>
              {[launch, scale, custom].map((included, index) => (
                <div
                  className="flex items-center border-l border-[#101828]/10 px-4 py-4 sm:px-6"
                  key={`${label}-${index}`}
                >
                  {included ? (
                    <CheckIcon className="size-5 text-[#16A163]" />
                  ) : (
                    <span className="h-px w-5 bg-[#CBD5E1]" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="grid min-w-[720px] grid-cols-[1fr_repeat(3,minmax(8rem,0.72fr))] border-t border-[#101828]/12">
          <div className="px-4 py-5 sm:px-6" />
          {pricingPlans.map((plan) => (
            <div
              className="border-l border-[#101828]/10 px-4 py-5 sm:px-6"
              key={plan.cta}
            >
              <Button
                asChild
                className={cn(
                  "h-11 w-full rounded-full text-sm font-semibold",
                  plan.featured
                    ? "bg-[#101828] text-white hover:bg-[#1D2939]"
                    : "bg-white text-[#101828] hover:bg-[#F7F8F5]"
                )}
                variant={plan.featured ? "default" : "outline"}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const HomeCta = () => (
  <section className="osonflow-launch-section relative overflow-hidden bg-[#0D1118] py-24 text-white">
    <div className="osonflow-dark-lines absolute inset-0" />
    <div className="relative mx-auto grid max-w-[88rem] gap-12 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-3">
          <Image
            alt="Osonflow logo"
            className="h-9 w-auto"
            height={40}
            src="/logo.svg"
            width={70}
          />
          <span className="text-2xl font-semibold text-white">Osonflow</span>
        </div>
        <h2 className="mt-8 max-w-3xl text-5xl leading-none font-semibold text-white sm:text-6xl">
          Launch a support desk customers feel on day one
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66">
          Add the widget, load your best answers, and let Osonflow handle the
          first response while your team keeps control of the moments that need
          judgment.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            className="h-13 rounded-full bg-white px-6 text-base font-semibold text-[#101828] hover:bg-white/90"
          >
            <Link href="/sign-up">
              Start free
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            className="h-13 rounded-full border-white/18 bg-white/8 px-6 text-base font-semibold text-white hover:bg-white/14"
            variant="outline"
          >
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </div>

      <div className="osonflow-launch-console overflow-hidden rounded-lg border border-white/14 bg-white/[0.03]">
        <div className="grid border-b border-white/14 sm:grid-cols-3">
          {["Day 1", "Week 1", "Always"].map((label) => (
            <div
              className="osonflow-launch-tab border-b border-white/14 px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
              key={label}
            >
              <p className="font-mono text-xs font-semibold text-[#92F2B8]">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="divide-y divide-white/14">
          {launchSteps.map(({ title, description, icon: Icon }, index) => (
            <div
              className="osonflow-launch-step grid gap-4 px-5 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              key={title}
            >
              <div className="osonflow-launch-icon flex size-12 items-center justify-center rounded-full bg-white text-[#101828]">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {description}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-white/34">
                0{index + 1}
              </span>
            </div>
          ))}
        </div>
        <div className="grid gap-4 border-t border-white/14 bg-white px-5 py-5 text-[#101828] sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-semibold">Ready for live handoff</p>
            <p className="mt-1 text-sm text-[#667085]">
              Chat, voice, memory, routing, and analytics are part of the same
              launch path.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0B6B3A]">
            <span className="osonflow-online-dot size-2.5 rounded-full bg-[#16A163]" />
            Online
          </div>
        </div>
      </div>
    </div>
  </section>
)
