"use client"

import { useState } from "react"
import { useOrganization } from "@clerk/nextjs"
import { api } from "@workspace/backend/_generated/api"
import { useQuery } from "convex/react"
import { CheckIcon, CopyIcon, MailIcon, RadioIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  DEFAULT_WIDGET_SCRIPT_URL,
  INTEGRATION_SNIPPET_BUILDERS,
} from "@/modules/integrations/constants"

import { ONBOARDING_STEP_COPY } from "../../../lib/steps"
import { StepShell } from "../step-shell"

const DEFAULT_AGENT_ID = "default"

/**
 * The handover point.
 *
 * Most owners will not paste this themselves, so the snippet sits next to a
 * pre-written email rather than only a copy button — the real task here is
 * "get this to whoever runs the website", not "copy to clipboard".
 */
export const InstallStep = ({
  isDone,
  detail,
  onContinue,
}: {
  isDone: boolean
  detail?: string
  onContinue: () => void
}) => {
  const { organization } = useOrganization()
  const customization = useQuery(
    api.private.widgetSettings.getCustomizationState,
    { agentId: DEFAULT_AGENT_ID }
  )
  const [hasCopied, setHasCopied] = useState(false)

  const organizationId = organization?.id ?? ""
  const position =
    customization?.draft.appearance?.launcherPosition === "bottom-left"
      ? "bottom-left"
      : "bottom-right"

  const snippet = organizationId
    ? INTEGRATION_SNIPPET_BUILDERS.html5({
        organizationId,
        scriptUrl: DEFAULT_WIDGET_SCRIPT_URL,
        position,
        agentId: DEFAULT_AGENT_ID,
      })
    : ""

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setHasCopied(true)
      window.setTimeout(() => setHasCopied(false), 2000)
      toast.success("Copied")
    } catch {
      toast.error("Could not copy. Select the code and copy it manually.")
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    "Please add our chat assistant to the website"
  )}&body=${encodeURIComponent(
    `Hi,\n\nPlease paste the line below into our website, just before the closing </body> tag on every page. It adds our support chat button.\n\n${snippet}\n\nThanks!`
  )}`

  return (
    <StepShell
      detail={detail}
      footer={
        isDone ? (
          <Button onClick={onContinue} size="sm" type="button">
            Next step
          </Button>
        ) : (
          <Button
            className="gap-1.5"
            disabled={!snippet}
            onClick={copy}
            size="sm"
            type="button"
          >
            {hasCopied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {hasCopied ? "Copied" : "Copy the code"}
          </Button>
        )
      }
      isDone={isDone}
      step={ONBOARDING_STEP_COPY.install}
    >
      <div className="space-y-4">
        <div className="console-inset overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--console-hairline-soft)] px-3.5 py-2">
            <p className="console-label">Paste before &lt;/body&gt;</p>
            <button
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              disabled={!snippet}
              onClick={copy}
              type="button"
            >
              {hasCopied ? (
                <CheckIcon className="size-3" />
              ) : (
                <CopyIcon className="size-3" />
              )}
              {hasCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[11px] leading-relaxed text-foreground/85">
            {snippet || "Loading your snippet…"}
          </pre>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild className="gap-1.5" size="sm" variant="outline">
            <a href={mailtoHref}>
              <MailIcon className="size-3.5" />
              Email this to my developer
            </a>
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Opens your mail app with the instructions already written.
          </p>
        </div>

        {/* Live confirmation beats asking someone to trust that it worked. */}
        <div
          className={
            isDone
              ? "console-inset flex items-center gap-3 border-[color-mix(in_srgb,var(--console-positive)_40%,transparent)] bg-[color-mix(in_srgb,var(--console-positive)_8%,transparent)] px-4 py-3"
              : "console-inset flex items-center gap-3 px-4 py-3"
          }
        >
          <span className="relative flex size-2.5 shrink-0">
            {!isDone ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
            ) : null}
            <span
              className={
                isDone
                  ? "relative inline-flex size-2.5 rounded-full bg-[var(--console-positive)]"
                  : "relative inline-flex size-2.5 rounded-full bg-primary"
              }
            />
          </span>
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {isDone ? (
              <span className="text-foreground">
                Detected — someone has opened the chat on your site.
              </span>
            ) : (
              <>
                Waiting for the first visitor. This ticks itself the moment the
                chat button loads on your website.
              </>
            )}
          </p>
          <RadioIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        </div>
      </div>
    </StepShell>
  )
}
