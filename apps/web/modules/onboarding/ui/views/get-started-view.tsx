"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useOrganization } from "@clerk/nextjs"
import { api } from "@workspace/backend/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { ChevronDownIcon, CompassIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ConsolePage, ConsoleSkeleton } from "@/modules/dashboard/ui/components/console"

import {
  HOW_IT_WORKS,
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "../../lib/steps"
import { DashboardMap } from "../components/dashboard-map"
import { StepRail } from "../components/step-rail"
import { BrandStep } from "../components/steps/brand-step"
import { ConnectAiStep } from "../components/steps/connect-ai-step"
import { FirstChatStep } from "../components/steps/first-chat-step"
import { InstallStep } from "../components/steps/install-step"
import { KnowledgeStep } from "../components/steps/knowledge-step"

/**
 * The first page a new organization sees.
 *
 * One step is on screen at a time and is finished in place — the key is pasted
 * here, the website is read here, the widget is published here. The dashboard
 * is only introduced once, at the bottom, as a map rather than a destination.
 */
export const GetStartedView = () => {
  const router = useRouter()
  const { organization } = useOrganization()
  const status = useQuery(api.private.onboarding.getStatus)
  const finishGuide = useMutation(api.private.onboarding.finish)
  const skipGuide = useMutation(api.private.onboarding.skip)

  const [selectedStep, setSelectedStep] = useState<OnboardingStepId | null>(
    null
  )
  const [isLeaving, setIsLeaving] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)

  const doneById = useMemo(() => {
    const map = Object.fromEntries(
      ONBOARDING_STEPS.map((step) => [step.id, false])
    ) as Record<OnboardingStepId, boolean>

    for (const step of status?.steps ?? []) {
      map[step.id as OnboardingStepId] = step.done
    }

    return map
  }, [status?.steps])

  const detailById = useMemo(() => {
    const map: Partial<Record<OnboardingStepId, string>> = {}

    for (const step of status?.steps ?? []) {
      map[step.id as OnboardingStepId] = step.detail
    }

    return map
  }, [status?.steps])

  if (status === undefined) {
    return <ConsoleSkeleton rows={3} stats={0} />
  }

  const { completedCount, totalCount, isSetupComplete, hasFinishedGuide } =
    status

  // With nothing pinned, the guide follows progress on its own and lands on
  // whatever is still outstanding.
  const firstIncomplete = ONBOARDING_STEPS.find((step) => !doneById[step.id])
  const activeStep: OnboardingStepId =
    selectedStep ?? firstIncomplete?.id ?? "conversation"

  const goToNext = () => {
    const index = ONBOARDING_STEPS.findIndex((step) => step.id === activeStep)
    const next = ONBOARDING_STEPS[index + 1]
    setSelectedStep(next ? next.id : activeStep)
  }

  const leaveGuide = async (mode: "finish" | "skip") => {
    setIsLeaving(true)
    try {
      if (mode === "finish") {
        await finishGuide()
      } else {
        await skipGuide()
      }
      router.push("/conversations")
    } catch {
      toast.error("Could not save that. Please try again.")
      setIsLeaving(false)
    }
  }

  const orgName = organization?.name?.trim()

  const stepPane = () => {
    switch (activeStep) {
      case "ai-key":
        return (
          <ConnectAiStep
            detail={detailById["ai-key"]}
            isDone={doneById["ai-key"]}
            onContinue={goToNext}
          />
        )
      case "knowledge":
        return (
          <KnowledgeStep
            detail={detailById.knowledge}
            isDone={doneById.knowledge}
            onContinue={goToNext}
          />
        )
      case "widget":
        return (
          <BrandStep
            detail={detailById.widget}
            isDone={doneById.widget}
            onContinue={goToNext}
          />
        )
      case "install":
        return (
          <InstallStep
            detail={detailById.install}
            isDone={doneById.install}
            onContinue={goToNext}
          />
        )
      default:
        return (
          <FirstChatStep
            detail={detailById.conversation}
            isDone={doneById.conversation}
            isFinishing={isLeaving}
            onFinish={() => leaveGuide("finish")}
          />
        )
    }
  }

  return (
    <ConsolePage>
      {/* ── welcome ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="console-eyebrow">Getting started</p>
          <h1 className="console-title mt-2">
            {orgName ? `Welcome, ${orgName}` : "Welcome to Osonflow"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {isSetupComplete
              ? "Everything is connected and your assistant is answering customers. This page stays here as a map of the dashboard."
              : "Five short steps, all of them done right here. Leave whenever you like — your progress is saved as you go."}
          </p>
        </div>

        {!hasFinishedGuide ? (
          <Button
            className="shrink-0"
            disabled={isLeaving}
            onClick={() => leaveGuide("skip")}
            size="sm"
            type="button"
            variant="ghost"
          >
            Skip setup
          </Button>
        ) : null}
      </header>

      {/* Only shown while the account is still empty — once someone is two
          steps in, explaining the product again is noise. */}
      {completedCount === 0 ? (
        <ol className="grid gap-2.5 md:grid-cols-3">
          {HOW_IT_WORKS.map((item, index) => (
            <li className="console-card-quiet px-4 py-3.5" key={item.title}>
              <p className="flex items-center gap-1.5">
                <SparklesIcon className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{item.title}</span>
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {item.body}
              </p>
              <span className="sr-only">Step {index + 1}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {/* ── stepper ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[212px_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <StepRail
            activeStep={activeStep}
            completedCount={completedCount}
            doneById={doneById}
            onSelect={setSelectedStep}
            totalCount={totalCount}
          />
        </div>

        <div className="min-w-0">{stepPane()}</div>
      </div>

      {/* ── the map, folded away until asked for ─────────────────────────── */}
      <section className="console-card overflow-hidden">
        <button
          aria-expanded={isMapOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 sm:px-5"
          onClick={() => setIsMapOpen((open) => !open)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="console-medallion size-8 shrink-0">
              <CompassIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="console-section-title block">
                Where everything lives
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                A plain-English version of the menu on the left.
              </span>
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isMapOpen && "rotate-180"
            )}
          />
        </button>

        {isMapOpen ? (
          <div className="animate-in border-t border-[var(--console-hairline-soft)] px-4 py-5 duration-200 fade-in-0 sm:px-5">
            <DashboardMap />
          </div>
        ) : null}
      </section>
    </ConsolePage>
  )
}
