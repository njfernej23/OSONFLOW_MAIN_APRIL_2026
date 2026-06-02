import { v } from "convex/values"
import { GoogleGenAI, Modality, Type } from "@google/genai"
import { api, internal } from "../_generated/api"
import { action } from "../_generated/server"
import { Doc } from "../_generated/dataModel"
import { parseSecretValue } from "../lib/secrets"
import { checkRateLimit } from "../lib/rateLimits"

export const getVapiSecrets = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args): Promise<{ publicApiKey: string } | null> => {
    const plugin: Doc<"plugins"> | null = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      { organizationId: args.organizationId, service: "vapi" }
    )

    if (!plugin?.secretValue) return null

    const secretData: { privateApiKey: string; publicApiKey: string } | null =
      parseSecretValue<{ privateApiKey: string; publicApiKey: string }>(
        plugin.secretValue
      )

    if (!secretData?.publicApiKey || !secretData?.privateApiKey) return null

    return { publicApiKey: secretData.publicApiKey }
  },
})

type RealtimeSettings = {
  enabled?: boolean
  model?: string
  voice?: string
}

type SecretApiKeyPayload = {
  apiKey?: string
}

type TokenActionResponse = {
  status: number
  body: Record<string, unknown>
}

const openAIRealtimeInstructions = (prompt?: string) => `${prompt || ""}

For any product, pricing, policy, support, company, or account question, call the search_knowledge_base tool before answering. Only answer from the returned knowledge base result. If the tool returns no specific information, say you could not find that in the knowledge base.`

const geminiLiveInstructions = (prompt?: string) => `${prompt || ""}

For any product, pricing, policy, support, company, or account question, call the search_knowledge_base tool before answering. Only answer from the returned knowledge base result. If the tool returns no specific information, say you could not find that in the knowledge base.`

const getProviderApiKey = async (
  ctx: any,
  organizationId: string,
  service: "openai_realtime" | "gemini_live",
  fallbackEnvKey?: string
): Promise<string> => {
  const plugin: Doc<"plugins"> | null = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    { organizationId, service }
  )

  const secretPayload: SecretApiKeyPayload | null = plugin?.secretValue
    ? parseSecretValue<SecretApiKeyPayload>(plugin.secretValue)
    : null

  return secretPayload?.apiKey || fallbackEnvKey || ""
}

export const createOpenAIRealtimeSession = action({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (
    ctx: any,
    args: { organizationId: string; contactSessionId: string }
  ): Promise<TokenActionResponse> => {
    const widgetSettings: any = await ctx.runQuery(
      api.public.widgetSettings.getByOrganizationId,
      {
        organizationId: args.organizationId,
      }
    )

    const realtimeSettings = widgetSettings?.openaiRealtimeSettings as
      | RealtimeSettings
      | undefined

    if (!realtimeSettings?.enabled) {
      return {
        status: 403,
        body: { error: "OpenAI voice is disabled for this widget." },
      }
    }

    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      {
        contactSessionId: args.contactSessionId,
      }
    )

    if (
      !contactSession ||
      contactSession.expiresAt < Date.now() ||
      contactSession.organizationId !== args.organizationId
    ) {
      return {
        status: 401,
        body: { error: "Invalid session." },
      }
    }

    const sessionLimit = await checkRateLimit(ctx, "voiceTokenBySession", {
      key: `${args.organizationId}:${args.contactSessionId}:token`,
    })
    const orgLimit = await checkRateLimit(ctx, "voiceTokenByOrg", {
      key: args.organizationId,
    })

    if (!sessionLimit.ok || !orgLimit.ok) {
      return {
        status: 429,
        body: {
          error: "Too many voice sessions started. Please wait a moment.",
          retryAfter: !sessionLimit.ok
            ? sessionLimit.retryAfter
            : orgLimit.retryAfter,
        },
      }
    }

    const apiKey = await getProviderApiKey(
      ctx,
      args.organizationId,
      "openai_realtime",
      process.env.OPENAI_API_KEY
    )

    if (!apiKey) {
      return {
        status: 500,
        body: {
          error:
            "OpenAI voice is not configured. Add an organization key or set OPENAI_API_KEY on the backend.",
        },
      }
    }

    const response: Response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: realtimeSettings.model || "gpt-realtime",
            instructions: openAIRealtimeInstructions(
              widgetSettings?.systemPrompt || widgetSettings?.greetMessage
            ),
            tools: [
              {
                type: "function",
                name: "search_knowledge_base",
                description:
                  "Search the organization's knowledge base for accurate product, pricing, policy, support, or company information before answering the user.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description:
                        "The user's question or the specific information to search for.",
                    },
                  },
                  required: ["query"],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: "auto",
            audio: {
              output: {
                voice: realtimeSettings.voice || "marin",
              },
              input: {
                transcription: {
                  model: "gpt-4o-mini-transcribe",
                },
              },
            },
          },
        }),
      }
    )

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        status: response.status,
        body: {
          error:
            data?.error?.message || "Unable to create OpenAI realtime session.",
        },
      }
    }

    return { status: 200, body: data }
  },
})

export const createGeminiLiveToken = action({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (
    ctx: any,
    args: { organizationId: string; contactSessionId: string }
  ): Promise<TokenActionResponse> => {
    try {
      const widgetSettings: any = await ctx.runQuery(
        api.public.widgetSettings.getByOrganizationId,
        {
          organizationId: args.organizationId,
        }
      )

      const liveSettings = widgetSettings?.geminiLiveSettings as
        | RealtimeSettings
        | undefined

      if (!liveSettings?.enabled) {
        return {
          status: 403,
          body: { error: "Gemini Live is disabled for this widget." },
        }
      }

      const contactSession = await ctx.runQuery(
        internal.system.contactSessions.getOne,
        {
          contactSessionId: args.contactSessionId,
        }
      )

      if (
        !contactSession ||
        contactSession.expiresAt < Date.now() ||
        contactSession.organizationId !== args.organizationId
      ) {
        return {
          status: 401,
          body: { error: "Invalid session." },
        }
      }

      const sessionLimit = await checkRateLimit(ctx, "voiceTokenBySession", {
        key: `${args.organizationId}:${args.contactSessionId}:token`,
      })
      const orgLimit = await checkRateLimit(ctx, "voiceTokenByOrg", {
        key: args.organizationId,
      })

      if (!sessionLimit.ok || !orgLimit.ok) {
        return {
          status: 429,
          body: {
            error: "Too many voice sessions started. Please wait a moment.",
            retryAfter: !sessionLimit.ok
              ? sessionLimit.retryAfter
              : orgLimit.retryAfter,
          },
        }
      }

      const apiKey = await getProviderApiKey(
        ctx,
        args.organizationId,
        "gemini_live",
        process.env.GEMINI_API_KEY
      )

      if (!apiKey) {
        return {
          status: 500,
          body: {
            error:
              "Gemini Live is not configured. Add an organization key or set GEMINI_API_KEY on the backend.",
          },
        }
      }

      const model =
        liveSettings.model || "gemini-2.5-flash-native-audio-preview-12-2025"
      const voice = liveSettings.voice || "Kore"
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: "v1alpha" },
      })
      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          liveConnectConstraints: {
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: geminiLiveInstructions(
                widgetSettings?.systemPrompt || widgetSettings?.greetMessage
              ),
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: "search_knowledge_base",
                      description:
                        "Search the organization's knowledge base for accurate product, pricing, policy, support, or company information before answering the user.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          query: {
                            type: Type.STRING,
                            description:
                              "The user's question or the specific information to search for.",
                          },
                        },
                        required: ["query"],
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      })

      if (!token.name) {
        return {
          status: 502,
          body: { error: "Gemini did not return an auth token." },
        }
      }

      return {
        status: 200,
        body: { token: token.name, model, voice },
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create Gemini Live token."
      console.error("GEMINI_LIVE_TOKEN_ERROR", error)
      return { status: 500, body: { error: message } }
    }
  },
})
