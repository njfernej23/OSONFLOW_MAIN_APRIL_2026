import {
  Building2Icon,
  DatabaseIcon,
  SendIcon,
  ShieldCheckIcon,
  SquareTerminalIcon,
  UserRoundCogIcon,
  WorkflowIcon,
} from "lucide-react"

import type { CatalogCategoryId, CatalogIcon } from "./types"

export const CATALOG_CATEGORIES: Array<{
  id: CatalogCategoryId
  label: string
  description: string
  icon: CatalogIcon
}> = [
  {
    id: "assistant",
    label: "Assistant actions",
    description: "Built-in behaviour every assistant ships with.",
    icon: ShieldCheckIcon,
  },
  {
    id: "data",
    label: "Data & records",
    description: "Read and write rows in the systems your team already keeps.",
    icon: DatabaseIcon,
  },
  {
    id: "messaging",
    label: "Messaging & alerts",
    description: "Let the assistant reach a person or a channel.",
    icon: SendIcon,
  },
  {
    id: "crm",
    label: "Customer & billing",
    description: "Customer, subscription, order and support records.",
    icon: Building2Icon,
  },
  {
    id: "productivity",
    label: "Work management",
    description: "Tickets, tasks and bookings in the tools your team runs on.",
    icon: UserRoundCogIcon,
  },
  {
    id: "automation",
    label: "Automation",
    description: "Hand work off to an automation platform you already run.",
    icon: WorkflowIcon,
  },
  {
    id: "custom",
    label: "Custom & developer",
    description: "Anything with an HTTP endpoint.",
    icon: SquareTerminalIcon,
  },
]

export const CATALOG_CATEGORY_LABELS = CATALOG_CATEGORIES.reduce(
  (labels, category) => {
    labels[category.id] = category.label
    return labels
  },
  {} as Record<CatalogCategoryId, string>
)
