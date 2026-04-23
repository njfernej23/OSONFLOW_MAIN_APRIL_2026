import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/_generated/api";

type RealtimeSettings = {
  enabled?: boolean;
  model?: string;
  voice?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI voice is not configured. Set OPENAI_API_KEY on the widget server." },
      { status: 500 }
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex URL is missing from the widget server." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as { organizationId?: string } | null;
  const organizationId = body?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  const widgetSettings = await convex.query(api.public.widgetSettings.getByOrganizationId, {
    organizationId,
  });

  const realtimeSettings = widgetSettings?.openaiRealtimeSettings as RealtimeSettings | undefined;

  if (!realtimeSettings?.enabled) {
    return NextResponse.json({ error: "OpenAI voice is disabled for this widget." }, { status: 403 });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: realtimeSettings.model || "gpt-realtime",
        instructions: `${widgetSettings?.systemPrompt || widgetSettings?.greetMessage}

For any product, pricing, policy, support, company, or account question, call the search_knowledge_base tool before answering. Only answer from the returned knowledge base result. If the tool returns no specific information, say you could not find that in the knowledge base and offer human support.`,
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
                  description: "The user's question or the specific information to search for.",
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
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Unable to create OpenAI realtime session." },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
