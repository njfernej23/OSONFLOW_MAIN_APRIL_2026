import { ConvexError } from "convex/values"

export const INSTAGRAM_GRAPH_API_VERSION =
  process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0"

export const INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
] as const

type InstagramGraphError = {
  message?: string
  code?: number
}

type InstagramAccountIdentityResponse = {
  id?: string
  user_id?: string
  username?: string
  error?: InstagramGraphError
}

type InstagramSubscribeResponse = {
  success?: boolean
  error?: InstagramGraphError
}

type InstagramSubscribedAppsResponse = {
  data?: Array<{
    id?: string
    subscribed_fields?: string[]
  }>
  error?: InstagramGraphError
}

export const instagramGraphUrl = (
  path: string,
  params?: Record<string, string | undefined>
) => {
  const url = new URL(
    `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}/${path.replace(/^\//, "")}`
  )

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

export const fetchInstagramAccountIdentity = async (accessToken: string) => {
  const response = await fetch(
    instagramGraphUrl("me", {
      fields: "user_id,id,username",
      access_token: accessToken,
    })
  )
  const body = (await response.json()) as InstagramAccountIdentityResponse

  if (!response.ok || body.error) {
    throw new ConvexError(
      body.error?.message ||
        `Failed to load Instagram account identity (HTTP ${response.status})`
    )
  }

  const instagramUserId = body.user_id?.trim() || body.id?.trim()

  if (!instagramUserId) {
    throw new ConvexError("Instagram did not return an account ID")
  }

  return {
    instagramUserId,
    appScopedId:
      body.id?.trim() && body.id.trim() !== instagramUserId
        ? body.id.trim()
        : undefined,
    username:
      typeof body.username === "string" && body.username.trim()
        ? body.username.trim()
        : undefined,
  }
}

const subscribedFieldsParam = () =>
  INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS.join(",")

const hasMessagesSubscription = (fields: string[] | undefined) =>
  fields?.some((field) => field === "messages" || field.startsWith("messages")) ??
  false

export const getInstagramWebhookSubscription = async (accessToken: string) => {
  const response = await fetch(
    instagramGraphUrl("me/subscribed_apps", {
      access_token: accessToken,
    })
  )
  const body = (await response.json()) as InstagramSubscribedAppsResponse

  if (!response.ok || body.error) {
    return {
      subscribed: false,
      subscribedFields: [] as string[],
      error:
        body.error?.message ||
        `Failed to read Instagram webhook subscription (HTTP ${response.status})`,
    }
  }

  const subscribedFields = body.data?.[0]?.subscribed_fields ?? []

  return {
    subscribed: hasMessagesSubscription(subscribedFields),
    subscribedFields,
    error: undefined,
  }
}

export const subscribeInstagramAccountWebhooks = async (accessToken: string) => {
  const attempts = [
    {
      url: instagramGraphUrl("me/subscribed_apps", {
        access_token: accessToken,
        subscribed_fields: subscribedFieldsParam(),
      }),
      init: { method: "POST" } satisfies RequestInit,
    },
    {
      url: instagramGraphUrl("me/subscribed_apps", {
        access_token: accessToken,
      }),
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscribed_fields: [...INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS],
        }),
      } satisfies RequestInit,
    },
  ]

  let lastError = "Failed to subscribe Instagram webhooks"

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, attempt.init)
    const body = (await response.json()) as InstagramSubscribeResponse

    if (response.ok && body.success) {
      const subscription = await getInstagramWebhookSubscription(accessToken)

      if (subscription.subscribed) {
        return
      }

      lastError =
        subscription.error ||
        "Instagram accepted the subscription request, but messages webhooks are still not enabled"

      continue
    }

    lastError =
      body.error?.message ||
      `Failed to subscribe Instagram webhooks (HTTP ${response.status})`
  }

  throw new ConvexError(lastError)
}
