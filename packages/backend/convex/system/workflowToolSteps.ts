import { v } from "convex/values"

import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import {
  asString,
  isRecord,
  renderTemplate,
  type JsonRecord,
  type RuntimeVariables,
} from "../lib/workflowEngine"

/**
 * Renders a Tool block's argument templates against the current workflow
 * variables. Values stay strings: every assistant tool executor interpolates
 * them into its own templates.
 */
export const buildToolArgs = (
  data: JsonRecord,
  variables: RuntimeVariables
): Record<string, string> => {
  const entries = Array.isArray(data.arguments) ? data.arguments : []
  const args: Record<string, string> = {}

  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue
    }

    const name = asString(entry.name).trim()

    if (!name) {
      continue
    }

    args[name] = renderTemplate(asString(entry.value), variables)
  }

  return args
}

/** executeTool answers with this sentence rather than throwing. */
const isUnavailable = (result: string) => /is not available\.$/.test(result.trim())

export const runNode = internalAction({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const context = await ctx.runQuery(
      internal.system.workflowApiSteps.getStepContext,
      {
        sessionId: args.sessionId,
        conversationId: args.conversationId,
        nodeId: args.nodeId,
      }
    )

    if (!context) {
      return { ok: false, error: "Session not ready for Tool step" }
    }

    const data = isRecord(context.nodeData) ? context.nodeData : {}
    const variables = context.variables as RuntimeVariables
    const toolName = renderTemplate(asString(data.toolName), variables).trim()
    const outputVariable =
      asString(data.outputVariable).trim() || "toolResult"

    let ok = true
    let error: string | undefined
    let result = ""

    if (!toolName) {
      ok = false
      error = "This Tool step has no tool selected."
    } else {
      try {
        result = await ctx.runAction(
          internal.system.assistantTools.execute.executeTool,
          {
            organizationId: context.organizationId,
            toolName,
            args: buildToolArgs(data, variables),
            threadId: context.threadId,
            channel: "chat",
          }
        )

        if (isUnavailable(result)) {
          ok = false
          error = result
        }
      } catch (caught) {
        ok = false
        error = caught instanceof Error ? caught.message : "Tool step failed."
      }
    }

    await ctx.runMutation(internal.system.workflowRuntime.continueAfterAction, {
      sessionId: args.sessionId,
      conversationId: args.conversationId,
      nodeId: args.nodeId,
      kind: "tool",
      ok,
      status: ok ? 200 : 0,
      resultVariables: ok ? { [outputVariable]: result } : {},
      error,
    })

    return { ok, error }
  },
})
