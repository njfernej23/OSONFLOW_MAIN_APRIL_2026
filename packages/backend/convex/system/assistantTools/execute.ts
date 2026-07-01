"use node"

import { v } from "convex/values"
import { internalAction } from "../../_generated/server"
import { internal } from "../../_generated/api"
import { Doc } from "../../_generated/dataModel"
import { interpolateTemplate } from "../../lib/assistantTools"
import { generateText } from "ai"
import { getRagForOrganization } from "../ai/rag"
import { SEARCH_INTERPRETER_PROMPT } from "../ai/constants"
import { getOpenAIChatModelFromSecretValue } from "../../lib/openai"
import { resolveGoogleSheetsAuth } from "../../lib/googleSheetsAuth"
import {
  executeGoogleSheetsOperation,
  type GoogleSheetsOperation,
} from "../../lib/googleSheetsCrud"

const executeGoogleSheets = async (
  ctx: any,
  tool: Doc<"assistantTools">,
  args: Record<string, unknown>
): Promise<string> => {
  const spreadsheetId = tool.config?.spreadsheetId?.trim()
  const range = tool.config?.range?.trim() || "Sheet1"
  const operation = (tool.config?.operation ?? "lookup") as GoogleSheetsOperation

  if (!spreadsheetId) {
    return "Google Sheets tool is missing a spreadsheet ID."
  }

  const auth = await resolveGoogleSheetsAuth(ctx, tool.organizationId)

  if (!auth) {
    return "Google Sheets is not connected. Connect your Google account in Assistant Tools."
  }

  try {
    return await executeGoogleSheetsOperation({
      auth,
      spreadsheetId,
      range,
      operation,
      searchColumns: tool.config?.searchColumns ?? [],
      valueColumns: tool.config?.valueColumns ?? [],
      updateColumns: tool.config?.updateColumns ?? [],
      args,
    })
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Unable to complete the Google Sheets action."
  }
}

const executeApiRequest = async (
  tool: Doc<"assistantTools">,
  args: Record<string, unknown>
): Promise<string> => {
  const url = tool.config?.url?.trim()

  if (!url) {
    return "API Request tool is missing a URL."
  }

  const method = tool.config?.method ?? "POST"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (tool.config?.headersJson?.trim()) {
    try {
      const parsed = JSON.parse(tool.config.headersJson) as Record<
        string,
        string
      >
      Object.assign(headers, parsed)
    } catch {
      return "API Request tool has invalid headers JSON."
    }
  }

  const body =
    method === "POST"
      ? tool.config?.bodyTemplate
        ? interpolateTemplate(tool.config.bodyTemplate, args)
        : JSON.stringify(args)
      : undefined

  const requestUrl =
    method === "GET"
      ? `${url}${url.includes("?") ? "&" : "?"}${new URLSearchParams(
          Object.fromEntries(
            Object.entries(args).map(([key, value]) => [key, String(value ?? "")])
          )
        ).toString()}`
      : url

  const response = await fetch(requestUrl, {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  })

  const text = await response.text()

  if (!response.ok) {
    return `API request failed (${response.status}): ${text.slice(0, 1000)}`
  }

  return text.slice(0, 4000)
}

const executeCustomWebhook = async (
  tool: Doc<"assistantTools">,
  args: Record<string, unknown>
): Promise<string> => {
  const webhookUrl = tool.config?.webhookUrl?.trim()

  if (!webhookUrl) {
    return "Custom tool is missing a webhook URL."
  }

  const method = tool.config?.webhookMethod ?? "POST"

  const response = await fetch(webhookUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(args) : undefined,
  })

  const text = await response.text()

  if (!response.ok) {
    return `Webhook call failed (${response.status}): ${text.slice(0, 1000)}`
  }

  return text.slice(0, 4000)
}

const executeQuery = async (
  ctx: any,
  tool: Doc<"assistantTools">,
  args: Record<string, unknown>
): Promise<string> => {
  const query =
    typeof args.query === "string" && args.query.trim()
      ? args.query.trim()
      : "Search the knowledge base for information related to the user's latest question."

  const openAIPlugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId: tool.organizationId,
      service: "openai_realtime",
    }
  )

  const rag = await getRagForOrganization(openAIPlugin?.secretValue)
  const searchResult = await rag.search(ctx, {
    namespace: tool.organizationId,
    query,
    limit: 5,
  })

  if (!searchResult.entries.length) {
    return "I couldn't find specific information about that in our knowledge base."
  }

  const contextText = `Found results in ${searchResult.entries
    .map((entry) => entry.title || null)
    .filter((title) => title !== null)
    .join(", ")}. Here is the context:\n\n${searchResult.text}`

  const response = await generateText({
    system: SEARCH_INTERPRETER_PROMPT,
    messages: [
      {
        role: "user",
        content: `User asked: "${query}"\n\nSearch results: ${contextText}`,
      },
    ],
    model: getOpenAIChatModelFromSecretValue(
      openAIPlugin?.secretValue,
      tool.config?.knowledgeBaseModel
    ),
  })

  return response.text
}

export const executeTool = internalAction({
  args: {
    organizationId: v.string(),
    toolName: v.string(),
    args: v.any(),
    threadId: v.optional(v.string()),
    channel: v.optional(v.union(v.literal("chat"), v.literal("voice"))),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const tools: Doc<"assistantTools">[] = await ctx.runQuery(
      internal.system.assistantTools.listEnabledForOrganization,
      {
        organizationId: args.organizationId,
        channel: args.channel ?? "chat",
      }
    )

    const tool = tools.find((entry) => entry.name === args.toolName)

    if (!tool) {
      return `Tool "${args.toolName}" is not available.`
    }

    const toolArgs =
      typeof args.args === "object" && args.args !== null
        ? (args.args as Record<string, unknown>)
        : {}

    switch (tool.type) {
      case "query":
        return executeQuery(ctx, tool, toolArgs)
      case "handoff": {
        if (!args.threadId) {
          return "Missing thread ID for handoff."
        }
        await ctx.runMutation(internal.system.conversations.escalate, {
          threadId: args.threadId,
        })
        return "Conversation escalated to a human operator."
      }
      case "resolve": {
        if (!args.threadId) {
          return "Missing thread ID for resolve."
        }
        await ctx.runMutation(internal.system.conversations.resolve, {
          threadId: args.threadId,
        })
        return "Conversation marked as resolved."
      }
      case "google_sheets":
        return executeGoogleSheets(ctx, tool, toolArgs)
      case "api_request":
        return executeApiRequest(tool, toolArgs)
      case "custom_webhook":
        return executeCustomWebhook(tool, toolArgs)
      default:
        return "Unsupported tool type."
    }
  },
})
