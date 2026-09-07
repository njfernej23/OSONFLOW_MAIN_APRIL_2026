import { internal } from "../../_generated/api"
import { Doc, Id } from "../../_generated/dataModel"
import { ActionCtx } from "../../_generated/server"
import { buildAssistantToolsForChat } from "../ai/tools/buildAssistantTools"
import { buildGoogleSheetsToolGuidance } from "../../lib/assistantTools"

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

/**
 * Tool types that either reach outside the app or change something when they
 * run. Their answers are true only for the moment they were produced, so a
 * reply that involved one must never be replayed from a cache.
 */
const LIVE_TOOL_TYPES = new Set([
  "google_sheets",
  "google_calendar",
  "api_request",
  "custom_webhook",
])

const isActiveChatTool = (tool: Doc<"assistantTools">) =>
  tool.isEnabled && tool.enabledForChat

/**
 * Names of the live tools the model may call on this turn. A reply is cacheable
 * only if none of these were actually invoked while producing it — which is a
 * far narrower rule than refusing to cache anything at all for an organization
 * that merely has an integration switched on.
 */
export const getLiveChatToolNames = (tools: Doc<"assistantTools">[]) =>
  tools
    .filter((tool) => isActiveChatTool(tool) && LIVE_TOOL_TYPES.has(tool.type))
    .map((tool) => tool.name)

/**
 * Identifies the tool roster a cached answer was produced under. Editing,
 * enabling or removing a tool changes what the assistant would say next time,
 * so entries carrying a different fingerprint are ignored rather than served.
 */
export const buildChatToolsFingerprint = (tools: Doc<"assistantTools">[]) =>
  tools
    .filter(isActiveChatTool)
    .map((tool) => `${tool.name}@${tool.updatedAt}`)
    .sort()
    .join("|")

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

  const sheetsGuidance = buildGoogleSheetsToolGuidance(tools)

  return `${basePrompt}

## Available tools
${toolLines}${sheetsGuidance ? `\n\n${sheetsGuidance}` : ""}

Use the appropriate tool when you need knowledge base data, external integrations, or conversation actions before answering.

After a tool returns data, reply in clear natural language. Never paste raw JSON or tool output directly to the user. Summarize the result conversationally.

Tool results are internal. When a tool records or submits something, confirm it in one short sentence in the user's own language — that it is done and what happens next — without repeating the values that were submitted, the sheet or system it went to, or any identifiers. When a tool looks something up, answer the question with what it found and nothing more.`
}
