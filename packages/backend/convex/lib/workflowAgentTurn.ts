/**
 * One turn of a workflow Agent node.
 *
 * An agent turn is more than a completion: it can pick one of the node's named
 * exits, collect the variables that exit requires, offer quick replies, call a
 * configured assistant tool, and decide to end or hand off. The model returns
 * all of that as one structured object so a run is reproducible and the caller
 * never has to parse prose.
 *
 * Shared by the builder's Run panel preview and the published runtime so a turn
 * behaves identically in both.
 */
import { generateObject } from "ai"
import { z } from "zod"

import { getOpenAIChatModelFromSecretValue, OPENAI_CHAT_MODEL } from "./openai"
import { searchKnowledgeBase } from "./workflowAiGeneration"
import {
  asBoolean,
  asString,
  isRecord,
  renderTemplate,
  type JsonRecord,
  type RuntimeVariables,
} from "./workflowEngine"

/** How many times a turn may call a tool before it has to answer. */
const MAX_TOOL_ROUNDS = 2

export type AgentExitDefinition = {
  id: string
  name: string
  description: string
  requiredVariables: Array<{ name: string; description: string }>
  messages: string[]
}

export type AgentTurnResult = {
  reply: string
  /** Id of the exit the agent took, or null to stay on the default path. */
  exitId: string | null
  action: "continue" | "end" | "callForward"
  buttons: Array<{ id: string; label: string }>
  /** Values the agent collected, ready to merge into the run's variables. */
  variables: RuntimeVariables
  /** One line per tool the agent called, for the run log. */
  toolCalls: Array<{ name: string; result: string }>
  /** Set when a required variable is still missing for the chosen exit. */
  blockedExitId: string | null
  /**
   * Whether the node has exits at all. With none, the step is a plain AI reply
   * that hands straight on to the next node — holding the turn would strand
   * the conversation on an agent it can never leave.
   */
  hasExits: boolean
}

const AGENT_SYSTEM_PROMPT = `You are one agent step inside a deterministic support workflow.

Hold a natural conversation with the user, following the step instructions exactly.
Ask for one thing at a time. Never invent policy, pricing, product facts or availability
that are not in the instructions, the variables, or the knowledge context.

You must answer with the structured object you were given a schema for:
- "reply" is what the user sees. Always write something, even when taking an exit.
- "exitId" is the id of an exit condition, and only when that exit's described
  situation is genuinely true right now. Use null to keep the conversation going.
- "variables" is anything you have learned that an exit requires. Only include a
  value the user actually gave you; never guess one.
- "buttons" offers quick replies. Leave it empty unless buttons are enabled and
  a short closed set of answers genuinely helps.
- "action" is "end" only when the conversation is finished, "callForward" only
  when a human needs to take over, and "continue" otherwise.
- "toolName" calls one of the listed tools; leave it null when you do not need one.`

const exitSchema = z.object({
  reply: z.string(),
  exitId: z.string().nullable(),
  action: z.enum(["continue", "end", "callForward"]),
  buttons: z.array(z.string()),
  variables: z.record(z.string(), z.string()),
  toolName: z.string().nullable(),
  toolInput: z.record(z.string(), z.string()),
})

const readExits = (data: JsonRecord): AgentExitDefinition[] => {
  if (!Array.isArray(data.exitConditions)) return []

  return data.exitConditions
    .map((entry) => {
      if (!isRecord(entry)) return null
      const id = asString(entry.id)
      if (!id) return null

      const requiredVariables = Array.isArray(entry.requiredVariables)
        ? entry.requiredVariables
            .filter(isRecord)
            .map((variable) => ({
              name: asString(variable.name).trim(),
              description: asString(variable.description).trim(),
            }))
            .filter((variable) => variable.name !== "")
        : []

      const messages = Array.isArray(entry.messages)
        ? entry.messages.map((message) => asString(message)).filter(Boolean)
        : []

      return {
        id,
        name: asString(entry.name).trim() || "Exit",
        description: asString(entry.description).trim(),
        requiredVariables,
        messages,
      }
    })
    .filter((exit): exit is AgentExitDefinition => exit !== null)
}

const readCapabilities = (data: JsonRecord): string[] =>
  Array.isArray(data.capabilities)
    ? data.capabilities.map((entry) => asString(entry)).filter(Boolean)
    : []

/** Tools the node points at, as { kind, toolName } pairs. */
const readTools = (data: JsonRecord) =>
  Array.isArray(data.tools)
    ? data.tools
        .filter(isRecord)
        .map((tool) => ({
          kind: asString(tool.kind),
          toolName: asString(tool.toolName).trim(),
        }))
        .filter((tool) => tool.toolName !== "")
    : []

const buttonId = (label: string, index: number) =>
  `agent_${index}_${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24)}`

export const runAgentTurn = async (
  ctx: any,
  args: {
    organizationId: string
    data: JsonRecord
    variables: RuntimeVariables
    secretValue?: string | null
    /** Runs a configured assistant tool by name; omitted disables tool use. */
    executeTool?: (
      toolName: string,
      toolArgs: Record<string, string>
    ) => Promise<string>
  }
): Promise<AgentTurnResult> => {
  const { data, variables } = args
  const exits = readExits(data)
  const capabilities = readCapabilities(data)
  const tools = readTools(data)
  const chatModel = asString(data.model).trim() || OPENAI_CHAT_MODEL
  const instructions = renderTemplate(
    asString(data.instructions) ||
      asString(data.description) ||
      "Help the user with whatever they came here for.",
    variables
  ).trim()

  const useKnowledgeBase =
    capabilities.includes("knowledgeBase") ||
    asBoolean(data.useKnowledgeBase, false)

  let knowledgeContext = ""

  if (useKnowledgeBase) {
    const query =
      variables.lastInput || variables.lastUserMessage || instructions

    knowledgeContext = await searchKnowledgeBase(ctx, {
      organizationId: args.organizationId,
      query,
      secretValue: args.secretValue,
      model: chatModel,
    })
  }

  const variableLines = Object.entries(variables)
    .filter(([key]) => !key.startsWith("__"))
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")

  const exitLines = exits
    .map((exit) => {
      const required = exit.requiredVariables
        .map((variable) =>
          variable.description
            ? `${variable.name} (${variable.description})`
            : variable.name
        )
        .join(", ")

      return [
        `- id "${exit.id}" — ${exit.name}`,
        exit.description ? `  take it when: ${exit.description}` : "",
        required ? `  requires: ${required}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  const toolLines = args.executeTool
    ? tools.map((tool) => `- ${tool.toolName} (${tool.kind})`).join("\n")
    : ""

  const sections = [
    `Step instructions:\n${instructions}`,
    exitLines
      ? `Exit conditions:\n${exitLines}`
      : "Exit conditions: none — always return null for exitId.",
    toolLines
      ? `Tools you may call:\n${toolLines}`
      : "Tools you may call: none.",
    `Buttons are ${capabilities.includes("buttons") ? "enabled" : "disabled"}. ` +
      `Ending the conversation is ${capabilities.includes("end") ? "allowed" : "not allowed"}. ` +
      `Handing off to a human is ${capabilities.includes("callForward") ? "allowed" : "not allowed"}.`,
    variableLines ? `Workflow variables:\n${variableLines}` : "",
    knowledgeContext ? `Knowledge base context:\n${knowledgeContext}` : "",
    variables.lastUserMessage
      ? `Latest user message:\n${variables.lastUserMessage}`
      : "The user has not said anything yet — open the conversation.",
  ].filter(Boolean)

  const model = getOpenAIChatModelFromSecretValue(args.secretValue, chatModel)
  const toolCalls: Array<{ name: string; result: string }> = []
  let prompt = sections.join("\n\n")
  let object: z.infer<typeof exitSchema> | null = null

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const generated = await generateObject({
      model,
      schema: exitSchema,
      system: AGENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    })

    object = generated.object

    const requested = (object.toolName ?? "").trim()
    const allowed = tools.some((tool) => tool.toolName === requested)

    if (!requested || !allowed || !args.executeTool) {
      break
    }

    const result = await args.executeTool(requested, object.toolInput ?? {})
    toolCalls.push({ name: requested, result })
    prompt = `${prompt}\n\nYou called ${requested} and it returned:\n${result}\n\nAnswer the user now; do not call another tool.`
  }

  if (!object) {
    return {
      reply: "",
      exitId: null,
      action: "continue",
      buttons: [],
      variables: {},
      toolCalls,
      blockedExitId: null,
      hasExits: exits.length > 0,
    }
  }

  const collected: RuntimeVariables = {}
  for (const [key, value] of Object.entries(object.variables ?? {})) {
    if (!key.trim() || key.startsWith("__")) continue
    collected[key] = String(value)
  }

  const chosen = exits.find((exit) => exit.id === object.exitId) ?? null
  const merged = { ...variables, ...collected }
  // An exit only counts once everything it needs has actually been collected;
  // otherwise the agent keeps the turn and asks for the rest.
  const missing =
    chosen?.requiredVariables.filter(
      (variable) => !(merged[variable.name] ?? "").trim()
    ) ?? []
  const exitId = chosen && missing.length === 0 ? chosen.id : null

  const buttons = capabilities.includes("buttons")
    ? (object.buttons ?? [])
        .map((label) => String(label).trim())
        .filter(Boolean)
        .slice(0, 6)
        .map((label, index) => ({ id: buttonId(label, index), label }))
    : []

  const requestedAction = object.action ?? "continue"
  const action =
    requestedAction === "end" && !capabilities.includes("end")
      ? "continue"
      : requestedAction === "callForward" &&
          !capabilities.includes("callForward")
        ? "continue"
        : requestedAction

  return {
    reply: object.reply?.trim() ?? "",
    exitId,
    action,
    buttons,
    variables: collected,
    toolCalls,
    blockedExitId: chosen && missing.length > 0 ? chosen.id : null,
    hasExits: exits.length > 0,
  }
}

/** Messages an exit sends before control leaves the node. */
export const exitMessages = (
  data: JsonRecord,
  exitId: string,
  variables: RuntimeVariables
) => {
  const exit = readExits(data).find((entry) => entry.id === exitId)
  return (exit?.messages ?? [])
    .map((message) => renderTemplate(message, variables).trim())
    .filter(Boolean)
}

export const agentExits = readExits
