"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { BracesIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { EmptyState } from "@/modules/dashboard/ui/components/console"
import { createEmptyParameter, type AssistantTool } from "../../constants"

type ToolParameters = AssistantTool["parameters"]

type ToolParametersEditorProps = {
  parameters: ToolParameters
  onChange: (parameters: ToolParameters) => void
}

export const ToolParametersEditor = ({
  parameters,
  onChange,
}: ToolParametersEditorProps) => {
  const updateParameter = (
    index: number,
    field: keyof ToolParameters[number],
    value: string | boolean
  ) => {
    onChange(
      parameters.map((parameter, parameterIndex) =>
        parameterIndex === index ? { ...parameter, [field]: value } : parameter
      )
    )
  }

  if (parameters.length === 0) {
    return (
      <EmptyState
        action={
          <Button
            onClick={() => onChange([createEmptyParameter()])}
            size="sm"
            type="button"
          >
            <PlusIcon />
            Add parameter
          </Button>
        }
        className="min-h-[12rem]"
        description="Without parameters the assistant calls this tool with no arguments."
        icon={BracesIcon}
        title="No parameters yet"
      />
    )
  }

  return (
    <div className="space-y-2.5">
      {parameters.map((parameter, index) => (
        <div
          className="console-inset space-y-3 p-3.5"
          key={`parameter-${index}`}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label className="console-label">Name</Label>
              <Input
                className="font-mono text-xs"
                onChange={(event) =>
                  updateParameter(index, "name", event.target.value)
                }
                placeholder="email"
                value={parameter.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="console-label">
                What the assistant should put here
              </Label>
              <Input
                onChange={(event) =>
                  updateParameter(index, "description", event.target.value)
                }
                placeholder="Email address of the customer to look up"
                value={parameter.description}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              onValueChange={(value: "string" | "number" | "boolean") =>
                updateParameter(index, "type", value)
              }
              value={parameter.type}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>

            <label className="console-inset flex cursor-pointer items-center gap-2 px-3 py-1.5">
              <Switch
                checked={parameter.required}
                onCheckedChange={(checked) =>
                  updateParameter(index, "required", checked)
                }
              />
              <span className="text-xs text-muted-foreground">Required</span>
            </label>

            <Button
              aria-label={`Remove parameter ${parameter.name || index + 1}`}
              className="ml-auto"
              onClick={() =>
                onChange(
                  parameters.filter(
                    (_, parameterIndex) => parameterIndex !== index
                  )
                )
              }
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      ))}

      <Button
        onClick={() => onChange([...parameters, createEmptyParameter()])}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        Add parameter
      </Button>
    </div>
  )
}
