import { Hint } from "@workspace/ui/components/hint"
import { Doc } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from "lucide-react"

export const ConversationStatusButton = ({
  status,
  onClick,
  disabled,
}: {
  status: Doc<"conversations">["status"]
  onClick: () => void
  disabled?: boolean
}) => {
  if (status === "resolved") {
    return (
      <Hint text="Mark as unresolved">
        <Button
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="outline"
          className="gap-1.5 border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/14 dark:text-emerald-300"
        >
          <CheckIcon className="size-3.5 text-emerald-600" />
          Resolved
        </Button>
      </Hint>
    )
  }

  if (status === "escalated") {
    return (
      <Hint text="Mark as resolved">
        <Button
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="outline"
          className="gap-1.5 border-amber-500/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/14 dark:text-amber-300"
        >
          <ArrowUpIcon className="size-3.5" />
          Escalated
        </Button>
      </Hint>
    )
  }

  return (
    <Hint text="Mark as escalated">
      <Button
        disabled={disabled}
        onClick={onClick}
        size="sm"
        variant="outline"
        className="gap-1.5 border-sky-500/25 bg-sky-500/10 text-sky-700 hover:bg-sky-500/14 dark:text-sky-300"
      >
        <ArrowRightIcon className="size-3.5" />
        Open
      </Button>
    </Hint>
  )
}
