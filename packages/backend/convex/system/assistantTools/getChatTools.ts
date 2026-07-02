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
  enabledToolIds?: Id<"assistantTools">[]
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

  return buildAssistantToolsForChat(organizationId, filteredTools)
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

Use the appropriate tool when you need knowledge base data, external integrations, or conversation actions before answering.`
}
