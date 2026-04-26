import { GoogleGenAI, Modality, Type } from "@google/genai"
import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@workspace/backend/_generated/api"

type GeminiLiveSettings = {
  enabled?: boolean
  model?: string
  voice?: string
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini Live is not configured. Set GEMINI_API_KEY on the widget server.",
        },
        { status: 500 }
      )
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

    if (!convexUrl) {
      return NextResponse.json(
        { error: "Convex URL is missing from the widget server." },
        { status: 500 }
      )
    }

    const body = (await request.json().catch(() => null)) as {
      organizationId?: string
    } | null
    const organizationId = body?.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      )
    }

    const convex = new ConvexHttpClient(convexUrl)
    const widgetSettings = await convex.query(
      api.public.widgetSettings.getByOrganizationId,
      {
        organizationId,
      }
    )
    const liveSettings = widgetSettings?.geminiLiveSettings as
      | GeminiLiveSettings
      | undefined

    if (!liveSettings?.enabled) {
      return NextResponse.json(
        { error: "Gemini Live is disabled for this widget." },
        { status: 403 }
      )
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
            systemInstruction: `${widgetSettings?.systemPrompt || widgetSettings?.greetMessage}

For any product, pricing, policy, support, company, or account question, call the search_knowledge_base tool before answering. Only answer from the returned knowledge base result. If the user asks for a human or says they want to escalate, call escalate_to_human. If the user confirms the issue is fully handled, call mark_resolved.`,
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
                  {
                    name: "escalate_to_human",
                    description:
                      "Escalate this realtime voice conversation to a human operator and continue in the chat widget.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "mark_resolved",
                    description:
                      "Mark this realtime voice conversation as resolved once the user confirms the issue is fully handled.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
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
      return NextResponse.json(
        { error: "Gemini did not return an auth token." },
        { status: 502 }
      )
    }

    return NextResponse.json({ token: token.name, model, voice })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Gemini Live token."
    console.error("GEMINI_LIVE_TOKEN_ERROR", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
