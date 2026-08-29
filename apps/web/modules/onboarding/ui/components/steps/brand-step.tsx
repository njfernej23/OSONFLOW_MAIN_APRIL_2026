"use client"

import { useState } from "react"
import { api } from "@workspace/backend/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { getContrastingTextColor } from "@workspace/ui/lib/widget-customization"

import { ONBOARDING_STEP_COPY } from "../../../lib/steps"
import { StepField, StepShell } from "../step-shell"

const DEFAULT_AGENT_ID = "default"

/** One colour drives the header, the bubbles and the button. */
const BRAND_COLOURS = [
  "#000000",
  "#1e3a8a",
  "#0f766e",
  "#15803d",
  "#c2410c",
  "#6d28d9",
  "#be185d",
  "#111827",
]

/**
 * Three decisions — name, greeting, colour — published straight from the
 * guide. The full designer stays one click away for anyone who wants gradients
 * and launcher offsets; nobody should need them to go live.
 */
export const BrandStep = ({
  isDone,
  detail,
  onContinue,
}: {
  isDone: boolean
  detail?: string
  onContinue: () => void
}) => {
  const state = useQuery(api.private.widgetSettings.getCustomizationState, {
    agentId: DEFAULT_AGENT_ID,
  })
  const saveDraft = useMutation(api.private.widgetSettings.saveDraft)
  const publishDraft = useMutation(api.private.widgetSettings.publishDraft)

  // Only what the operator has actually typed is held locally; everything
  // else is read straight from the saved draft. There is no effect copying the
  // query into state, so a reactive update can never clobber a half-typed
  // field, and the fields are correct on the very first render.
  const [edits, setEdits] = useState<{
    assistantName?: string
    greeting?: string
    brandColor?: string
  }>({})
  const [isPublishing, setIsPublishing] = useState(false)

  const assistantName =
    edits.assistantName ??
    state?.draft.theme?.assistantName ??
    "Support Assistant"
  const greeting = edits.greeting ?? state?.draft.greetMessage ?? ""
  const brandColor =
    edits.brandColor ?? state?.draft.theme?.primaryColor ?? "#000000"

  const publish = async () => {
    if (!state) {
      return
    }

    const draft = state.draft
    const helpTopics = Array.isArray(draft.helpTopics) ? draft.helpTopics : []
    // The saved snapshot can still hold legacy topic cards; the mutation only
    // accepts article cards, so they are normalized on the way through.
    const homeCards = (draft.homeCards ?? []).flatMap((card) =>
      card.type === "article"
        ? [
            {
              type: "article" as const,
              topicIndex: card.topicIndex,
              articleIndex: card.articleIndex ?? 0,
            },
          ]
        : []
    )

    setIsPublishing(true)
    try {
      await saveDraft({
        agentId: DEFAULT_AGENT_ID,
        greetMessage: greeting.trim() || "Hi! How can I help you today?",
        systemPrompt: draft.systemPrompt,
        enabledToolIds: draft.enabledToolIds,
        chatSettings: draft.chatSettings,
        defaultSuggestions: draft.defaultSuggestions,
        helpTopics,
        homeCards,
        openaiRealtimeSettings: draft.openaiRealtimeSettings,
        geminiLiveSettings: draft.geminiLiveSettings,
        voiceCallSettings: draft.voiceCallSettings,
        widgetCopy: draft.widgetCopy,
        theme: {
          ...draft.theme,
          assistantName: assistantName.trim() || "Support Assistant",
          primaryColor: brandColor,
          headerGradientStart: brandColor,
          headerGradientEnd: brandColor,
          userBubbleColor: brandColor,
        },
        appearance: {
          ...draft.appearance,
          launcherColor: brandColor,
        },
      })
      const result = await publishDraft({ agentId: DEFAULT_AGENT_ID })
      toast.success(`Published v${result.publishedVersion}`, {
        description: "Your customers will see this the next time they open it.",
      })
      onContinue()
    } catch {
      toast.error("Could not publish that. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  const bubbleTextColor = getContrastingTextColor(brandColor)

  return (
    <StepShell
      detail={detail}
      footer={
        <>
          {isDone ? (
            <Button
              onClick={onContinue}
              size="sm"
              type="button"
              variant="ghost"
            >
              Skip ahead
            </Button>
          ) : null}
          <Button
            className="gap-1.5"
            disabled={!state || isPublishing}
            onClick={publish}
            size="sm"
            type="button"
          >
            {isPublishing ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Publishing
              </>
            ) : (
              <>
                <SendIcon className="size-3.5" />
                Publish
              </>
            )}
          </Button>
        </>
      }
      isDone={isDone}
      step={ONBOARDING_STEP_COPY.widget}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0 space-y-4">
          <StepField label="What should it be called?">
            <Input
              className="h-10 bg-background text-sm"
              onChange={(event) =>
                setEdits((current) => ({
                  ...current,
                  assistantName: event.target.value,
                }))
              }
              placeholder="Support Assistant"
              value={assistantName}
            />
          </StepField>

          <StepField
            hint="The first thing a customer reads when they open the chat."
            label="How should it say hello?"
          >
            <Textarea
              className="resize-none bg-background text-sm"
              onChange={(event) =>
                setEdits((current) => ({
                  ...current,
                  greeting: event.target.value,
                }))
              }
              placeholder="Hi! How can I help you today?"
              rows={3}
              value={greeting}
            />
          </StepField>

          <StepField
            hint="Used for the chat header, your customer's messages and the button on your site. Fine-tune every colour later in the designer."
            label="Your colour"
          >
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_COLOURS.map((colour) => (
                <button
                  aria-label={`Use ${colour}`}
                  className={cn(
                    "size-8 rounded-full border-2 transition-transform hover:scale-110",
                    brandColor.toLowerCase() === colour
                      ? "border-foreground"
                      : "border-transparent"
                  )}
                  key={colour}
                  onClick={() =>
                    setEdits((current) => ({ ...current, brandColor: colour }))
                  }
                  style={{ backgroundColor: colour }}
                  type="button"
                />
              ))}
              <span className="relative">
                <input
                  aria-label="Pick a custom colour"
                  className="size-8 cursor-pointer rounded-full border border-[var(--console-hairline)] bg-background p-0.5"
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      brandColor: event.target.value,
                    }))
                  }
                  type="color"
                  value={brandColor}
                />
              </span>
            </div>
          </StepField>
        </div>

        {/* Live proof that the three fields above are the whole decision. */}
        <div className="min-w-0">
          <p className="console-label">Preview</p>
          <div className="console-inset mt-2 overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ backgroundColor: brandColor }}
            >
              <span
                className="flex size-6 items-center justify-center rounded-lg bg-white/20 text-[10px] font-bold"
                style={{ color: bubbleTextColor }}
              >
                {(assistantName.trim() || "SA").slice(0, 1).toUpperCase()}
              </span>
              <span
                className="truncate text-[11px] font-semibold"
                style={{ color: bubbleTextColor }}
              >
                {assistantName.trim() || "Support Assistant"}
              </span>
            </div>
            <div className="space-y-2 bg-background px-3 py-3">
              <p className="max-w-[92%] rounded-[4px_12px_12px_12px] bg-muted px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground">
                {greeting.trim() || "Hi! How can I help you today?"}
              </p>
              <p
                className="ml-auto max-w-[80%] rounded-[12px_12px_4px_12px] px-2.5 py-1.5 text-[11px] leading-relaxed"
                style={{ backgroundColor: brandColor, color: bubbleTextColor }}
              >
                Do you deliver on Sundays?
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepShell>
  )
}
