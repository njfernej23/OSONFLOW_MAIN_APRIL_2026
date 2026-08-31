"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAction, useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Loader2Icon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"

/** Concrete goals produce far better graphs than abstract ones, so seed the box. */
const EXAMPLES = [
  "Book an appointment: ask what they need, take their name and phone, check it is within opening hours, then confirm someone will call back.",
  "Handle a refund request: find the order number, ask why, and hand anything over 30 days old to a human.",
  "Qualify a new lead: find out what they are looking for and their budget, then route them to the right team.",
]

type GeneratedDefinition = {
  schemaVersion: number
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
}

/**
 * Drafting a whole workflow from a sentence.
 *
 * The generated graph is saved as a normal draft workflow and opened on the
 * canvas rather than published, because a flow that runs against real customers
 * is exactly the thing someone should look at before it goes live.
 */
export const CreateWithAiDialog = ({
  trigger,
}: {
  trigger: React.ReactNode
}) => {
  const router = useRouter()
  const generateWorkflowDraft = useAction(
    api.private.aiSetup.generateWorkflowDraft
  )
  const saveWorkflow = useMutation(api.private.workflows.save)

  const [isOpen, setIsOpen] = useState(false)
  const [goal, setGoal] = useState("")
  const [isWorking, setIsWorking] = useState(false)

  const handleGenerate = async () => {
    const trimmedGoal = goal.trim()

    if (!trimmedGoal) return

    setIsWorking(true)
    try {
      const definition = (await generateWorkflowDraft({
        goal: trimmedGoal,
      })) as GeneratedDefinition

      const saved = await saveWorkflow({
        name: definition.name,
        description: definition.description ?? null,
        definition: {
          schemaVersion: definition.schemaVersion ?? 1,
          name: definition.name,
          description: definition.description,
          nodes: definition.nodes,
          edges: definition.edges,
        },
      })

      toast.success("Workflow drafted. Check the steps before you publish it.")
      setIsOpen(false)
      setGoal("")
      router.push(`/workflows/${saved.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not draft that workflow."
      )
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Draft a workflow with AI</DialogTitle>
          <DialogDescription>
            Describe what should happen, in your own words. It draws the steps
            and opens them on the canvas for you to check.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Textarea
            autoFocus
            disabled={isWorking}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Book an appointment: ask what they need, take their name and phone, then confirm someone will call back."
            rows={4}
            value={goal}
          />

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Or start from one of these
            </p>
            {EXAMPLES.map((example) => (
              <button
                className="rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                disabled={isWorking}
                key={example}
                onClick={() => setGoal(example)}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isWorking}
            onClick={() => setIsOpen(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isWorking || !goal.trim()} onClick={handleGenerate}>
            {isWorking ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Drawing the steps
              </>
            ) : (
              <>
                <SparklesIcon className="size-4" />
                Draft it
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
