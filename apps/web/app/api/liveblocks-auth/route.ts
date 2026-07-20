import { Liveblocks } from "@liveblocks/node"
import { auth, currentUser } from "@clerk/nextjs/server"

import "@/liveblocks.config"

const PRESENCE_COLORS = [
  "#c43d61",
  "#315bdc",
  "#21845f",
  "#a855c5",
  "#c98719",
  "#0f766e",
] as const

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
})

const colorForUser = (userId: string) => {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length]!
}

export async function POST(request: Request) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new Response("Missing LIVEBLOCKS_SECRET_KEY", { status: 500 })
  }

  const { userId, orgId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!orgId) {
    return new Response("Organization required", { status: 403 })
  }

  const user = await currentUser()
  const { room } = (await request.json()) as { room?: string }

  if (!room || typeof room !== "string") {
    return new Response("Missing room", { status: 400 })
  }

  // Rooms are namespaced: org:{orgId}:workflow:{workflowId}
  const orgPrefix = `org:${orgId}:`
  if (!room.startsWith(orgPrefix)) {
    return new Response("Forbidden room", { status: 403 })
  }

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Teammate"

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name,
      avatar: user?.imageUrl,
      color: colorForUser(userId),
    },
  })

  session.allow(`${orgPrefix}*`, session.FULL_ACCESS)

  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
