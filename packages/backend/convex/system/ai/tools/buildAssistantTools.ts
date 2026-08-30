import { createTool } from "@convex-dev/agent"
import z from "zod"
import { internal } from "../../../_generated/api"
import { Doc } from "../../../_generated/dataModel"

const buildParameterSchema = (parameters: Doc<"assistantTools">["parameters"]) => {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const parameter of parameters) {
    let field: z.ZodTypeAny =
      parameter.type === "number"
        ? z.number()
        : parameter.type === "boolean"
          ? z.boolean()
          : z.string()

    field = field.describe(parameter.description)

    if (!parameter.required) {
      field = field.optional()
    }

    shape[parameter.name] = field
  }

  return z.object(shape)
}

export const buildAssistantToolsForChat = (
  organizationId: string,
  configuredTools: Doc<"assistantTools">[],
  // Carried through to execution so the callable set is narrowed by the same
  // agent selection that decided which tools were offered here.
  agentId?: string
) => {
  const tools: Record<string, ReturnType<typeof createTool<any, string>>> = {}

  for (const tool of configuredTools) {
    if (tool.type === "handoff") {
      tools[tool.name] = createTool({
        description: tool.description,
        inputSchema: z.object({}),
        execute: async (ctx): Promise<string> => {
          if (!ctx.threadId) {
            return "Missing thread ID"
          }

          await ctx.runMutation(internal.system.conversations.escalate, {
            threadId: ctx.threadId,
          })

          return "The conversation has been escalated to a human operator. Tell the user a teammate will pick this up shortly."
        },
      })
      continue
    }

    if (tool.type === "resolve") {
      tools[tool.name] = createTool({
        description: tool.description,
        inputSchema: z.object({}),
        execute: async (ctx): Promise<string> => {
          if (!ctx.threadId) {
            return "Missing thread ID"
          }

          await ctx.runMutation(internal.system.conversations.resolve, {
            threadId: ctx.threadId,
          })

          return "The conversation has been marked resolved. Close off warmly and invite the user back if they need anything else."
        },
      })
      continue
    }

    tools[tool.name] = createTool({
      description: tool.description,
      inputSchema:
        tool.parameters.length > 0
          ? buildParameterSchema(tool.parameters)
          : z.object({}),
      // The return value goes to the model and nowhere else. It is raw
      // integration output — a spreadsheet row, an API body — and writing it
      // into the thread would put the organization's own data in front of the
      // visitor next to the assistant's actual answer. The model reads it and
      // replies in its own words.
      execute: async (ctx, args): Promise<string> => {
        return await ctx.runAction(
          internal.system.assistantTools.execute.executeTool,
          {
            organizationId,
            toolName: tool.name,
            args,
            threadId: ctx.threadId,
            channel: "chat",
            agentId,
          }
        )
      },
    })
  }

  return tools
}
