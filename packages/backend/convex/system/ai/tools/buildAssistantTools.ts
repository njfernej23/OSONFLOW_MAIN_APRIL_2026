import { createTool } from "@convex-dev/agent"
import z from "zod"
import { internal } from "../../../_generated/api"
import { Doc } from "../../../_generated/dataModel"
import { supportAgent } from "../agents/supportAgent"

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
  configuredTools: Doc<"assistantTools">[]
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

          await supportAgent.saveMessage(ctx, {
            threadId: ctx.threadId,
            message: {
              role: "assistant",
              content: "Conversation escalated to a human operator.",
            },
          })

          return "Conversation escalated to a human operator."
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

          await supportAgent.saveMessage(ctx, {
            threadId: ctx.threadId,
            message: {
              role: "assistant",
              content: "Conversation resolved.",
            },
          })

          return "Conversation resolved."
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
      execute: async (ctx, args): Promise<string> => {
        return ctx.runAction(internal.system.assistantTools.execute.executeTool, {
          organizationId,
          toolName: tool.name,
          args,
          threadId: ctx.threadId,
        })
      },
    })
  }

  return tools
}
