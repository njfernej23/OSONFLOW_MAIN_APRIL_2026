import { internal } from "../../_generated/api"
import { Doc, Id } from "../../_generated/dataModel"
import { ActionCtx } from "../../_generated/server"
import { buildAssistantToolsForChat } from "../ai/tools/buildAssistantTools"

export const filterAssistantToolsByIds = (
  tools: Doc<"assistantTools">[],
  enabledToolIds?: Id<"assistantTools">[]
) => {
  if (!enabledToolIds || enabledToolIds.length === 0) {
    return tools
  }

  const allowed = new Set(enabledToolIds.map((toolId) => String(toolId)))
  return tools.filter((tool) => allowed.has(String(tool._id)))
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
