import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { action, query } from "../_generated/server"

type TelegramGetMeResponse = {
  ok: boolean
  description?: string
  result?: {
    id: number
    is_bot: boolean
    first_name?: string
    username?: string
  }
}

type TelegramApiResponse = {
  ok: boolean
  description?: string
}

const DEFAULT_TELEGRAM_WEBHOOK_BASE_URL =
  "https://sincere-bandicoot-353.eu-west-1.convex.site"

const getAuthContext = async (ctx: {
  auth: { getUserIdentity: () => Promise<any> }
}) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const organizationId = getOrganizationIdFromIdentity(identity)

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return {
    organizationId,
    actorId: identity.subject as string | undefined,
  }
}

const telegramApiUrl = (botToken: string, method: string) =>
  `https://api.telegram.org/bot${botToken}/${method}`

const normalizeBaseUrl = (value?: string) => {
  const trimmed =
    value?.trim() ||
    process.env.TELEGRAM_WEBHOOK_BASE_URL ||
    DEFAULT_TELEGRAM_WEBHOOK_BASE_URL

  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)
    return url.toString().replace(/\/$/, "")
  } catch {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Webhook base URL must be a valid URL",
    })
  }
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)

    const integration = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique()

    if (!integration) {
      return { integration: null }
    }

    return {
      integration: {
        _id: integration._id,
        _creationTime: integration._creationTime,
        botUsername: integration.botUsername,
        botFirstName: integration.botFirstName,
        webhookUrl: integration.webhookUrl,
        isEnabled: integration.isEnabled,
        status: integration.status,
        setupError: integration.setupError,
        lastWebhookAt: integration.lastWebhookAt,
        updatedAt: integration.updatedAt,
      },
    }
  },
})

export const connect = action({
  args: {
    botToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const botToken = args.botToken.trim()

    if (!botToken) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Bot token is required",
      })
    }

    const getMeResponse = await fetch(telegramApiUrl(botToken, "getMe"))
    const getMe = (await getMeResponse.json()) as TelegramGetMeResponse

    if (!getMeResponse.ok || !getMe.ok || !getMe.result?.is_bot) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: getMe.description || "Invalid Telegram bot token",
      })
    }

    const { integrationId, webhookSecret } = (await ctx.runMutation(
      (internal as any).system.telegram.upsertIntegration,
      {
        organizationId,
        actorId,
        botToken,
        botId: getMe.result.id,
        botUsername: getMe.result.username,
        botFirstName: getMe.result.first_name,
      }
    )) as { integrationId: string; webhookSecret: string }

    const webhookBaseUrl = normalizeBaseUrl()

    if (!webhookBaseUrl) {
      await ctx.runMutation(
        (internal as any).system.telegram.markIntegrationSetup,
        {
          integrationId,
          organizationId,
          status: "needs_webhook_url",
        }
      )

      return {
        integrationId,
        botUsername: getMe.result.username,
        status: "needs_webhook_url" as const,
      }
    }

    const webhookUrl = `${webhookBaseUrl}/telegram/webhook/${webhookSecret}`
    const setWebhookResponse = await fetch(
      telegramApiUrl(botToken, "setWebhook"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: webhookSecret,
          allowed_updates: ["message"],
        }),
      }
    )
    const setWebhook = (await setWebhookResponse.json()) as TelegramApiResponse

    if (!setWebhookResponse.ok || !setWebhook.ok) {
      const message = setWebhook.description || "Telegram webhook setup failed"
      await ctx.runMutation(
        (internal as any).system.telegram.markIntegrationSetup,
        {
          integrationId,
          organizationId,
          status: "error",
          webhookUrl,
          setupError: message,
        }
      )
      throw new ConvexError({
        code: "BAD_REQUEST",
        message,
      })
    }

    await ctx.runMutation(
      (internal as any).system.telegram.markIntegrationSetup,
      {
        integrationId,
        organizationId,
        status: "connected",
        webhookUrl,
      }
    )

    return {
      integrationId,
      botUsername: getMe.result.username,
      status: "connected" as const,
      webhookUrl,
    }
  },
})

export const disconnect = action({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const integration = await ctx.runQuery(
      (internal as any).system.telegram.getIntegrationByOrganizationId,
      {
        organizationId,
      }
    )

    if (!integration) {
      return { removed: false }
    }

    try {
      await fetch(telegramApiUrl(integration.botToken, "deleteWebhook"), {
        method: "POST",
      })
    } catch {
      // The local integration can still be removed if Telegram is unreachable.
    }

    await ctx.runMutation((internal as any).system.telegram.removeIntegration, {
      integrationId: integration._id,
      organizationId,
    })

    return { removed: true }
  },
})
