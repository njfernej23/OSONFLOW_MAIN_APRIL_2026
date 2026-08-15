import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface ConversationStatusIconProps {
  className?: string
  status: "unresolved" | "escalated" | "resolved"
}

const statusConfig = {
  resolved: {
    icon: CheckIcon,
    bgColor: "bg-[#3FB62F]",
  },
  unresolved: {
    icon: ArrowRightIcon,
    bgColor: "bg-destructive",
  },
  escalated: {
    icon: ArrowUpIcon,
    bgColor: "bg-yellow-500",
  },
} as const

export const ConversationStatusIcon = ({
  className,
  status,
}: ConversationStatusIconProps) => {
  const config = statusConfig[status] ?? statusConfig.unresolved
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full",
        config.bgColor,
        className
      )}
    >
      <Icon className="size-3 stroke-[3] text-white" />
    </div>
  )
}
