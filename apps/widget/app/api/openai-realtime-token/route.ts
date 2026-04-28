import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@workspace/backend/_generated/api"

export async function POST(request: Request) {
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

  try {
    const convex = new ConvexHttpClient(convexUrl)
    const result = await convex.action(
      api.public.secrets.createOpenAIRealtimeSession,
      {
        organizationId,
      }
    )

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create OpenAI realtime session."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
