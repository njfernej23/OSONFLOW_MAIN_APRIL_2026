import { Doc } from "../_generated/dataModel"
import { Type } from "@google/genai"
import { buildOpenAIToolParameters } from "./assistantTools"

export const buildOpenAIVoiceTools = (tools: Doc<"assistantTools">[]) =>
  tools.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: buildOpenAIToolParameters(tool.parameters),
  }))

export const buildGeminiVoiceTools = (tools: Doc<"assistantTools">[]) => [
  {
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties: Object.fromEntries(
          tool.parameters.map((parameter) => [
            parameter.name,
            {
              type:
                parameter.type === "number"
                  ? Type.NUMBER
                  : parameter.type === "boolean"
                    ? Type.BOOLEAN
                    : Type.STRING,
              description: parameter.description,
            },
          ])
        ),
        required: tool.parameters
          .filter((parameter) => parameter.required)
          .map((parameter) => parameter.name),
      },
    })),
  },
]

export const buildVoiceToolInstructions = (
  basePrompt: string | undefined,
  tools: Doc<"assistantTools">[]
) => {
  const toolNames = tools.map((tool) => tool.name).join(", ")

  if (tools.length === 0) {
    return basePrompt || ""
  }

  return `${basePrompt || ""}

Available tools: ${toolNames}.
Use the appropriate tool when you need external data or knowledge before answering.
If a tool returns no useful information, say you could not find that information.`
}
