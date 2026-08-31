"use client"

import { useState } from "react"
import Link from "next/link"
import { useAction } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  GlobeIcon,
  Loader2Icon,
  PaletteIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

type Question = {
  id: string
  question: string
  why: string
  placeholder: string
}

type Profile = {
  businessName: string
  summary: string
  industry: string
  languages: string[]
  topics: string[]
  keyFacts: string[]
  gaps: string[]
  questions: Question[]
}

type ToolPlan = {
  name: string
  description: string
  type: string
  rationale: string
}

type Plan = {
  systemPrompt: string
  greetMessage: string
  assistantName: string
  defaultSuggestions: {
    suggestion1?: string
    suggestion2?: string
    suggestion3?: string
  }
  theme?: { primaryColor?: string }
  helpTopics: { title: string; excerpt: string }[]
  tools: ToolPlan[]
  knowledgeDocs: { title: string; body: string }[]
}

type Stage = "address" | "questions" | "review" | "done"

const STAGE_ORDER: Stage[] = ["address", "questions", "review", "done"]

const STAGE_COPY: Record<Stage, { rail: string; title: string; blurb: string }> =
  {
    address: {
      rail: "Your website",
      title: "Point it at your website",
      blurb:
        "It reads your pages the way a customer would, and works out what your business does.",
    },
    questions: {
      rail: "A few questions",
      title: "Fill in what your website doesn't say",
      blurb:
        "These are the things it could not find but customers ask about constantly. Skip any you would rather answer later.",
    },
    review: {
      rail: "Check it over",
      title: "Here is what it wrote",
      blurb:
        "Nothing is live yet. Choose what to keep, and it goes into your draft for you to publish when you are happy.",
    },
    done: {
      rail: "Done",
      title: "Saved to your draft",
      blurb: "Review it in the designer, then publish when it looks right.",
    },
  }

const Rail = ({ stage }: { stage: Stage }) => {
  const currentIndex = STAGE_ORDER.indexOf(stage)

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STAGE_ORDER.map((item, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <li className="flex items-center gap-2" key={item}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                isDone && "border-transparent bg-[var(--console-positive)] text-white",
                isCurrent && "border-foreground bg-foreground text-background",
                !isDone && !isCurrent && "border-[var(--console-hairline)] text-muted-foreground"
              )}
            >
              {isDone ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {STAGE_COPY[item].rail}
            </span>
            {index < STAGE_ORDER.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-[var(--console-hairline)]" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

const SummaryChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[10px] border border-[var(--console-hairline)] bg-muted/35 px-3 py-2">
    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {label}
    </p>
    <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
  </div>
)

/**
 * Setting the assistant up from the owner's own website.
 *
 * The three stages exist because a website alone is not enough: it will not say
 * what the owner refuses to promise, or what customers ring up about that was
 * never published. So the middle step asks, in their words, and the result is a
 * draft rather than a live change.
 */
export const AiSetupView = () => {
  const analyzeSite = useAction(api.private.aiSetup.analyzeSite)
  const generatePlan = useAction(api.private.aiSetup.generatePlan)
  const applyPlan = useAction(api.private.aiSetup.applyPlan)

  const [stage, setStage] = useState<Stage>("address")
  const [url, setUrl] = useState("")
  const [isWorking, setIsWorking] = useState(false)

  const [runId, setRunId] = useState<Id<"aiSetupRuns"> | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [plan, setPlan] = useState<Plan | null>(null)

  const [keepKnowledge, setKeepKnowledge] = useState(true)
  const [keepWidget, setKeepWidget] = useState(true)
  const [keepTools, setKeepTools] = useState(true)

  const handleRead = async () => {
    if (!url.trim()) return

    setIsWorking(true)
    try {
      const result = await analyzeSite({ url: url.trim() })
      setRunId(result.runId)
      setPageCount(result.pageCount)
      setProfile(result.profile as Profile)
      setStage("questions")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read that website."
      )
    } finally {
      setIsWorking(false)
    }
  }

  const handleGenerate = async () => {
    if (!runId || !profile) return

    setIsWorking(true)
    try {
      const result = await generatePlan({
        runId,
        answers: profile.questions.map((question) => ({
          id: question.id,
          question: question.question,
          answer: answers[question.id] ?? "",
        })),
      })
      setPlan(result as Plan)
      setStage("review")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not write the setup."
      )
    } finally {
      setIsWorking(false)
    }
  }

  const handleApply = async () => {
    if (!runId) return

    setIsWorking(true)
    try {
      const result = await applyPlan({
        runId,
        applyKnowledge: keepKnowledge,
        applyWidget: keepWidget,
        applyTools: keepTools,
      })
      toast.success(
        `Saved. ${result.knowledgeDocsAdded} documents added to your knowledge base.`
      )
      setStage("done")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the setup."
      )
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4" />
          Set up with AI
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {STAGE_COPY[stage].title}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          {STAGE_COPY[stage].blurb}
        </p>
        <Rail stage={stage} />
      </header>

      {stage === "address" ? (
        <section className="console-card flex flex-col gap-4 p-5 sm:p-6">
          <label className="text-sm font-medium" htmlFor="ai-setup-url">
            Your website address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <GlobeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                disabled={isWorking}
                id="ai-setup-url"
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleRead()
                }}
                placeholder="example.uz"
                value={url}
              />
            </div>
            <Button disabled={isWorking || !url.trim()} onClick={handleRead}>
              {isWorking ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Reading your site
                </>
              ) : (
                <>
                  Read my website
                  <ArrowRightIcon className="size-4" />
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            It reads up to 12 pages, following your sitemap where you have one.
            Nothing is changed on your site.
          </p>
        </section>
      ) : null}

      {stage === "questions" && profile ? (
        <>
          <section className="console-card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">What it found</h2>
              <span className="text-xs text-muted-foreground">
                {pageCount} {pageCount === 1 ? "page" : "pages"} read
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {profile.summary}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <SummaryChip label="Business" value={profile.businessName} />
              <SummaryChip label="Industry" value={profile.industry} />
              <SummaryChip
                label="Languages"
                value={profile.languages.join(", ").toUpperCase() || "—"}
              />
            </div>
            {profile.keyFacts.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {profile.keyFacts.slice(0, 6).map((fact) => (
                  <li className="flex gap-2" key={fact}>
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-[var(--console-positive)]" />
                    {fact}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="console-card flex flex-col gap-5 p-5 sm:p-6">
            {profile.questions.map((question) => (
              <div className="flex flex-col gap-2" key={question.id}>
                <label
                  className="text-sm font-medium"
                  htmlFor={`question-${question.id}`}
                >
                  {question.question}
                </label>
                <p className="text-xs text-muted-foreground">{question.why}</p>
                <Textarea
                  id={`question-${question.id}`}
                  onChange={(event) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [question.id]: event.target.value,
                    }))
                  }
                  placeholder={question.placeholder}
                  rows={2}
                  value={answers[question.id] ?? ""}
                />
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                disabled={isWorking}
                onClick={handleGenerate}
                variant="ghost"
              >
                Skip and write it anyway
              </Button>
              <Button disabled={isWorking} onClick={handleGenerate}>
                {isWorking ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Writing your setup
                  </>
                ) : (
                  <>
                    Write my setup
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {stage === "review" && plan ? (
        <>
          <section className="console-card flex flex-col gap-4 p-5 sm:p-6">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={keepKnowledge}
                onCheckedChange={(value) => setKeepKnowledge(value === true)}
              />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <BookOpenIcon className="size-4" />
                  Knowledge base — {plan.knowledgeDocs.length} documents
                </span>
                <span className="text-xs text-muted-foreground">
                  {plan.knowledgeDocs.map((doc) => doc.title).join(" · ") ||
                    "Nothing to add"}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={keepWidget}
                onCheckedChange={(value) => setKeepWidget(value === true)}
              />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <PaletteIcon className="size-4" />
                  Chat window — name, greeting, colour and help articles
                </span>
                <span className="text-xs text-muted-foreground">
                  Assistant name “{plan.assistantName}”, {plan.helpTopics.length}{" "}
                  help topics. Saved as a draft.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={keepTools}
                onCheckedChange={(value) => setKeepTools(value === true)}
              />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <WrenchIcon className="size-4" />
                  Turn on the built-in tools
                </span>
                <span className="text-xs text-muted-foreground">
                  Knowledge base search, hand over to a human, and mark resolved.
                </span>
              </span>
            </label>
          </section>

          <section className="console-card flex flex-col gap-3 p-5 sm:p-6">
            <h2 className="text-sm font-semibold">The greeting it wrote</h2>
            <p className="rounded-[10px] border border-[var(--console-hairline)] bg-muted/35 px-3 py-2 text-sm">
              {plan.greetMessage}
            </p>
            <h2 className="mt-2 text-sm font-semibold">Its instructions</h2>
            <pre className="max-h-64 overflow-auto rounded-[10px] border border-[var(--console-hairline)] bg-muted/35 px-3 py-2 text-xs leading-5 whitespace-pre-wrap">
              {plan.systemPrompt}
            </pre>
          </section>

          {plan.tools.length > 0 ? (
            <section className="console-card flex flex-col gap-3 p-5 sm:p-6">
              <h2 className="text-sm font-semibold">
                Worth setting up next
              </h2>
              <p className="text-xs text-muted-foreground">
                These need a spreadsheet or a web address only you have, so they
                are suggestions rather than something it can switch on for you.
              </p>
              <ul className="flex flex-col gap-2">
                {plan.tools.map((tool) => (
                  <li
                    className="rounded-[10px] border border-[var(--console-hairline)] px-3 py-2"
                    key={tool.name}
                  >
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tool.rationale}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                className="text-xs font-medium underline underline-offset-4"
                href="/assistant-tools"
              >
                Open Assistant tools
              </Link>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              disabled={isWorking}
              onClick={() => setStage("questions")}
              variant="ghost"
            >
              Back
            </Button>
            <Button disabled={isWorking} onClick={handleApply}>
              {isWorking ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save to my draft"
              )}
            </Button>
          </div>
        </>
      ) : null}

      {stage === "done" ? (
        <section className="console-card flex flex-col items-start gap-4 p-5 sm:p-6">
          <span className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--console-positive)] text-white">
            <CheckIcon className="size-5" />
          </span>
          <p className="text-sm leading-6 text-muted-foreground">
            Your knowledge base and chat window draft are ready. Publishing is
            still yours to do — open the designer, look it over, and publish when
            it reads the way you want.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/customization">
                Open the designer
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/files">See the knowledge base</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
