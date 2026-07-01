import { internal } from "../../_generated/api"
import { Doc } from "../../_generated/dataModel"
import { ActionCtx } from "../../_generated/server"
import { buildAssistantToolsForChat } from "../ai/tools/buildAssistantTools"

export const getEnabledChatTools = async (
  ctx: ActionCtx,
  organizationId: string
) => {
  const configuredTools: Doc<"assistantTools">[] = await ctx.runQuery(
    internal.system.assistantTools.listEnabledForOrganization,
    {
      organizationId,
      channel: "chat",
    }
  )

  if (configuredTools.length === 0) {
    return {}
  }

  return buildAssistantToolsForChat(organizationId, configuredTools)
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
