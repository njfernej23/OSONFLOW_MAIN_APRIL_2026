import {
  BookOpenIcon,
  CodeXmlIcon,
  KeyRoundIcon,
  MessagesSquareIcon,
  PaletteIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * The first-run guide.
 *
 * Written for someone who has never set up a support tool before: no "embed",
 * no "namespace", no "LLM". Each step states the job, why it matters, and is
 * completed in place — the guide only hands someone off to a full settings
 * page when they explicitly ask for the long version.
 */

export type OnboardingStepId =
  | "ai-key"
  | "knowledge"
  | "widget"
  | "install"
  | "conversation"

export type OnboardingStepCopy = {
  id: OnboardingStepId
  /** Two or three words, for the progress rail. */
  railLabel: string
  /** Plain-language name of the job, not the name of the feature. */
  title: string
  /** One sentence a non-technical owner would understand. */
  summary: string
  /** Why it is worth doing, in their terms. */
  why: string
  icon: LucideIcon
  estimate: string
  /** Shown on the rail and the summary once the step is done. */
  doneLabel: string
  /** The full settings page, for anyone who wants more than the guide offers. */
  fullPageHref: string
  fullPageLabel: string
  /** True when the step completes on its own once the earlier ones are done. */
  isAutomatic?: boolean
}

export const ONBOARDING_STEPS: OnboardingStepCopy[] = [
  {
    id: "ai-key",
    railLabel: "Switch it on",
    title: "Switch the assistant on",
    summary:
      "Osonflow writes answers using OpenAI. Paste your OpenAI key once and the assistant can start replying.",
    why: "Without a key the assistant can read your documents but cannot write a reply.",
    icon: KeyRoundIcon,
    estimate: "2 min",
    doneLabel: "Assistant is switched on",
    fullPageHref: "/integrations",
    fullPageLabel: "Open Integrations",
  },
  {
    id: "knowledge",
    railLabel: "Teach it",
    title: "Tell it about your business",
    summary:
      "Paste your website address and it will read the pages itself. You can add price lists, policies and FAQs later.",
    why: "The assistant answers only from what you put here, so it cannot invent a price or a policy.",
    icon: BookOpenIcon,
    estimate: "5 min",
    doneLabel: "It knows your business",
    fullPageHref: "/files",
    fullPageLabel: "Open Knowledge base",
  },
  {
    id: "widget",
    railLabel: "Make it yours",
    title: "Make it look like you",
    summary:
      "Choose the assistant's name, the first thing it says, and the colour of the chat button.",
    why: "This is the part your customers actually see, so it should look like the rest of your site.",
    icon: PaletteIcon,
    estimate: "3 min",
    doneLabel: "Your look is published",
    fullPageHref: "/customization",
    fullPageLabel: "Open the full designer",
  },
  {
    id: "install",
    railLabel: "Add to your site",
    title: "Put it on your website",
    summary:
      "Copy one line of code and paste it into your site. A chat button then appears in the corner of every page.",
    why: "Send the line to whoever manages your website if you would rather not touch the code yourself.",
    icon: CodeXmlIcon,
    estimate: "2 min",
    doneLabel: "Visitors have opened it",
    fullPageHref: "/integrations",
    fullPageLabel: "See all install options",
  },
  {
    id: "conversation",
    railLabel: "First chat",
    title: "Your first conversation",
    summary:
      "Every chat arrives in your inbox. You can read along while the assistant answers and step in as a human at any point.",
    why: "This step ticks itself once a real customer writes in.",
    icon: MessagesSquareIcon,
    estimate: "—",
    doneLabel: "First conversation received",
    fullPageHref: "/conversations",
    fullPageLabel: "Open the inbox",
    isAutomatic: true,
  },
]

export const ONBOARDING_STEP_COPY: Record<
  OnboardingStepId,
  OnboardingStepCopy
> = Object.fromEntries(
  ONBOARDING_STEPS.map((step) => [step.id, step])
) as Record<OnboardingStepId, OnboardingStepCopy>

/* ── what each part of the dashboard is for ─────────────────────────────── */

export type DashboardMapEntry = {
  title: string
  href: string
  description: string
}

export type DashboardMapGroup = {
  label: string
  hint: string
  entries: DashboardMapEntry[]
}

export const DASHBOARD_MAP: DashboardMapGroup[] = [
  {
    label: "Every day",
    hint: "The pages you will actually live in once you are set up.",
    entries: [
      {
        title: "Conversations",
        href: "/conversations",
        description:
          "Every chat with a customer. Read them, reply yourself, and mark them done.",
      },
      {
        title: "Leads",
        href: "/leads",
        description:
          "People who left a name, email or phone number. Your follow-up list.",
      },
      {
        title: "AI voicechats",
        href: "/ai-conversations",
        description:
          "Transcripts of spoken conversations, if you turn on voice.",
      },
      {
        title: "AI performance",
        href: "/analytics",
        description:
          "How often the assistant finished the job on its own, and the questions it could not answer. Check it weekly.",
      },
      {
        title: "Customer memory",
        href: "/customer-memory",
        description:
          "What the assistant remembers about people who come back a second time.",
      },
    ],
  },
  {
    label: "Set up once",
    hint: "You will visit these while getting started, then rarely again.",
    entries: [
      {
        title: "Knowledge base",
        href: "/files",
        description:
          "The documents and web pages the assistant is allowed to answer from. The single most important page here.",
      },
      {
        title: "Widget customization",
        href: "/customization",
        description:
          "How the chat window looks and what it says, from colours to the greeting.",
      },
      {
        title: "Assistant tools",
        href: "/assistant-tools",
        description:
          "Things the assistant can do beyond talking — look something up, write a row into a spreadsheet, book a call.",
      },
      {
        title: "Integrations",
        href: "/integrations",
        description:
          "The code for your website, plus Telegram, Instagram and WhatsApp.",
      },
      {
        title: "Workflows",
        href: "/workflows",
        description:
          "For questions you want answered the exact same way every time — a refund request, a booking — you can draw the steps instead of trusting the assistant to improvise.",
      },
      {
        title: "Plans & Billing",
        href: "/billing",
        description: "Your plan, usage and invoices.",
      },
    ],
  },
]

/* ── how the product works, in three sentences ──────────────────────────── */

export const HOW_IT_WORKS = [
  {
    title: "You teach it",
    body: "Give it your documents, prices and policies. It reads them and nothing else.",
  },
  {
    title: "It answers",
    body: "Customers ask questions on your website, and it replies in seconds, day or night.",
  },
  {
    title: "You take over",
    body: "Anything it cannot handle lands in your inbox with the whole conversation attached.",
  },
]
