"use client"

import Link from "next/link"
import { ArrowRightIcon, PartyPopperIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { ONBOARDING_STEP_COPY } from "../../../lib/steps"
import { StepShell } from "../step-shell"

const WHAT_HAPPENS_NEXT = [
  {
    title: "It answers first",
    body: "Questions your documents cover are handled in seconds, at any hour.",
  },
  {
    title: "You get the hard ones",
    body: "Anything it cannot answer is handed to you with the whole conversation attached.",
  },
  {
    title: "It gets better",
    body: "AI performance shows you the questions it missed, so you know exactly what to add next.",
  },
]

/**
 * The last step is not a task — it is the moment to explain what daily life
 * looks like from here, so the guide ends on orientation rather than a form.
 */
export const FirstChatStep = ({
  isDone,
  detail,
  onFinish,
  isFinishing,
}: {
  isDone: boolean
  detail?: string
  onFinish: () => void
  isFinishing: boolean
}) => (
  <StepShell
    detail={detail}
    footer={
      <Button
        className="gap-1.5"
        disabled={isFinishing}
        onClick={onFinish}
        size="sm"
        type="button"
      >
        Go to my inbox
        <ArrowRightIcon className="size-3.5" />
      </Button>
    }
    isDone={isDone}
    step={ONBOARDING_STEP_COPY.conversation}
  >
    <div className="space-y-4">
      {isDone ? (
        <div className="console-inset flex items-start gap-3 border-[color-mix(in_srgb,var(--console-positive)_40%,transparent)] bg-[color-mix(in_srgb,var(--console-positive)_8%,transparent)] px-4 py-3.5">
          <PartyPopperIcon className="console-tone-positive mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">You&apos;re live.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Real customers are talking to your assistant. Everything from here
              happens in the inbox.
            </p>
          </div>
        </div>
      ) : null}

      <ol className="grid gap-2.5 sm:grid-cols-3">
        {WHAT_HAPPENS_NEXT.map((item, index) => (
          <li className="console-inset px-4 py-3.5" key={item.title}>
            <p className="console-numeral text-xs text-muted-foreground">
              {index + 1}
            </p>
            <p className="mt-1.5 text-sm font-medium">{item.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">
        Want to test it yourself first?{" "}
        <Link className="text-foreground underline" href="/widget-preview">
          Open your widget in a new tab
        </Link>{" "}
        and send it a message — it arrives in the inbox like any other.
      </p>
    </div>
  </StepShell>
)
