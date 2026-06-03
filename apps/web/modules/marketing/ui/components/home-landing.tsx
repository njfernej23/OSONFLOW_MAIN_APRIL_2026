import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  GaugeIcon,
  GitBranchIcon,
  Globe2Icon,
  HeadphonesIcon,
  MessageCircleMoreIcon,
  Mic2Icon,
  PanelsTopLeftIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { LandingNav } from "./landing-nav"

type RouteCard = {
  label: string
  href: string
  description: string
  icon: LucideIcon
  accent: string
}

type Feature = {
  title: string
  description: string
  icon: LucideIcon
}

const routeCards: RouteCard[] = [
  {
    label: "Product",
    href: "/product",
    description:
      "See the support desk, customer timeline, AI inbox, and team handoff experience.",
    icon: PanelsTopLeftIcon,
    accent: "bg-[#e8f3ff] text-[#2563eb]",
  },
  {
    label: "Automation",
    href: "/automation",
    description:
      "Build routing rules, escalation triggers, confidence checks, and follow-up flows.",
    icon: WorkflowIcon,
    accent: "bg-[#e9ffe8] text-[#15803d]",
  },
  {
    label: "Integrations",
    href: "/channels",
    description:
      "Connect web chat, WhatsApp, Telegram, model providers, and voice tools.",
    icon: PlugZapIcon,
    accent: "bg-[#fff3c4] text-[#8a5b00]",
  },
  {
    label: "Pricing",
    href: "/pricing",
    description:
      "Compare plans for launch, growth, voice, automation, and custom support needs.",
    icon: CircleDollarSignIcon,
    accent: "bg-[#ffe8f6] text-[#df37a7]",
  },
]

const platformFeatures: Feature[] = [
  {
    title: "AI answers from your context",
    description:
      "Upload policies, URLs, help articles, and files so replies stay grounded in what your team trusts.",
    icon: BotIcon,
  },
  {
    title: "Human handoff without lost history",
    description:
      "When confidence drops or urgency rises, your team gets the customer, summary, and next step.",
    icon: HeadphonesIcon,
  },
  {
    title: "Voice and chat in one queue",
    description:
      "Website chat and realtime voice can share the same memory, routing, and analytics layer.",
    icon: Mic2Icon,
  },
]

const signalRows = [
  ["Billing question", "AI reply ready", "42s"],
  ["Payment failed", "Escalate to human", "High"],
  ["Voice request", "Start assistant", "Live"],
] as const

const proofItems = [
  "Source-grounded replies",
  "Human handoff rules",
  "Voice-ready support",
  "Customer memory",
] as const

const footerLinks = [
  ["Product", "/product"],
  ["Automation", "/automation"],
  ["Integrations", "/channels"],
  ["Pricing", "/pricing"],
  ["Login", "/sign-in"],
] satisfies Array<[string, string]>

export const HomeLandingPage = () => (
  <main className="min-h-screen overflow-x-clip bg-[#fbfaf7] text-[#240029]">
    <LandingNav />
    <HeroSection />
    <RouteSection />
    <PlatformSection />
    <ProofSection />
    <FinalCta />
    <HomeFooter />
  </main>
)

const PrimaryCta = ({
  children,
  href,
}: {
  children: React.ReactNode
  href: string
}) => (
  <Button
    asChild
    className="h-12 rounded-[6px] bg-[#df37a7] px-5 text-base font-bold text-white shadow-[0_18px_42px_-28px_rgba(223,55,167,0.9)] hover:bg-[#c92f96]"
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
    className="h-12 rounded-[6px] border-[#240029]/16 bg-white px-5 text-base font-bold text-[#240029] hover:bg-[#f4eff4]"
    variant="outline"
  >
    <Link href={href}>
      {children}
      <ChevronRightIcon data-icon="inline-end" />
    </Link>
  </Button>
)

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#240029]/10 bg-white px-3 py-1.5 text-sm font-bold text-[#6d526d] shadow-[0_16px_40px_-34px_rgba(36,0,41,0.7)]">
    <SparklesIcon className="size-4 text-[#df37a7]" />
    {children}
  </p>
)

const HeroSection = () => (
  <section className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(36,0,41,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(36,0,41,0.05)_1px,transparent_1px)] [mask-image:linear-gradient(#000,rgba(0,0,0,0.75)_58%,transparent_95%)] bg-[size:64px_64px]" />
    <div className="relative mx-auto grid max-w-[82rem] gap-10 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pt-16 lg:pb-20">
      <div>
        <Eyebrow>AI customer support, routed clearly</Eyebrow>
        <h1 className="mt-7 max-w-4xl text-[3.35rem] leading-[0.95] font-bold tracking-normal [text-wrap:balance] text-[#240029] sm:text-7xl lg:text-[5.6rem]">
          One calm front door for every customer question.
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-9 text-[#6d526d]">
          Osonflow brings AI replies, voice, customer memory, handoff, and
          analytics into a support layer your team can actually operate.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <PrimaryCta href="/sign-up">Start free</PrimaryCta>
          <SecondaryCta href="/product">Explore product</SecondaryCta>
        </div>
      </div>

      <SupportPreview />
    </div>
  </section>
)

const SupportPreview = () => (
  <div className="relative">
    <div className="absolute -inset-4 rounded-[28px] bg-[radial-gradient(circle_at_20%_10%,rgba(223,55,167,0.2),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(255,204,17,0.18),transparent_30%)] blur-2xl" />
    <div className="relative overflow-hidden rounded-[20px] border border-[#240029]/10 bg-white shadow-[0_32px_120px_-70px_rgba(36,0,41,0.7)]">
      <div className="flex items-center justify-between border-b border-[#240029]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#df37a7]" />
          <span className="size-2.5 rounded-full bg-[#ffcc11]" />
          <span className="size-2.5 rounded-full bg-[#7bd88f]" />
        </div>
        <p className="text-xs font-bold text-[#8c728c]">support.osonflow.uz</p>
      </div>

      <div className="grid lg:grid-cols-[15rem_1fr]">
        <aside className="hidden border-r border-[#240029]/10 bg-[#fbf6fb] p-4 lg:block">
          <div className="flex items-center gap-2 text-sm font-bold text-[#240029]">
            <span className="size-2 rounded-full bg-[#df37a7]" />
            Live queue
          </div>
          <div className="mt-6 grid gap-2">
            {["Inbox", "AI replies", "Voice", "Handoffs"].map((item, index) => (
              <div
                className={cn(
                  "flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm font-bold",
                  index === 0
                    ? "bg-[#240029] text-white"
                    : "text-[#7b607b] hover:bg-white"
                )}
                key={item}
              >
                {item}
                {index === 0 ? (
                  <span className="rounded-full bg-[#df37a7] px-2 py-0.5 text-xs">
                    18
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 md:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b border-[#240029]/10 md:border-r md:border-b-0">
            <div className="border-b border-[#240029]/10 p-5">
              <p className="font-bold text-[#240029]">Today&apos;s signals</p>
              <p className="mt-1 text-sm text-[#7b607b]">
                Intent, urgency, owner, and response time.
              </p>
            </div>
            {signalRows.map(([topic, status, time], index) => (
              <div
                className={cn(
                  "grid grid-cols-[1fr_auto] gap-4 border-b border-[#240029]/10 px-5 py-4 last:border-b-0",
                  index === 0 && "bg-[#fff7fb]"
                )}
                key={topic}
              >
                <div>
                  <p className="text-sm font-bold text-[#240029]">{topic}</p>
                  <p className="mt-1 text-xs font-bold text-[#8c728c]">
                    {status}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#df37a7]">{time}</span>
              </div>
            ))}
          </section>

          <section className="flex min-h-[25rem] flex-col p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-[#240029]">Customer thread</p>
                <p className="mt-1 text-sm text-[#8c728c]">
                  Memory and source context loaded
                </p>
              </div>
              <span className="rounded-full bg-[#e9ffe8] px-3 py-1 text-xs font-bold text-[#15803d]">
                Ready
              </span>
            </div>
            <div className="mt-6 flex flex-1 flex-col gap-4">
              <div className="max-w-[86%] rounded-[14px] bg-[#f3eff3] px-4 py-3 text-sm leading-6 text-[#4d394d]">
                Can I upgrade today and keep the same billing cycle?
              </div>
              <div className="ml-auto max-w-[88%] rounded-[14px] bg-[#df37a7] px-4 py-3 text-sm leading-6 text-white">
                Yes. The cycle stays the same and the difference is prorated
                automatically.
              </div>
              <div className="mt-auto rounded-[14px] border border-[#240029]/10 bg-[#fbfaf7] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#240029]">
                  <BrainCircuitIcon className="size-4 text-[#df37a7]" />
                  Suggested action
                </div>
                <p className="mt-2 text-sm leading-6 text-[#6d526d]">
                  Send the upgrade link and notify billing if payment fails.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
)

const RouteSection = () => (
  <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
    <div className="mx-auto max-w-[82rem]">
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
        <div>
          <Eyebrow>Choose the page you need</Eyebrow>
          <h2 className="mt-5 text-4xl leading-tight font-bold tracking-normal text-[#240029] sm:text-6xl">
            Four clear paths, four dedicated pages.
          </h2>
        </div>
        <p className="max-w-2xl text-lg leading-8 text-[#6d526d] lg:ml-auto">
          The homepage gives the overview. Product, Automation, Integrations,
          and Pricing each have their own route so visitors can go straight to
          the detail they came for.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {routeCards.map(({ label, href, description, icon: Icon, accent }) => (
          <Link
            className="group rounded-[18px] border border-[#240029]/10 bg-[#fbfaf7] p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_28px_80px_-62px_rgba(36,0,41,0.75)]"
            href={href}
            key={label}
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-[12px]",
                accent
              )}
            >
              <Icon className="size-5" />
            </span>
            <h3 className="mt-6 text-2xl font-bold text-[#240029]">{label}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6d526d]">
              {description}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#df37a7]">
              Open {label.toLowerCase()}
              <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
)

const PlatformSection = () => (
  <section className="bg-[#240029] px-5 py-16 text-white sm:px-8 lg:py-20">
    <div className="mx-auto grid max-w-[82rem] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      <div>
        <p className="text-sm font-bold text-[#ffcc11]">Platform overview</p>
        <h2 className="mt-4 text-4xl leading-tight font-bold tracking-normal sm:text-6xl">
          The connective layer behind every support page.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
          Osonflow is not just a widget. It is the operating layer that helps
          your support team answer, route, learn, and improve from one place.
        </p>
      </div>

      <div className="grid gap-4">
        {platformFeatures.map(({ title, description, icon: Icon }) => (
          <article
            className="grid gap-4 rounded-[18px] border border-white/10 bg-white/[0.06] p-5 sm:grid-cols-[auto_1fr] sm:items-start"
            key={title}
          >
            <span className="flex size-12 items-center justify-center rounded-[12px] bg-white text-[#240029]">
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
)

const ProofSection = () => (
  <section className="bg-[#fbfaf7] px-5 py-14 sm:px-8">
    <div className="mx-auto grid max-w-[82rem] gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
      <h2 className="text-3xl leading-tight font-bold text-[#240029] sm:text-5xl">
        Built for teams who need speed without losing judgment.
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {proofItems.map((item) => (
          <div
            className="flex items-center gap-3 rounded-[14px] border border-[#240029]/10 bg-white px-4 py-4"
            key={item}
          >
            <CheckCircle2Icon className="size-5 text-[#df37a7]" />
            <p className="text-sm font-bold text-[#240029]">{item}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

const FinalCta = () => (
  <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
    <div className="mx-auto grid max-w-[82rem] gap-8 rounded-[24px] border border-[#240029]/10 bg-[linear-gradient(135deg,#fff_0%,#fff7fb_52%,#fff8df_100%)] p-6 shadow-[0_30px_100px_-76px_rgba(36,0,41,0.72)] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-[#df37a7]">
          <ShieldCheckIcon className="size-4" />
          Ready for your support queue
        </div>
        <h2 className="mt-4 max-w-3xl text-4xl leading-tight font-bold tracking-normal text-[#240029] sm:text-6xl">
          Launch the AI support desk, then send visitors to the right page.
        </h2>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <PrimaryCta href="/sign-up">Start free</PrimaryCta>
        <SecondaryCta href="/pricing">View pricing</SecondaryCta>
      </div>
    </div>
  </section>
)

const HomeFooter = () => (
  <footer className="border-t border-[#240029]/10 bg-[#240029] px-5 py-10 text-white sm:px-8">
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
        <p className="mt-3 max-w-md text-sm leading-6 text-white/62">
          AI support, voice, routing, integrations, and pricing paths in one
          clean customer support entry point.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-bold text-white/74">
        {footerLinks.map(([item, href]) => (
          <Link
            className="rounded-full px-3 py-2 hover:bg-white/10 hover:text-white"
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
