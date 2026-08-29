"use client"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  CopyIcon,
  FlaskConicalIcon,
  Loader2Icon,
  PlayIcon,
  TriangleAlertIcon,
  WandSparklesIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Pill } from "@/modules/dashboard/ui/components/console"
import type { AssistantTool } from "../../constants"

type TestRun = {
  output: string
  durationMs: number
  failed: boolean
}

type ToolTestConsoleProps = {
  parameters: AssistantTool["parameters"]
  /** Non-null when the tool cannot be exercised yet, with the reason shown. */
  blockedReason: string | null
  onRun: (args: Record<string, unknown>) => Promise<string>
}

const sampleValueForType = (
  type: AssistantTool["parameters"][number]["type"]
) => {
  if (type === "number") return 0
  if (type === "boolean") return false
  return ""
}

/** Mount with a `key` per tool so a previous run never leaks into the next. */
export const ToolTestConsole = ({
  parameters,
  blockedReason,
  onRun,
}: ToolTestConsoleProps) => {
  const [argsJson, setArgsJson] = useState("{}")
  const [isRunning, setIsRunning] = useState(false)
  const [run, setRun] = useState<TestRun | null>(null)

  const fillSample = () => {
    const sample = parameters.reduce(
      (accumulator, parameter) => {
        if (!parameter.name.trim()) return accumulator
        accumulator[parameter.name] = sampleValueForType(parameter.type)
        return accumulator
      },
      {} as Record<string, unknown>
    )

    setArgsJson(JSON.stringify(sample, null, 2))
  }

  const handleRun = async () => {
    let parsed: Record<string, unknown>

    try {
      const candidate = JSON.parse(argsJson || "{}") as unknown

      if (
        typeof candidate !== "object" ||
        candidate === null ||
        Array.isArray(candidate)
      ) {
        throw new Error("Arguments must be a JSON object.")
      }

      parsed = candidate as Record<string, unknown>
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Arguments must be valid JSON."
      setRun({ output: message, durationMs: 0, failed: true })
      return
    }

    setIsRunning(true)
    setRun(null)
    const startedAt = performance.now()

    try {
      const output = await onRun(parsed)
      setRun({
        output,
        durationMs: Math.round(performance.now() - startedAt),
        failed: false,
      })
    } catch (error) {
      setRun({
        output: error instanceof Error ? error.message : "Test failed.",
        durationMs: Math.round(performance.now() - startedAt),
        failed: true,
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        aria-label="Test arguments as JSON"
        className="font-mono text-xs"
        onChange={(event) => setArgsJson(event.target.value)}
        placeholder='{"email":"jane@example.com"}'
        rows={4}
        value={argsJson}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={isRunning || Boolean(blockedReason)}
          onClick={handleRun}
          size="sm"
          type="button"
        >
          {isRunning ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
          Run test
        </Button>
        <Button
          disabled={parameters.length === 0}
          onClick={fillSample}
          size="sm"
          type="button"
          variant="outline"
        >
          <WandSparklesIcon />
          Fill sample
        </Button>

        {blockedReason ? (
          <p className="console-tone-warning flex items-center gap-1.5 text-xs">
            <TriangleAlertIcon className="size-3.5" />
            {blockedReason}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Runs against the saved configuration, exactly as the assistant
            would.
          </p>
        )}
      </div>

      {run ? (
        <div className="console-inset overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--console-hairline-soft)] px-3 py-2">
            <div className="flex items-center gap-2">
              <Pill
                icon={FlaskConicalIcon}
                tone={run.failed ? "critical" : "positive"}
              >
                {run.failed ? "Failed" : "Completed"}
              </Pill>
              <span className="console-numeral text-xs text-muted-foreground">
                {run.durationMs} ms
              </span>
              <span className="text-xs text-muted-foreground">
                {run.output.length} chars
              </span>
            </div>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(run.output)
                toast.success("Response copied")
              }}
              size="xs"
              type="button"
              variant="ghost"
            >
              <CopyIcon />
              Copy
            </Button>
          </div>
          <pre
            className={cn(
              "max-h-56 overflow-auto px-3 py-2.5 font-mono text-xs whitespace-pre-wrap",
              run.failed && "console-tone-critical"
            )}
          >
            {run.output}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
