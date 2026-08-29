"use client"

import { useState } from "react"
import { api } from "@workspace/backend/_generated/api"
import { useMutation } from "convex/react"
import { ArrowUpRightIcon, KeyRoundIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import { ONBOARDING_STEP_COPY } from "../../../lib/steps"
import { StepField, StepShell } from "../step-shell"

/**
 * The key is saved from inside the guide rather than by sending someone to the
 * Integrations page, because a redirect at step one is where most people stop.
 */
export const ConnectAiStep = ({
  isDone,
  detail,
  onContinue,
}: {
  isDone: boolean
  detail?: string
  onContinue: () => void
}) => {
  const upsertSecret = useMutation(api.private.secrets.upsert)
  const [apiKey, setApiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    const trimmed = apiKey.trim()

    if (!trimmed) {
      toast.error("Paste your OpenAI key first")
      return
    }

    setIsSaving(true)
    try {
      await upsertSecret({
        service: "openai_realtime",
        value: { apiKey: trimmed },
      })
      setApiKey("")
      toast.success("Key saved — your assistant can now write answers")
    } catch {
      toast.error("Could not save that key. Check it and try again.")
    } finally {
      setIsSaving(false)
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
        ) : (
          <Button
            disabled={isSaving || !apiKey.trim()}
            onClick={save}
            size="sm"
            type="button"
          >
            {isSaving ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Save key"
            )}
          </Button>
        )
      }
      isDone={isDone}
      step={ONBOARDING_STEP_COPY["ai-key"]}
    >
      {isDone ? (
        <div className="console-inset flex items-center gap-3 px-4 py-3.5">
          <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Your key is stored and in use. You can replace it any time from
            Integrations.
          </p>
        </div>
      ) : (
        <div className="max-w-xl space-y-4">
          <StepField
            hint={
              <>
                Don&apos;t have one yet? Create a key at{" "}
                <a
                  className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
                  href="https://platform.openai.com/api-keys"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  platform.openai.com
                  <ArrowUpRightIcon className="size-3" />
                </a>
                . It stays private to your workspace and is never shown again
                after saving.
              </>
            }
            label="Your OpenAI key"
          >
            <Input
              autoComplete="off"
              className="h-10 bg-background font-mono text-sm"
              onChange={(event) => setApiKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void save()
                }
              }}
              placeholder="sk-..."
              spellCheck={false}
              type="password"
              value={apiKey}
            />
          </StepField>
        </div>
      )}
    </StepShell>
  )
}
