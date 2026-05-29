import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  BellRingIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckIcon,
  ChevronRightIcon,
  DatabaseZapIcon,
  FileTextIcon,
  GaugeIcon,
  HeadphonesIcon,
  MessageCircleMoreIcon,
  PhoneCallIcon,
  RadioTowerIcon,
  RouteIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { LandingNav } from "./landing-nav"
import { channelLogos } from "./marketing-components"

type IconCard = {
  title: string
  description: string
  icon: LucideIcon
  tone: string
}

const queueRows = [
  {
    customer: "Amina",
    issue: "Upgrade before renewal",
    intent: "Billing",
    state: "AI ready",
    tone: "bg-[#b7ff5a] text-[#11150f]",
  },
  {
    customer: "Bekzod",
    issue: "Payment failed twice",
    intent: "Risk",
    state: "Human",
    tone: "bg-[#ffcc11] text-[#17110a]",
  },
  {
    customer: "Maya",
    issue: "Need export invoice",
    intent: "Docs",
    state: "Sent",
    tone: "bg-[#dbe7ff] text-[#102045]",
  },
]

const heroMetrics = [
  ["18", "live threads"],
  ["42s", "median first reply"],
  ["94%", "answer confidence"],
]

const operatingCards: IconCard[] = [
  {
    title: "One customer timeline",
    description:
      "Chat, voice, messaging, files, and human notes stay attached to the same customer record.",
    icon: MessageCircleMoreIcon,
    tone: "bg-[#e8f3ff] text-[#2563eb]",
  },
  {
    title: "Answers with receipts",
    description:
      "The assistant drafts from your uploaded policies, pages, help articles, and product context.",
    icon: FileTextIcon,
    tone: "bg-[#e9ffe8] text-[#15803d]",
  },
  {
    title: "Judgment stays human",
    description:
      "Urgent, sensitive, or low-confidence moments move to people with a clean brief.",
    icon: HeadphonesIcon,
    tone: "bg-[#fff3c4] text-[#8a5b00]",
  },
  {
    title: "Every miss becomes signal",
    description:
      "Unanswered questions surface as source gaps, workflow ideas, and customer-risk patterns.",
    icon: BrainCircuitIcon,
    tone: "bg-[#ffe8f6] text-[#df37a7]",
  },
]

const routeSteps = [
  {
    title: "Capture",
    description: "Website widget, voice, and messaging apps enter one queue.",
    icon: RadioTowerIcon,
  },
  {
    title: "Understand",
    description:
      "Intent, sentiment, account history, and confidence are scored.",
    icon: SearchIcon,
  },
  {
    title: "Resolve or route",
    description:
      "AI replies when it should; humans get the thread when it matters.",
    icon: RouteIcon,
  },
  {
    title: "Improve",
    description: "New gaps feed the knowledge base and routing rules.",
    icon: DatabaseZapIcon,
  },
]

const automationRows = [
  ["Payment failed", "Create priority handoff", "Owner: billing"],
  ["Refund policy missing", "Open source gap", "Owner: content"],
  ["Voice escalation", "Start realtime assistant", "Owner: support"],
  ["VIP account", "Notify team channel", "Owner: success"],
]

const pricingPlans = [
  {
    name: "Launch",
    price: "$29",
    description: "For teams replacing a static chat widget with AI support.",
    features: ["Website widget", "Knowledge uploads", "Shared inbox"],
  },
  {
    name: "Scale",
    price: "$79",
    description: "For teams adding routing, voice, analytics, and memory.",
    features: ["Everything in Launch", "Automation rules", "Voice support"],
    featured: true,
  },
  {
    name: "Custom",
    price: "Talk",
    description: "For teams with deeper integrations or compliance needs.",
    features: ["Dedicated onboarding", "Custom integrations", "SLA planning"],
  },
]

const trustItems = [
  { label: "Source-grounded replies", icon: ShieldCheckIcon },
  { label: "Human handoff rules", icon: WorkflowIcon },
  { label: "Voice-ready support", icon: PhoneCallIcon },
]

const footerLinks = [
  ["Product", "/product"],
  ["Automation", "/automation"],
  ["Integrations", "/channels"],
  ["Pricing", "/pricing"],
  ["Login", "/sign-in"],
] satisfies Array<[string, string]>

export const HomeLandingPage = () => (
  <main className="osonflow-command-page min-h-screen bg-[#080b0f] text-[#f8f3ea]">
    <LandingNav />
    <HeroSection />
    <SignalStrip />
    <OperatingSection />
    <CommandSection />
    <RoutingSection />
    <PricingSection />
    <FinalCta />
    <HomeFooter />
  </main>
)

const PrimaryCta = ({
  children,
  href,
  inverted = false,
}: {
  children: React.ReactNode
  href: string
  inverted?: boolean
}) => (
  <Button
    asChild
    className={cn(
      "h-12 rounded-[4px] px-5 text-base font-bold shadow-[rgba(255,255,255,0.18)_0_0_0_1px_inset,rgba(0,0,0,0.12)_0_10px_26px_-18px] transition hover:-translate-y-0.5",
      inverted
        ? "bg-[#f8f3ea] text-[#15120f] hover:bg-white"
        : "bg-[#df37a7] text-white hover:bg-[#d0339c]"
    )}
  >
    <Link href={href}>
      {children}
      <ArrowRightIcon data-icon="inline-end" />
    </Link>
  </Button>
)

const SecondaryCta = ({
  children,
  href,
}: {
  children: React.ReactNode
  href: string
}) => (
  <Button
    asChild
    className="h-12 rounded-[6px] border-[#f8f3ea]/30 bg-transparent px-5 text-base font-bold text-[#f8f3ea] hover:bg-white/8"
    variant="outline"
  >
    <Link href={href}>
      {children}
      <ChevronRightIcon data-icon="inline-end" />
    </Link>
  </Button>
)

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="inline-flex w-fit items-center gap-2 rounded-full border border-current/14 px-3 py-1.5 text-sm font-bold tracking-normal">
    <SparklesIcon className="size-4 text-[#df37a7]" />
    {children}
  </p>
)

const SectionIntro = ({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string
  title: string
  description: string
  dark?: boolean
}) => (
  <div className="max-w-3xl">
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2
      className={cn(
        "mt-5 text-4xl leading-[1.02] font-bold tracking-normal [text-wrap:balance] sm:text-5xl lg:text-[3.75rem]",
        dark ? "text-[#f8f3ea]" : "text-[#17120f]"
      )}
    >
      {title}
    </h2>
    <p
      className={cn(
        "mt-5 text-lg leading-8 [text-wrap:pretty]",
        dark ? "text-[#c9c0b7]" : "text-[#5b514b]"
      )}
    >
      {description}
    </p>
  </div>
)

const HeroSection = () => (
  <section className="osonflow-command-hero relative overflow-hidden border-b border-white/10">
    <div className="osonflow-command-grid absolute inset-0" />
    <div className="relative mx-auto grid max-w-[82rem] gap-10 px-5 pt-12 pb-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:pt-14">
      <div className="w-full max-w-[22rem] min-w-0 sm:max-w-3xl">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-bold text-[#f8f3ea] shadow-[rgba(255,255,255,0.08)_0_0_0_1px_inset] backdrop-blur">
          <BotIcon className="size-4 text-[#b7ff5a]" />
          <span className="truncate">
            AI support desk for live customer work
          </span>
        </div>

        <h1 className="mt-7 max-w-full text-[2.65rem] leading-[0.98] font-bold tracking-normal [text-wrap:balance] text-[#f8f3ea] sm:text-6xl lg:text-[4.8rem] xl:text-[5.15rem]">
          Osonflow AI support desk
        </h1>
        <p className="mt-6 max-w-[22rem] text-lg leading-8 [text-wrap:pretty] text-[#c9c0b7] sm:max-w-2xl sm:text-xl">
          Connect your widget, AI voice, knowledge base, and human queue into
          one operating layer that answers quickly and routes the moments that
          need judgment.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <PrimaryCta href="/sign-up">Start free</PrimaryCta>
          <SecondaryCta href="/product">See the product</SecondaryCta>
        </div>

        <div className="mt-8 grid max-w-[22rem] grid-cols-3 overflow-hidden border-y border-white/12 sm:max-w-xl">
          {heroMetrics.map(([value, label]) => (
            <div
              className="border-r border-white/12 py-4 pr-3 last:border-r-0 sm:px-4 sm:first:pl-0"
              key={label}
            >
              <p className="text-3xl leading-none font-bold text-[#f8f3ea]">
                {value}
              </p>
              <p className="mt-2 text-xs font-bold text-[#8d8580] sm:text-sm">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <HeroConsole />
    </div>
  </section>
)

const HeroConsole = () => (
  <div className="osonflow-console-wrap relative w-full max-w-[22rem] min-w-0 sm:max-w-none">
    <div className="absolute -inset-5 rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(223,55,167,0.32),transparent_34%),radial-gradient(circle_at_75%_8%,rgba(183,255,90,0.18),transparent_30%)] blur-2xl" />
    <div className="relative max-h-40 overflow-hidden rounded-[18px] border border-white/14 bg-[#111820] shadow-[0_38px_120px_-70px_rgba(0,0,0,0.95)] sm:max-h-none">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#ff6b6b]" />
          <span className="size-2.5 rounded-full bg-[#ffcc11]" />
          <span className="size-2.5 rounded-full bg-[#b7ff5a]" />
        </div>
        <p className="truncate text-xs font-bold text-[#8d98a8]">
          live-support.osonflow
        </p>
      </div>

      <div className="grid min-h-[510px] lg:grid-cols-[13rem_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#0c1118] p-4 lg:block">
          <div className="flex items-center gap-2 text-sm font-bold text-[#f8f3ea]">
            <span className="osonflow-status-dot size-2.5 rounded-full bg-[#b7ff5a]" />
            Command live
          </div>
          <div className="mt-7 space-y-2">
            {["Inbox", "AI replies", "Voice", "Memory", "Gaps"].map(
              (item, index) => (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-[8px] px-3 py-2.5 text-sm font-bold",
                    index === 0
                      ? "bg-[#f8f3ea] text-[#15120f]"
                      : "text-[#8d98a8]"
                  )}
                  key={item}
                >
                  {item}
                  {index === 0 ? (
                    <span className="rounded-full bg-[#df37a7] px-2 py-0.5 text-xs text-white">
                      18
                    </span>
                  ) : null}
                </div>
              )
            )}
          </div>
        </aside>

        <div className="grid min-w-0 md:grid-cols-[0.92fr_1.08fr]">
          <section className="border-b border-white/10 md:border-r md:border-b-0">
            <div className="border-b border-white/10 p-5">
              <p className="text-base font-bold text-[#f8f3ea]">
                Priority queue
              </p>
              <p className="mt-1 text-sm leading-5 text-[#8d98a8]">
                Sorted by urgency, revenue, sentiment, and AI confidence.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {queueRows.map((row, index) => (
                <div
                  className={cn("p-5", index === 0 && "bg-[#df37a7]/[0.08]")}
                  key={row.customer}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#f8f3ea]">{row.customer}</p>
                      <p className="mt-1 text-xs font-bold text-[#8d98a8]">
                        {row.intent}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        row.tone
                      )}
                    >
                      {row.state}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-sm text-[#c9c0b7]">
                    {row.issue}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              {[
                ["312h", "saved"],
                ["89%", "resolved"],
                ["12", "gaps"],
              ].map(([value, label]) => (
                <div
                  className="border-r border-white/10 p-4 last:border-r-0"
                  key={label}
                >
                  <p className="text-2xl leading-none font-bold text-[#f8f3ea]">
                    {value}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#8d98a8]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-[420px] flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <p className="font-bold text-[#f8f3ea]">Amina Abdullaeva</p>
                <p className="mt-1 text-sm text-[#8d98a8]">
                  Customer memory loaded
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#b7ff5a] px-3 text-sm font-bold text-[#11150f]"
                type="button"
              >
                <PhoneCallIcon className="size-4" />
                Call
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="max-w-[82%] rounded-[12px] bg-white/[0.08] px-4 py-3 text-sm leading-6 text-[#d8d0c8]">
                Can I change my plan today and keep the same billing cycle?
              </div>
              <div className="ml-auto max-w-[88%] rounded-[12px] bg-[#df37a7] px-4 py-3 text-sm leading-6 text-white">
                Yes. The cycle stays the same and the difference is prorated
                automatically.
              </div>
              <div className="rounded-[12px] border border-[#b7ff5a]/40 bg-[#b7ff5a]/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#b7ff5a]">
                  <ZapIcon className="size-4" />
                  Suggested next action
                </div>
                <p className="mt-2 text-sm leading-6 text-[#d8d0c8]">
                  Send upgrade link, mention prorated billing, and monitor the
                  account if payment fails.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 rounded-[8px] border border-white/12 bg-[#0c1118] px-3 py-2">
                <span className="flex-1 truncate text-sm text-[#8d98a8]">
                  Reply with AI assistance...
                </span>
                <span className="flex size-9 items-center justify-center rounded-[4px] bg-[#df37a7] text-white">
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
  <section className="border-b border-white/10 bg-[#0c1118]">
    <div className="mx-auto grid max-w-[82rem] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
      <div>
        <p className="text-2xl leading-tight font-bold [text-wrap:balance] text-[#f8f3ea]">
          The support stack your customers already touch, pulled into one view.
        </p>
      </div>
      <div className="min-w-0 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.04]">
        <div className="osonflow-command-marquee flex w-max gap-3 px-3 py-3">
          {[...channelLogos, ...channelLogos].map((logo, index) => (
            <div
              className="flex h-16 w-44 shrink-0 items-center justify-center gap-3 rounded-[10px] bg-[#f8f3ea] px-4 text-[#17120f]"
              key={`${logo.label}-${index}`}
            >
              <Image
                alt={`${logo.label} logo`}
                className="size-8 rounded-full object-contain"
                height={32}
                src={logo.src}
                width={32}
              />
              <span className="text-sm font-bold">{logo.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const OperatingSection = () => (
  <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
    <div className="mx-auto max-w-[82rem] px-5 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <SectionIntro
          description="Osonflow is designed around the real support loop: capture the question, find trusted context, answer when confidence is high, and hand off with history when it is not."
          eyebrow="Operating model"
          title="A support workflow that does not split AI from people."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {trustItems.map(({ label, icon: Icon }) => (
            <div
              className="rounded-[12px] bg-white px-4 py-4 shadow-[0_0_0_1px_rgba(23,18,15,0.08)]"
              key={label}
            >
              <Icon className="mb-3 size-5 text-[#df37a7]" />
              <p className="text-sm font-bold text-[#17120f]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-4">
        {operatingCards.map(({ title, description, icon: Icon, tone }) => (
          <article
            className="rounded-[14px] bg-white p-6 shadow-[0_0_0_1px_rgba(23,18,15,0.08),0_20px_60px_-52px_rgba(23,18,15,0.45)]"
            key={title}
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-[8px]",
                tone
              )}
            >
              <Icon className="size-5" />
            </span>
            <h3 className="mt-6 text-xl leading-tight font-bold text-[#17120f]">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#5b514b]">
              {description}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
)

const CommandSection = () => (
  <section className="relative overflow-hidden bg-[#111820] py-24">
    <div className="osonflow-command-grid absolute inset-0 opacity-50" />
    <div className="relative mx-auto grid max-w-[82rem] gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
      <SectionIntro
        dark
        description="Managers see workload, AI quality, source gaps, and escalation health in the same field of view, so support improvement stops hiding inside individual threads."
        eyebrow="Live command"
        title="See the queue, the answer, and the fix in one place."
      />

      <div className="overflow-hidden rounded-[18px] border border-white/12 bg-[#080b0f] shadow-[0_36px_110px_-74px_rgba(0,0,0,0.95)]">
        <div className="grid border-b border-white/10 sm:grid-cols-4">
          {[
            ["1,248", "answered"],
            ["89%", "resolved"],
            ["4.8x", "faster"],
            ["27", "risk flags"],
          ].map(([value, label]) => (
            <div
              className="border-b border-white/10 p-5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
              key={label}
            >
              <p className="text-4xl leading-none font-bold text-[#f8f3ea]">
                {value}
              </p>
              <p className="mt-2 text-xs font-bold text-[#8d98a8]">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#f8f3ea]">Resolution trend</p>
                <p className="mt-1 text-sm text-[#8d98a8]">
                  AI, human, and source-gap outcomes
                </p>
              </div>
              <GaugeIcon className="size-5 text-[#b7ff5a]" />
            </div>
            <div className="flex h-72 items-end gap-3 border-b border-l border-white/14 px-3 pt-5">
              {[42, 64, 48, 78, 58, 88, 72, 96, 82].map((height, index) => (
                <span
                  className={cn(
                    "block w-full rounded-t-[4px]",
                    index % 3 === 0
                      ? "bg-[#df37a7]"
                      : index % 3 === 1
                        ? "bg-[#b7ff5a]"
                        : "bg-[#dbe7ff]"
                  )}
                  key={`${height}-${index}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[14px] bg-[#f8f3ea] text-[#17120f]">
            {[
              ["Billing change", "AI resolved", "42s"],
              ["Payment failure", "Human priority", "2m"],
              ["Voice request", "Live call", "Now"],
              ["Refund policy", "Missing source", "New"],
            ].map(([topic, status, time]) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#17120f]/10 px-4 py-4 last:border-b-0"
                key={topic}
              >
                <div>
                  <p className="text-sm font-bold text-[#17120f]">{topic}</p>
                  <p className="mt-1 text-xs font-bold text-[#6b625d]">
                    {status}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#df37a7]">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
)

const RoutingSection = () => (
  <section className="bg-[#f8f3ea] py-24 text-[#17120f]">
    <div className="mx-auto grid max-w-[82rem] gap-12 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      <div>
        <SectionIntro
          description="The page is not a pile of channels. It is one routing system where every input gets understood, assigned, and improved."
          eyebrow="Routing"
          title="From first message to better source material."
        />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <PrimaryCta href="/automation">Explore automation</PrimaryCta>
        </div>
      </div>

      <div className="grid gap-4">
        {routeSteps.map(({ title, description, icon: Icon }, index) => (
          <article
            className="grid gap-4 rounded-[14px] bg-white p-5 shadow-[0_0_0_1px_rgba(23,18,15,0.08)] sm:grid-cols-[auto_1fr_auto] sm:items-center"
            key={title}
          >
            <span className="flex size-12 items-center justify-center rounded-[8px] bg-[#111820] text-[#b7ff5a]">
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="text-2xl font-bold text-[#17120f]">{title}</h3>
              <p className="mt-1 text-base leading-7 text-[#5b514b]">
                {description}
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-[#b8aea6]">
              0{index + 1}
            </span>
          </article>
        ))}
      </div>
    </div>

    <div className="mx-auto mt-16 max-w-[82rem] px-5 sm:px-8">
      <div className="overflow-hidden rounded-[18px] bg-[#111820] text-[#f8f3ea] shadow-[0_30px_90px_-70px_rgba(0,0,0,0.8)]">
        <div className="grid border-b border-white/10 px-5 py-4 text-xs font-bold text-[#8d98a8] sm:grid-cols-[1fr_1fr_1fr]">
          <span>Signal</span>
          <span className="hidden sm:block">Action</span>
          <span className="hidden sm:block">Owner</span>
        </div>
        <div className="divide-y divide-white/10">
          {automationRows.map(([signal, action, owner]) => (
            <div
              className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_1fr_1fr] sm:items-center"
              key={signal}
            >
              <div className="flex items-center gap-3">
                <BellRingIcon className="size-5 text-[#ffcc11]" />
                <span className="font-bold text-[#f8f3ea]">{signal}</span>
              </div>
              <span className="text-[#c9c0b7]">{action}</span>
              <span className="w-fit rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-[#b7ff5a]">
                {owner}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

const PricingSection = () => (
  <section className="bg-[#080b0f] py-24 text-[#f8f3ea]">
    <div className="mx-auto max-w-[82rem] px-5 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <SectionIntro
          dark
          description="Start with the support surface you need today, then add automation, analytics, voice, and integrations as your queue grows."
          eyebrow="Plans"
          title="Pricing that scales with support complexity."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {heroMetrics.map(([value, label]) => (
            <div
              className="rounded-[12px] border border-white/10 bg-white/[0.04] p-4"
              key={label}
            >
              <p className="text-3xl font-bold text-[#f8f3ea]">{value}</p>
              <p className="mt-1 text-sm font-bold text-[#8d98a8]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {pricingPlans.map((plan) => (
          <article
            className={cn(
              "rounded-[16px] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
              plan.featured
                ? "bg-[#f8f3ea] text-[#17120f]"
                : "bg-white/[0.04] text-[#f8f3ea]"
            )}
            key={plan.name}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p
                  className={cn(
                    "mt-3 text-sm leading-6",
                    plan.featured ? "text-[#5b514b]" : "text-[#c9c0b7]"
                  )}
                >
                  {plan.description}
                </p>
              </div>
              {plan.featured ? (
                <span className="rounded-full bg-[#df37a7] px-3 py-1 text-xs font-bold text-white">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-8 text-5xl leading-none font-bold">{plan.price}</p>
            <div className="mt-8 space-y-3">
              {plan.features.map((feature) => (
                <div className="flex items-center gap-3 text-sm" key={feature}>
                  <CheckIcon
                    className={cn(
                      "size-4",
                      plan.featured ? "text-[#df37a7]" : "text-[#b7ff5a]"
                    )}
                  />
                  <span
                    className={
                      plan.featured ? "text-[#342c27]" : "text-[#ddd5cd]"
                    }
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            <Button
              asChild
              className={cn(
                "mt-8 h-11 w-full rounded-[4px] text-sm font-bold",
                plan.featured
                  ? "bg-[#17120f] text-white hover:bg-[#2c241f]"
                  : "bg-[#df37a7] text-white hover:bg-[#d0339c]"
              )}
            >
              <Link href="/sign-up">
                {plan.name === "Custom" ? "Book a demo" : `Start ${plan.name}`}
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </div>
  </section>
)

const FinalCta = () => (
  <section className="osonflow-command-final relative overflow-hidden py-24 text-[#17120f]">
    <div className="relative mx-auto grid max-w-[82rem] gap-10 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      <div>
        <Eyebrow>Ready when your queue is</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-5xl leading-[0.98] font-bold tracking-normal [text-wrap:balance] sm:text-6xl">
          Launch the support desk customers can feel immediately.
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5b514b]">
          Add the widget, load your best answers, and let Osonflow handle first
          response while your team owns the moments that need taste and care.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <PrimaryCta href="/sign-up">Start free</PrimaryCta>
          <Button
            asChild
            className="h-12 rounded-[6px] border-[#17120f]/20 bg-transparent px-5 text-base font-bold text-[#17120f] hover:bg-[#17120f]/6"
            variant="outline"
          >
            <Link href="/pricing">
              View plans
              <ChevronRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-[18px] bg-[#111820] p-5 text-[#f8f3ea] shadow-[0_28px_90px_-64px_rgba(23,18,15,0.65)]">
        <div className="grid gap-4">
          {routeSteps
            .slice(0, 3)
            .map(({ title, description, icon: Icon }, index) => (
              <div
                className="grid gap-4 border-b border-white/10 pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                key={title}
              >
                <span className="flex size-11 items-center justify-center rounded-[8px] bg-[#f8f3ea] text-[#17120f]">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-bold text-[#f8f3ea]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#c9c0b7]">
                    {description}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-[#b7ff5a]">
                  0{index + 1}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  </section>
)

const HomeFooter = () => (
  <footer className="border-t border-white/10 bg-[#080b0f] px-5 py-10 text-[#f8f3ea] sm:px-8">
    <div className="mx-auto flex max-w-[82rem] flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div>
        <Link className="inline-flex items-center gap-3" href="/">
          <Image
            alt="Osonflow logo"
            className="h-9 w-auto"
            height={40}
            src="/logo.svg"
            width={70}
          />
          <span className="text-2xl font-bold">Osonflow</span>
        </Link>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#8d98a8]">
          AI support, human handoff, voice, analytics, and customer memory in
          one operating layer.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-bold text-[#c9c0b7]">
        {footerLinks.map(([item, href]) => (
          <Link
            className="rounded-full px-3 py-2 hover:bg-white/8 hover:text-white"
            href={href}
            key={item}
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  </footer>
)
