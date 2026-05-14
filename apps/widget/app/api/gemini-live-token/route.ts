import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"

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
    contactSessionId?: string
  } | null
  const organizationId = body?.organizationId
  const contactSessionId = body?.contactSessionId

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    )
  }

  if (!contactSessionId) {
    return NextResponse.json(
      { error: "contactSessionId is required" },
      { status: 400 }
    )
  }

  try {
    const convex = new ConvexHttpClient(convexUrl)
    const result = await convex.action(
      api.public.secrets.createGeminiLiveToken,
      {
        organizationId,
        contactSessionId: contactSessionId as Id<"contactSessions">,
      }
    )

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Gemini Live token."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
