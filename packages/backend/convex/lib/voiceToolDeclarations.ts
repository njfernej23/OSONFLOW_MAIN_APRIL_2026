import { Doc } from "../_generated/dataModel"
import { Type } from "@google/genai"
import { buildOpenAIToolParameters } from "./assistantTools"
import {
  buildEndCallGeminiDeclaration,
  buildEndCallInstruction,
  buildEndCallOpenAITool,
  resolveVoiceCallSettings,
  type VoiceCallSettings,
} from "./voiceCallSettings"

export const buildOpenAIVoiceTools = (
  tools: Doc<"assistantTools">[],
  voiceCallSettings?: VoiceCallSettings
) => {
  const resolved = resolveVoiceCallSettings(voiceCallSettings)
  const configuredTools = tools.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: buildOpenAIToolParameters(tool.parameters),
  }))

  if (!resolved.autoEndOnGoodbye) {
    return configuredTools
  }

  return [...configuredTools, buildEndCallOpenAITool()]
}

export const buildGeminiVoiceTools = (
  tools: Doc<"assistantTools">[],
  voiceCallSettings?: VoiceCallSettings
) => [
  {
    functionDeclarations: [
      ...tools.map((tool) => ({
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
      ...(resolveVoiceCallSettings(voiceCallSettings).autoEndOnGoodbye
        ? [buildEndCallGeminiDeclaration()]
        : []),
    ],
  },
]

export const buildVoiceToolInstructions = (
  basePrompt: string | undefined,
  tools: Doc<"assistantTools">[],
  voiceCallSettings?: VoiceCallSettings
) => {
  const resolved = resolveVoiceCallSettings(voiceCallSettings)
  const toolNames = [
    ...tools.map((tool) => tool.name),
    ...(resolved.autoEndOnGoodbye ? ["end_call"] : []),
  ].join(", ")

  const sections = [basePrompt || ""]

  if (tools.length > 0 || resolved.autoEndOnGoodbye) {
    sections.push(
      `Available tools: ${toolNames}.
Use the appropriate tool when you need external data or knowledge before answering.
If a tool returns no useful information, say you could not find that information.`
    )
  }

  const endCallInstruction = buildEndCallInstruction(resolved.autoEndOnGoodbye)
  if (endCallInstruction) {
    sections.push(endCallInstruction)
  }

  return sections.filter(Boolean).join("\n\n")
}
