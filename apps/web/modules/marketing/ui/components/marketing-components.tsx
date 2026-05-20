import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BellRingIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  Clock3Icon,
  DatabaseZapIcon,
  FileTextIcon,
  GaugeIcon,
  GitBranchIcon,
  Globe2Icon,
  HeadphonesIcon,
  Layers3Icon,
  LineChartIcon,
  LockKeyholeIcon,
  MessageCircleMoreIcon,
  MessageSquareTextIcon,
  Mic2Icon,
  PanelsTopLeftIcon,
  PhoneCallIcon,
  PlugZapIcon,
  RadioTowerIcon,
  SendIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
  WandSparklesIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { LandingNav } from "./landing-nav"
import { navItems } from "./marketing-nav-data"

export { LandingNav } from "./landing-nav"
export { navItems } from "./marketing-nav-data"

type MarketingFeature = {
  title: string
  description: string
  icon: LucideIcon
  accent: string
}

export const proofItems = [
  "Live chat",
  "AI voice",
  "Help center",
  "Human handoff",
]

export const channelLogos = [
  { label: "WhatsApp", src: "/whatsapp.png" },
  { label: "Telegram", src: "/telegram.png" },
  { label: "ChatGPT", src: "/logos/chatgpt-logo.png" },
  { label: "Gemini", src: "/logos/gemini-logo.png" },
  { label: "Vapi", src: "/vapi.jpg" },
]

export const featureCards: MarketingFeature[] = [
  {
    title: "Answers from your knowledge base",
    description:
      "Upload files and URLs, then let the assistant respond with grounded support instead of vague guesses.",
    icon: FileTextIcon,
    accent: "bg-[#E8F1FF] text-[#3A04FF]",
  },
  {
    title: "One inbox for every conversation",
    description:
      "Track unresolved chats, escalations, AI sessions, and customer context without switching tools.",
    icon: MessageSquareTextIcon,
    accent: "bg-[#EAF8EF] text-[#157A43]",
  },
  {
    title: "Voice when chat is not enough",
    description:
      "Connect realtime AI voice and phone support for customers who need a faster path to help.",
    icon: Mic2Icon,
    accent: "bg-[#FFF4D7] text-[#9B6800]",
  },
]

export const productHighlights: MarketingFeature[] = [
  {
    title: "Unified conversation timeline",
    description:
      "Every chat, voice call, AI reply, handoff, file citation, and customer note lands in one readable thread.",
    icon: PanelsTopLeftIcon,
    accent: "bg-[#E8F1FF] text-[#3A04FF]",
  },
  {
    title: "Customer memory that compounds",
    description:
      "Keep preferences, product context, prior issues, and support history ready before a teammate opens the inbox.",
    icon: DatabaseZapIcon,
    accent: "bg-[#EAF8EF] text-[#157A43]",
  },
  {
    title: "Analytics your team can act on",
    description:
      "Spot unresolved intents, escalation causes, sentiment shifts, and the exact content your AI needs next.",
    icon: LineChartIcon,
    accent: "bg-[#FFF4D7] text-[#9B6800]",
  },
]

export const automationHighlights: MarketingFeature[] = [
  {
    title: "Intent-aware routing",
    description:
      "Send billing, onboarding, technical, and renewal questions to the right AI flow or human queue.",
    icon: GitBranchIcon,
    accent: "bg-[#E8F1FF] text-[#3A04FF]",
  },
  {
    title: "Confidence controls",
    description:
      "Let AI answer only when confidence is high, then create a crisp handoff when the answer needs a person.",
    icon: GaugeIcon,
    accent: "bg-[#EAF8EF] text-[#157A43]",
  },
  {
    title: "Follow-up moments",
    description:
      "Trigger reminders, nudges, and sales handoffs from conversation intent without making agents babysit queues.",
    icon: BellRingIcon,
    accent: "bg-[#FFF4D7] text-[#9B6800]",
  },
]

export const integrationHighlights: MarketingFeature[] = [
  {
    title: "Chat channels",
    description:
      "Meet customers on website chat, WhatsApp, Telegram, and the channels they already trust.",
    icon: MessageCircleMoreIcon,
    accent: "bg-[#E8F1FF] text-[#3A04FF]",
  },
  {
    title: "Model providers",
    description:
      "Use best-fit AI across ChatGPT, Gemini, and realtime voice without exposing that complexity to customers.",
    icon: WandSparklesIcon,
    accent: "bg-[#EAF8EF] text-[#157A43]",
  },
  {
    title: "Voice stack",
    description:
      "Connect Vapi and voice assistants for high-urgency support where typing slows the customer down.",
    icon: RadioTowerIcon,
    accent: "bg-[#FFF4D7] text-[#9B6800]",
  },
]

export const workflowSteps = [
  {
    title: "Install the widget",
    description:
      "Add the script, choose channels, and match the launcher to your brand.",
  },
  {
    title: "Teach the assistant",
    description:
      "Index docs, FAQs, websites, policies, and product details in minutes.",
  },
  {
    title: "Resolve and learn",
    description:
      "Review analytics, unanswered questions, sentiment, and saved support time.",
  },
]

export const insightRows = [
  ["Billing question", "Resolved by AI", "42s"],
  ["Login issue", "Needs human", "2m"],
  ["Plan upgrade", "AI voice", "Live"],
]

export const pricingTiers = [
  {
    name: "Launch",
    price: "$29",
    description:
      "For teams replacing scattered chat widgets with one AI-ready support layer.",
    features: [
      "AI website widget",
      "Knowledge base uploads",
      "Shared inbox",
      "Basic analytics",
    ],
    cta: "Start Launch",
  },
  {
    name: "Scale",
    price: "$79",
    description:
      "For growing teams adding automation, customer memory, and more channels.",
    features: [
      "Everything in Launch",
      "Automation rules",
      "Voice support",
      "Advanced analytics",
    ],
    cta: "Start Scale",
    featured: true,
  },
  {
    name: "Custom",
    price: "Talk",
    description:
      "For teams with deeper routing, compliance, or high-volume voice requirements.",
    features: [
      "Dedicated onboarding",
      "Custom integrations",
      "SLA planning",
      "Priority support",
    ],
    cta: "Book custom demo",
  },
]

const securityItems: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Permissioned handoff", icon: ShieldCheckIcon },
  { label: "Private knowledge sources", icon: LockKeyholeIcon },
  { label: "Channel controls", icon: Settings2Icon },
]

const productSystemItems: Array<{
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    title: "AI answers",
    description: "Grounded replies with citations",
    icon: BotIcon,
  },
  {
    title: "Human handoff",
    description: "Priority, sentiment, and context",
    icon: HeadphonesIcon,
  },
  {
    title: "Learning loop",
    description: "Unanswered questions become roadmap",
    icon: Layers3Icon,
  },
]

export const Logo = ({ className }: { className?: string }) => (
  <Link
    className={cn("inline-flex shrink-0 items-center gap-2.5", className)}
    href="/"
  >
    <Image
      alt="Osonflow logo"
      className="h-9 w-auto"
      height={40}
      priority
      src="/logo.svg"
      width={70}
    />
    <span className="hidden text-[1.35rem] leading-none font-semibold text-[#0A0A0A] sm:inline">
      Osonflow
    </span>
  </Link>
)

export const LiquidBackdrop = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 overflow-hidden",
      className
    )}
  >
    <div className="osonflow-liquid-field absolute inset-0" />
    <div className="osonflow-liquid-ribbon osonflow-liquid-ribbon-one" />
    <div className="osonflow-liquid-ribbon osonflow-liquid-ribbon-two" />
    <div className="osonflow-liquid-ribbon osonflow-liquid-ribbon-three" />
  </div>
)

export const SectionHeading = ({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) => (
  <div className={cn("flex max-w-3xl flex-col gap-5", className)}>
    <h2 className="text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
      {title}
    </h2>
    {description ? (
      <p className="max-w-2xl text-lg leading-8 text-[#667085]">
        {description}
      </p>
    ) : null}
  </div>
)

export const FeatureGrid = ({ features }: { features: MarketingFeature[] }) => (
  <div className="grid gap-4 sm:grid-cols-3">
    {features.map((feature) => (
      <article
        className="osonflow-reveal osonflow-liquid-card group rounded-[28px] p-5 transition duration-500 hover:-translate-y-1"
        key={feature.title}
      >
        <div
          className={cn(
            "mb-5 flex size-12 items-center justify-center rounded-2xl",
            feature.accent
          )}
        >
          <feature.icon className="size-5" />
        </div>
        <h3 className="text-xl leading-6 font-semibold text-[#101828]">
          {feature.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#667085]">
          {feature.description}
        </p>
        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-[#101828]/12 to-transparent" />
      </article>
    ))}
  </div>
)

export const HeroMockup = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={cn(
      "relative mx-auto w-full max-w-[640px]",
      compact && "max-w-[560px]"
    )}
  >
    <div className="absolute top-10 -left-5 hidden h-28 w-8 rounded-full bg-[#34D399] shadow-[0_24px_80px_rgba(52,211,153,0.28)] lg:block" />
    <div className="absolute -right-4 bottom-16 hidden h-36 w-7 rounded-full bg-[#FFCA3A] shadow-[0_24px_80px_rgba(255,202,58,0.24)] lg:block" />
    <div className="osonflow-float-card absolute -top-8 left-8 hidden rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.65)] backdrop-blur-xl lg:block">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#344054]">
        <WorkflowIcon className="size-4 text-[#3A04FF]" />
        Auto-routed to AI
      </div>
    </div>
    <div className="osonflow-glass-window relative overflow-hidden rounded-[30px] border border-white/70 bg-white/62 shadow-[0_38px_100px_-48px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-[#101828]/10 bg-white/76 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FFBD2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#F1F4F9]/90 px-3 py-1.5 text-xs font-medium text-[#667085]">
          <Clock3Icon className="size-3.5" />
          24/7 support desk
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-[0.9fr_1.25fr]",
          compact ? "min-h-[380px]" : "min-h-[430px]"
        )}
      >
        <aside className="border-b border-[#101828]/10 bg-white/74 p-4 backdrop-blur-xl md:border-r md:border-b-0">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#101828]">
              Priority queue
            </p>
            <span className="rounded-full bg-[#EAF8EF] px-2.5 py-1 text-xs font-medium text-[#157A43]">
              18 online
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              ["Amina", "Can I change my plan today?", "AI drafting"],
              ["Bekzod", "Payment failed on checkout", "Escalated"],
              ["Maya", "Where is my invoice?", "Resolved"],
            ].map(([name, message, status], index) => (
              <div
                className={cn(
                  "rounded-2xl border p-3 transition duration-300",
                  index === 0
                    ? "osonflow-active-thread border-[#3A04FF]/22 bg-[#F3F0FF]/88"
                    : "border-[#101828]/8 bg-white/74 hover:bg-white"
                )}
                key={name}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#101828]">{name}</p>
                  <span className="text-[11px] font-medium text-[#667085]">
                    {status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-[#667085]">
                  {message}
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex flex-col bg-[#FBFCFE]/70 backdrop-blur-xl">
          <div className="border-b border-[#101828]/10 bg-white/76 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#101828]">
                  Conversation with Amina
                </p>
                <p className="text-xs text-[#667085]">AI confidence: 94%</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[#101828] px-3 py-1.5 text-xs font-semibold text-white"
                type="button"
              >
                <PhoneCallIcon className="size-3.5" />
                Call
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="max-w-[82%] rounded-[18px] rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-[#344054] shadow-[0_18px_50px_-34px_rgba(15,23,42,0.5)]">
              Hi, can I change my plan and keep the same billing cycle?
            </div>
            <div className="osonflow-ai-message ml-auto max-w-[86%] rounded-[18px] rounded-tr-md bg-[#3A04FF] px-4 py-3 text-sm leading-relaxed text-white shadow-[0_18px_45px_-28px_rgba(58,4,255,0.8)]">
              Yes. Your billing cycle stays the same, and the difference is
              prorated automatically.
            </div>
            <div className="rounded-2xl border border-[#101828]/10 bg-white/82 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#101828]">
                <SparklesIcon className="size-4 text-[#3A04FF]" />
                Suggested next action
              </div>
              <p className="text-sm leading-relaxed text-[#667085]">
                Offer a direct upgrade link, mention prorated billing, and flag
                the account for follow-up if payment fails.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 rounded-2xl border border-[#101828]/10 bg-white/82 px-3 py-2 backdrop-blur-xl">
              <span className="flex-1 text-sm text-[#98A2B3]">
                Reply with AI assistance...
              </span>
              <span className="osonflow-send-button flex size-9 items-center justify-center rounded-xl bg-[#34D399] text-[#06351F]">
                <SendIcon className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export const AnalyticsPanel = () => (
  <div className="osonflow-reveal rounded-[30px] border border-white/70 bg-white/58 p-4 shadow-[0_30px_100px_-58px_rgba(15,23,42,0.58)] backdrop-blur-2xl">
    <div className="rounded-[24px] bg-[#101828] p-5 text-white">
      <div className="mb-7 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">AI analytics</p>
          <p className="mt-1 text-xs text-white/54">Last 30 days</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/74">
          <TrendingUpIcon className="size-3.5" />
          Improving
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["1,248", "answered"],
          ["89%", "resolved"],
          ["312h", "saved"],
        ].map(([value, label]) => (
          <div className="rounded-2xl bg-white/8 p-4" key={label}>
            <p className="text-3xl leading-none font-semibold">{value}</p>
            <p className="mt-2 text-xs font-medium text-white/54">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        {insightRows.map(([topic, status, time]) => (
          <div
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#101828]"
            key={topic}
          >
            <span className="font-semibold">{topic}</span>
            <span className="text-[#667085]">{status}</span>
            <span className="rounded-full bg-[#EAF8EF] px-2.5 py-1 text-xs font-semibold text-[#157A43]">
              {time}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const ChannelStrip = () => (
  <section className="border-b border-[#101828]/8 bg-white py-10">
    <div className="mx-auto grid max-w-7xl items-center gap-7 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
      <div>
        <p className="text-sm font-semibold text-[#101828]">
          Connect the channels already carrying your customer questions.
        </p>
        <p className="mt-1 text-sm text-[#667085]">
          Chat, voice, knowledge, and inbox intelligence in one support layer.
        </p>
      </div>
      <div className="osonflow-marquee-shell overflow-hidden rounded-[28px] border border-[#101828]/10 bg-[#F8FAFC]/72">
        <div className="osonflow-marquee-track flex w-max gap-3 px-3 py-3">
          {[...channelLogos, ...channelLogos].map((logo, index) => (
            <div
              className="flex h-16 w-40 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/82 px-4 shadow-[0_18px_52px_-44px_rgba(15,23,42,0.65)] backdrop-blur-xl"
              key={`${logo.label}-${index}`}
            >
              <Image
                alt={`${logo.label} logo`}
                className="size-7 rounded-full object-contain"
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
      </div>
    </div>
  </section>
)

export const MetricsBand = () => (
  <section className="bg-[#101828] py-6 text-white" id="product">
    <div className="mx-auto grid max-w-7xl gap-3 px-5 sm:px-8 md:grid-cols-3">
      {[
        ["72%", "fewer repeat questions"],
        ["4.8x", "faster first response"],
        ["24/7", "coverage across chat and voice"],
      ].map(([value, label]) => (
        <div
          className="osonflow-metric flex items-end justify-between gap-4 border-b border-white/14 py-6 md:border-r md:border-b-0 md:last:border-r-0"
          key={label}
        >
          <p className="text-5xl leading-none font-semibold text-white">
            {value}
          </p>
          <p className="max-w-36 text-sm leading-5 font-medium text-white/62">
            {label}
          </p>
        </div>
      ))}
    </div>
  </section>
)

export const WorkflowCards = () => (
  <div className="grid gap-4">
    {workflowSteps.map((step, index) => (
      <article
        className="osonflow-reveal grid gap-5 rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_64px_-50px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:grid-cols-[auto_1fr]"
        key={step.title}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#3A04FF] text-lg font-semibold text-white">
          {index + 1}
        </div>
        <div>
          <h3 className="text-2xl leading-7 font-semibold text-[#101828]">
            {step.title}
          </h3>
          <p className="mt-2 text-base leading-7 text-[#667085]">
            {step.description}
          </p>
        </div>
      </article>
    ))}
  </div>
)

export const AutomationFlowPanel = () => (
  <div className="osonflow-reveal relative overflow-hidden rounded-[30px] border border-white/70 bg-[#101828] p-5 text-white shadow-[0_34px_110px_-62px_rgba(16,24,40,0.8)]">
    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(58,4,255,0.22),transparent_32%,rgba(52,211,153,0.12)_64%,transparent)]" />
    <div className="relative">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Automation canvas</p>
          <p className="mt-1 text-xs text-white/56">Rules running now</p>
        </div>
        <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white/74">
          Live
        </span>
      </div>
      <div className="grid gap-3">
        {[
          ["New billing question", "AI drafts answer", "94% confidence"],
          ["Payment failure", "Human priority", "Escalated"],
          ["Voice request", "Vapi assistant", "In call"],
        ].map(([input, action, state]) => (
          <div
            className="osonflow-flow-row grid gap-3 rounded-2xl bg-white/9 p-4 text-sm backdrop-blur-xl sm:grid-cols-[1fr_auto_1fr_auto]"
            key={input}
          >
            <span className="font-semibold text-white">{input}</span>
            <ChevronRightIcon className="hidden size-4 text-white/40 sm:block" />
            <span className="text-white/74">{action}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#101828]">
              {state}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const PricingCards = ({ compact = false }: { compact?: boolean }) => (
  <div className="grid gap-4 lg:grid-cols-3">
    {pricingTiers.map((tier) => (
      <article
        className={cn(
          "osonflow-reveal rounded-[30px] border p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.56)]",
          tier.featured
            ? "border-[#3A04FF]/22 bg-[#101828] text-white"
            : "border-white/72 bg-white/72 text-[#101828] backdrop-blur-xl"
        )}
        key={tier.name}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">{tier.name}</h3>
            <p
              className={cn(
                "mt-3 text-sm leading-6",
                tier.featured ? "text-white/68" : "text-[#667085]"
              )}
            >
              {tier.description}
            </p>
          </div>
          {tier.featured ? (
            <BadgeCheckIcon className="size-6 shrink-0 text-[#34D399]" />
          ) : null}
        </div>
        <div className="mt-7 flex items-end gap-2">
          <p className="text-5xl leading-none font-semibold">{tier.price}</p>
          {tier.price.startsWith("$") ? (
            <span
              className={cn(
                "pb-1 text-sm font-medium",
                tier.featured ? "text-white/54" : "text-[#667085]"
              )}
            >
              /month
            </span>
          ) : null}
        </div>
        <div className="mt-7 flex flex-col gap-3">
          {tier.features.map((feature) => (
            <div
              className="flex items-center gap-3 text-sm font-medium"
              key={feature}
            >
              <CheckIcon
                className={cn(
                  "size-4 shrink-0",
                  tier.featured ? "text-[#34D399]" : "text-[#157A43]"
                )}
              />
              <span
                className={tier.featured ? "text-white/82" : "text-[#344054]"}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>
        <Button
          asChild
          className={cn(
            "mt-8 h-12 w-full rounded-full text-base font-semibold",
            tier.featured
              ? "bg-white text-[#101828] hover:bg-white/90"
              : "bg-[#101828] text-white hover:bg-[#1D2939]",
            compact && "lg:w-auto"
          )}
        >
          <Link href="/sign-up">{tier.cta}</Link>
        </Button>
      </article>
    ))}
  </div>
)

export const SecurityStrip = () => (
  <div className="grid gap-3 sm:grid-cols-3">
    {securityItems.map(({ label, icon: Icon }) => (
      <div
        className="rounded-2xl border border-[#101828]/10 bg-white/72 px-4 py-3 text-sm font-semibold text-[#344054] backdrop-blur-xl"
        key={label}
      >
        <Icon className="mb-2 size-4 text-[#3A04FF]" />
        {label}
      </div>
    ))}
  </div>
)

export const WidgetPreview = () => (
  <div className="flex min-h-[360px] items-end bg-[#101828] p-6">
    <div className="osonflow-widget-preview w-full rounded-[28px] bg-white/92 p-4 shadow-[0_28px_80px_-44px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#E8F1FF] text-[#3A04FF]">
            <BotIcon className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-[#101828]">Osonflow Assistant</p>
            <p className="text-xs text-[#667085]">Online and ready</p>
          </div>
        </div>
        <CircleHelpIcon className="size-5 text-[#98A2B3]" />
      </div>
      <div className="rounded-2xl bg-[#F6F8FB] p-4 text-sm leading-6 text-[#475467]">
        Hi! I can help with plans, billing, product questions, or connect you to
        the right person.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {["Talk to sales", "Get support"].map((label) => (
          <button
            className="rounded-2xl border border-[#101828]/10 bg-white px-3 py-3 text-sm font-semibold text-[#344054]"
            key={label}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </div>
)

export const CtaSection = () => (
  <section className="relative overflow-hidden bg-[#E8F1FF] py-20">
    <LiquidBackdrop />
    <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
      <div className="grid overflow-hidden rounded-[34px] border border-white/76 bg-white/70 shadow-[0_40px_110px_-62px_rgba(58,4,255,0.42)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-8 sm:p-12">
          <h2 className="max-w-2xl text-5xl leading-none font-semibold text-[#101828] sm:text-6xl">
            Make support feel present before your team logs in
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#667085]">
            Launch the widget, train your assistant, and keep the human inbox
            focused on the moments that matter.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-13 rounded-full bg-[#101828] px-6 text-base font-semibold text-white hover:bg-[#1D2939]"
            >
              <Link href="/sign-up">
                Start free
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              className="h-13 rounded-full border-[#101828]/12 bg-white px-6 text-base font-semibold text-[#101828]"
              variant="outline"
            >
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
        <WidgetPreview />
      </div>
    </div>
  </section>
)

export const MarketingFooter = () => (
  <footer className="border-t border-[#101828]/8 bg-white px-5 py-10 sm:px-8">
    <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div>
        <Logo />
        <p className="mt-3 max-w-md text-sm leading-6 text-[#667085]">
          AI support, human handoff, voice, analytics, and customer memory in
          one calm operating layer.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-[#344054]">
        {navItems.map((item) => (
          <Link
            className="rounded-full px-3 py-2 hover:bg-[#F6F8FB]"
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className="rounded-full px-3 py-2 hover:bg-[#F6F8FB]"
          href="/sign-in"
        >
          Login
        </Link>
      </div>
    </div>
  </footer>
)

export const PageHero = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) => (
  <section className="relative overflow-hidden border-b border-[#101828]/8 bg-[#F6F8FB]">
    <LiquidBackdrop />
    <div className="relative mx-auto grid min-h-[520px] max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="max-w-3xl">
        <h1 className="text-5xl leading-none font-semibold text-[#080A12] sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-[#475467]">
          {description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
            className="h-13 rounded-full border-[#101828]/12 bg-white px-6 text-base font-semibold text-[#101828]"
            variant="outline"
          >
            <Link href="/pricing">Compare plans</Link>
          </Button>
        </div>
      </div>
      {children}
    </div>
  </section>
)

export const IntegrationConstellation = () => (
  <div className="osonflow-reveal relative overflow-hidden rounded-[32px] border border-white/70 bg-white/64 p-5 shadow-[0_32px_100px_-60px_rgba(15,23,42,0.62)] backdrop-blur-2xl">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {channelLogos.map((logo) => (
        <div
          className="group flex min-h-32 flex-col items-center justify-center gap-3 rounded-[24px] border border-[#101828]/10 bg-white/74 p-4 transition duration-500 hover:-translate-y-1 hover:bg-white"
          key={logo.label}
        >
          <Image
            alt={`${logo.label} logo`}
            className="size-10 rounded-full object-contain"
            height={44}
            src={logo.src}
            width={44}
          />
          <span className="text-sm font-semibold text-[#344054]">
            {logo.label}
          </span>
        </div>
      ))}
      <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-[24px] border border-[#101828]/10 bg-[#101828] p-4 text-white">
        <PlugZapIcon className="size-10 text-[#34D399]" />
        <span className="text-sm font-semibold">More via API</span>
      </div>
    </div>
  </div>
)

export const SupportMap = () => (
  <div className="osonflow-reveal rounded-[32px] border border-white/70 bg-white/64 p-5 shadow-[0_32px_100px_-60px_rgba(15,23,42,0.62)] backdrop-blur-2xl">
    <div className="rounded-[26px] bg-[#101828] p-5 text-white">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Global support map</p>
          <p className="mt-1 text-xs text-white/56">
            Widget traffic by channel
          </p>
        </div>
        <Globe2Icon className="size-5 text-[#34D399]" />
      </div>
      <div className="grid gap-3">
        {[
          ["Website widget", "52%", "bg-[#3A7BFF]"],
          ["WhatsApp", "24%", "bg-[#34D399]"],
          ["Voice", "16%", "bg-[#FFCA3A]"],
          ["Telegram", "8%", "bg-white"],
        ].map(([label, value, color]) => (
          <div
            className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm"
            key={label}
          >
            <span className="text-white/72">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/10">
              <span
                className={cn("block h-full rounded-full", color)}
                style={{ width: value }}
              />
            </span>
            <span className="text-right font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const PageShell = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen bg-white [font-family:var(--font-display)] text-[#101828]">
    <LandingNav />
    {children}
    <CtaSection />
    <MarketingFooter />
  </main>
)

export const ProductSystemPanel = () => (
  <div className="osonflow-reveal grid gap-4 rounded-[32px] border border-white/70 bg-white/64 p-5 shadow-[0_32px_100px_-60px_rgba(15,23,42,0.62)] backdrop-blur-2xl">
    {productSystemItems.map(({ title, description, icon: Icon }) => (
      <div
        className="grid gap-4 rounded-[24px] border border-[#101828]/10 bg-white/74 p-4 sm:grid-cols-[auto_1fr]"
        key={title}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#E8F1FF] text-[#3A04FF]">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#101828]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#667085]">{description}</p>
        </div>
      </div>
    ))}
  </div>
)
