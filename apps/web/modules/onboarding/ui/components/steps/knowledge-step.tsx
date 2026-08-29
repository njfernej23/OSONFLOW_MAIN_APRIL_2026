"use client"

import { useState } from "react"
import Link from "next/link"
import { api } from "@workspace/backend/_generated/api"
import { useAction } from "convex/react"
import {
  GlobeIcon,
  Loader2Icon,
  SendHorizonalIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { ONBOARDING_STEP_COPY } from "../../../lib/steps"
import { StepField, StepShell } from "../step-shell"

type TestAnswer = {
  answer: string
  supportLevel: "strong" | "partial" | "weak" | "none"
}

const SUPPORT_TONE: Record<TestAnswer["supportLevel"], string> = {
  strong: "console-tone-positive",
  partial: "console-tone-warning",
  weak: "console-tone-warning",
  none: "console-tone-critical",
}

const SUPPORT_LABEL: Record<TestAnswer["supportLevel"], string> = {
  strong: "Answered from your content",
  partial: "Partly answered",
  weak: "Thin on detail",
  none: "Not in your content yet",
}

/**
 * Reading the customer's own website is the fastest path from "empty account"
 * to "it knows things", and the test box right underneath is the first moment
 * anyone sees the product actually work on their own material.
 */
export const KnowledgeStep = ({
  isDone,
  detail,
  onContinue,
}: {
  isDone: boolean
  detail?: string
  onContinue: () => void
}) => {
  const addWebsite = useAction(api.private.files.addWebsite)
  const testKnowledgeBase = useAction(api.private.files.testKnowledgeBase)

  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isReading, setIsReading] = useState(false)
  const [question, setQuestion] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const [answer, setAnswer] = useState<TestAnswer | null>(null)

  const readWebsite = async () => {
    const trimmed = websiteUrl.trim()

    if (!trimmed) {
      toast.error("Enter your website address first")
      return
    }

    setIsReading(true)
    try {
      await addWebsite({ url: trimmed })
      setWebsiteUrl("")
      toast.success("Read and saved", {
        description: "Ask it a question below to see what it picked up.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? "Could not read that address. Check it and try again."
          : "Could not read that address."
      )
    } finally {
      setIsReading(false)
    }
  }

  const ask = async () => {
    const trimmed = question.trim()

    if (!trimmed) {
      return
    }

    setIsAsking(true)
    setAnswer(null)
    try {
      const result = (await testKnowledgeBase({
        question: trimmed,
      })) as TestAnswer
      setAnswer(result)
    } catch {
      toast.error("Could not run that test right now.")
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <StepShell
      detail={detail}
      footer={
        isDone ? (
          <Button onClick={onContinue} size="sm" type="button">
            Next step
          </Button>
        ) : null
      }
      isDone={isDone}
      step={ONBOARDING_STEP_COPY.knowledge}
    >
      <div className="space-y-5">
        <div className="max-w-xl">
          <StepField
            hint="It follows the links on the page and saves what it finds. Add more pages, PDFs or spreadsheets later from the Knowledge base."
            label="Your website"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <GlobeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 bg-background pl-9 text-sm"
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void readWebsite()
                    }
                  }}
                  placeholder="yourbusiness.com"
                  spellCheck={false}
                  value={websiteUrl}
                />
              </div>
              <Button
                className="shrink-0 gap-1.5"
                disabled={isReading || !websiteUrl.trim()}
                onClick={readWebsite}
                type="button"
                variant={isDone ? "outline" : "default"}
              >
                {isReading ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    Reading
                  </>
                ) : (
                  "Read my website"
                )}
              </Button>
            </div>
          </StepField>

          <Button
            asChild
            className="mt-3 h-8 gap-1.5 px-0 text-xs"
            size="sm"
            variant="link"
          >
            <Link href="/files">
              <UploadIcon className="size-3.5" />
              Upload documents instead
            </Link>
          </Button>
        </div>

        {/* The proof. Only useful once there is something to search. */}
        {isDone ? (
          <div className="console-inset px-4 py-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">Ask it something</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Try a question a real customer would ask. The answer comes only
              from what you have given it.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                className="h-10 min-w-0 flex-1 bg-background text-sm"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void ask()
                  }
                }}
                placeholder="How much does delivery cost?"
                value={question}
              />
              <Button
                className="shrink-0 gap-1.5"
                disabled={isAsking || !question.trim()}
                onClick={ask}
                type="button"
                variant="outline"
              >
                {isAsking ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SendHorizonalIcon className="size-3.5" />
                )}
                Ask
              </Button>
            </div>

            {isAsking ? (
              <div className="mt-3 space-y-2">
                <span className="block h-3 w-3/4 animate-pulse rounded-full bg-muted" />
                <span className="block h-3 w-full animate-pulse rounded-full bg-muted" />
                <span className="block h-3 w-2/3 animate-pulse rounded-full bg-muted" />
              </div>
            ) : null}

            {answer && !isAsking ? (
              <div className="console-card mt-3 animate-in px-4 py-3.5 duration-300 fade-in-0">
                <p className="text-sm leading-relaxed text-foreground">
                  {answer.answer}
                </p>
                <p
                  className={cn(
                    "mt-2.5 flex items-center gap-1.5 text-[11px]",
                    SUPPORT_TONE[answer.supportLevel]
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "console-dot",
                      SUPPORT_TONE[answer.supportLevel]
                    )}
                  />
                  {SUPPORT_LABEL[answer.supportLevel]}
                  {answer.supportLevel !== "strong" ? (
                    <span className="text-muted-foreground">
                      · add more detail in the Knowledge base
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </StepShell>
  )
}
