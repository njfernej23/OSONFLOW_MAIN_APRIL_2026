"use client"

import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { ASSISTANT_TOOL_TYPE_LABELS } from "@/modules/assistant-tools/constants"
import { cn } from "@workspace/ui/lib/utils"
import { Loader2Icon } from "lucide-react"
import { useMemo } from "react"

type WidgetToolsPickerProps = {
  value: Id<"assistantTools">[] | undefined
  onChange: (toolIds: Id<"assistantTools">[] | undefined) => void
}

export const WidgetToolsPicker = ({ value, onChange }: WidgetToolsPickerProps) => {
  const tools = useQuery(api.private.assistantTools.list)

  const chatTools = (tools ?? []).filter(
    (tool) => tool.isEnabled && tool.enabledForChat
  )

  const effectiveSelected = useMemo(() => {
    if (!value || value.length === 0) {
      return new Set(chatTools.map((tool) => String(tool._id)))
    }

    return new Set(value.map((toolId) => String(toolId)))
  }, [chatTools, value])

  const isAllSelected =
    chatTools.length > 0 &&
    chatTools.every((tool) => effectiveSelected.has(String(tool._id)))

  const emitSelection = (nextSelected: Set<string>) => {
    const allIds = chatTools.map((tool) => String(tool._id))
    const allSelected = allIds.every((toolId) => nextSelected.has(toolId))

    if (allSelected) {
      onChange(undefined)
      return
    }

    onChange(
      chatTools
        .filter((tool) => nextSelected.has(String(tool._id)))
        .map((tool) => tool._id)
    )
  }

  const toggleTool = (toolId: Id<"assistantTools">, checked: boolean) => {
    const next = new Set(effectiveSelected)

    if (checked) {
      next.add(String(toolId))
    } else {
      next.delete(String(toolId))
    }

    emitSelection(next)
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      onChange(undefined)
      return
    }

    onChange([])
  }

  if (tools === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading assistant tools...
      </div>
    )
  }

  if (chatTools.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
        No chat-enabled tools found. Configure tools in Assistant Tools first, then
        choose which ones this widget can use.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Assistant tools</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose which tools the widget assistant can call. All selected means every
            chat-enabled tool is available.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
          Select all
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {chatTools.map((tool) => {
          const checked = effectiveSelected.has(String(tool._id))

          return (
            <label
              key={tool._id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                checked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/60 bg-background/60"
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(nextChecked) =>
                  toggleTool(tool._id, nextChecked === true)
                }
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{tool.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ASSISTANT_TOOL_TYPE_LABELS[tool.type]}
                  </Badge>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {tool.description}
                </span>
              </span>
            </label>
          )
        })}
      </div>

      {value && value.length > 0 && value.length < chatTools.length ? (
        <p className="text-xs text-muted-foreground">
          {value.length} of {chatTools.length} tools selected for this widget.
        </p>
      ) : null}
    </div>
  )
}
