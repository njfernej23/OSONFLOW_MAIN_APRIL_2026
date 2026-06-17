import { getOrganizationIdFromIdentity } from "../lib/organizationIdentity"
import { getWebhookBaseUrl } from "../lib/webhookBaseUrl"
import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { action, query } from "../_generated/server"

type WhatsAppPhoneNumberResponse = {
  id?: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  error?: {
    message?: string
  }
}

const WHATSAPP_GRAPH_API_VERSION =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0"

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

const whatsappApiUrl = (
  path: string,
  params?: Record<string, string | undefined>
) => {
  const url = new URL(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${path.replace(/^\//, "")}`
  )

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)

    const integration = await ctx.db
      .query("whatsappIntegrations")
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
        phoneNumberId: integration.phoneNumberId,
        businessAccountId: integration.businessAccountId,
        displayPhoneNumber: integration.displayPhoneNumber,
        verifiedName: integration.verifiedName,
        webhookUrl: integration.webhookUrl,
        verifyToken: integration.verifyToken,
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
    accessToken: v.string(),
    phoneNumberId: v.string(),
    businessAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, actorId } = await getAuthContext(ctx)
    const accessToken = args.accessToken.trim()
    const phoneNumberId = args.phoneNumberId.trim()
    const businessAccountId = args.businessAccountId?.trim() || undefined

    if (!accessToken || !phoneNumberId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Phone number ID and access token are required",
      })
    }

    const phoneNumberResponse = await fetch(
      whatsappApiUrl(phoneNumberId, {
        fields: "display_phone_number,verified_name,quality_rating",
        access_token: accessToken,
      })
    )
    const phoneNumber =
      (await phoneNumberResponse.json()) as WhatsAppPhoneNumberResponse

    if (!phoneNumberResponse.ok || phoneNumber.error || !phoneNumber.id) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          phoneNumber.error?.message ||
          "Invalid WhatsApp phone number ID or access token",
      })
    }

    const { integrationId, webhookSecret, verifyToken } =
      (await ctx.runMutation(
        (internal as any).system.whatsapp.upsertIntegration,
        {
          organizationId,
          actorId,
          accessToken,
          phoneNumberId: phoneNumber.id,
          businessAccountId,
          displayPhoneNumber: phoneNumber.display_phone_number,
          verifiedName: phoneNumber.verified_name,
        }
      )) as {
        integrationId: string
        webhookSecret: string
        verifyToken: string
      }

    const webhookBaseUrl = getWebhookBaseUrl(
      "WHATSAPP_WEBHOOK_BASE_URL",
      "META_WEBHOOK_BASE_URL"
    )

    if (!webhookBaseUrl) {
      await ctx.runMutation(
        (internal as any).system.whatsapp.markIntegrationSetup,
        {
          integrationId,
          organizationId,
          status: "needs_webhook_url",
        }
      )

      return {
        integrationId,
        phoneNumberId: phoneNumber.id,
        displayPhoneNumber: phoneNumber.display_phone_number,
        status: "needs_webhook_url" as const,
        verifyToken,
      }
    }

    const webhookUrl = `${webhookBaseUrl}/whatsapp/webhook/${webhookSecret}`

    await ctx.runMutation(
      (internal as any).system.whatsapp.markIntegrationSetup,
      {
        integrationId,
        organizationId,
        status: "connected",
        webhookUrl,
      }
    )

    return {
      integrationId,
      phoneNumberId: phoneNumber.id,
      displayPhoneNumber: phoneNumber.display_phone_number,
      status: "connected" as const,
      webhookUrl,
      verifyToken,
    }
  },
})

export const disconnect = action({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthContext(ctx)
    const integration = await ctx.runQuery(
      (internal as any).system.whatsapp.getIntegrationByOrganizationId,
      {
        organizationId,
      }
    )

    if (!integration) {
      return { removed: false }
    }

    await ctx.runMutation(
      (internal as any).system.whatsapp.removeIntegration,
      {
        integrationId: integration._id,
        organizationId,
      }
    )

    return { removed: true }
  },
})
