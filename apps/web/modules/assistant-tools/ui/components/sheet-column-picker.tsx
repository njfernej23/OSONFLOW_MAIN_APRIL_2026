"use client"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { Loader2Icon } from "lucide-react"

type SheetColumnPickerProps = {
  label: string
  description?: string
  columns: string[]
  selected: string[]
  isLoading?: boolean
  emptyMessage?: string
  onChange: (columns: string[]) => void
}

export const SheetColumnPicker = ({
  label,
  description,
  columns,
  selected,
  isLoading = false,
  emptyMessage = "Select a spreadsheet and sheet tab to load column headers.",
  onChange,
}: SheetColumnPickerProps) => {
  const selectedSet = new Set(selected)

  const toggleColumn = (column: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, column])
      return
    }

    onChange(selected.filter((value) => value !== column))
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading column headers...
        </div>
      ) : columns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {columns.map((column) => {
            const checked = selectedSet.has(column)

            return (
              <label
                key={column}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-background/50"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) =>
                    toggleColumn(column, nextChecked === true)
                  }
                />
                <span className="truncate">{column}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
