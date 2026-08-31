import { internal } from "../../_generated/api"
import { Doc, Id } from "../../_generated/dataModel"
import { ActionCtx } from "../../_generated/server"
import { buildAssistantToolsForChat } from "../ai/tools/buildAssistantTools"

export const filterAssistantToolsByIds = (
  tools: Doc<"assistantTools">[],
  enabledToolIds?: Id<"assistantTools">[]
) => {
  if (enabledToolIds === undefined) {
    return tools
  }

  if (enabledToolIds.length === 0) {
    return []
  }

  const allowed = new Set(enabledToolIds.map((toolId) => String(toolId)))
  return tools.filter((tool) => allowed.has(String(tool._id)))
}

export const requiresLiveToolExecution = (tools: Doc<"assistantTools">[]) =>
  tools.some(
    (tool) =>
      tool.isEnabled &&
      tool.enabledForChat &&
      (tool.type === "google_sheets" ||
        tool.type === "google_calendar" ||
        tool.type === "api_request" ||
        tool.type === "custom_webhook")
  )

export const resolveChatToolsForWidget = (
  dynamicTools: Record<string, any>,
  enabledToolIds: Id<"assistantTools">[] | undefined,
  legacyTools: Record<string, any>
): Record<string, any> => {
  if (enabledToolIds !== undefined && enabledToolIds.length === 0) {
    return {}
  }

  if (Object.keys(dynamicTools).length > 0) {
    return dynamicTools
  }

  if (enabledToolIds === undefined) {
    return legacyTools
  }

  return {}
}

export const getEnabledChatTools = async (
  ctx: ActionCtx,
  organizationId: string,
  enabledToolIds?: Id<"assistantTools">[],
  agentId?: string
) => {
  const configuredTools: Doc<"assistantTools">[] = await ctx.runQuery(
    internal.system.assistantTools.listEnabledForOrganization,
    {
      organizationId,
      channel: "chat",
    }
  )

  const filteredTools = filterAssistantToolsByIds(configuredTools, enabledToolIds)

  if (filteredTools.length === 0) {
    return {}
  }

  return buildAssistantToolsForChat(organizationId, filteredTools, agentId)
}

export const buildToolAwareSystemPrompt = (
  basePrompt: string,
  tools: Doc<"assistantTools">[]
) => {
  if (tools.length === 0) {
    return basePrompt
  }

  const toolLines = tools
    .map((tool) => `- **${tool.name}** → ${tool.description}`)
    .join("\n")

  return `${basePrompt}

## Available tools
${toolLines}

Use the appropriate tool when you need knowledge base data, external integrations, or conversation actions before answering.

After a tool returns data, reply in clear natural language. Never paste raw JSON or tool output directly to the user. Summarize the result conversationally.

Tool results are internal. When a tool records or submits something, confirm it in one short sentence in the user's own language — that it is done and what happens next — without repeating the values that were submitted, the sheet or system it went to, or any identifiers. When a tool looks something up, answer the question with what it found and nothing more.`
}
