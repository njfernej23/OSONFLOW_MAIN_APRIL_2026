import { Webhook } from "svix"
import { createClerkClient } from "@clerk/backend"
import type { WebhookEvent } from "@clerk/backend"
import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import {
  PolarWebhookVerificationError,
  validatePolarWebhookEvent,
} from "./lib/polarWebhook"

const http = httpRouter()

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
})

const getBillingOrganizationId = (payload: any): string | null => {
  const payerOrganizationId =
    payload?.payer?.organization_id ?? payload?.payer?.organizationId
  const payerId = payload?.payer_id ?? payload?.payerId

  if (typeof payerOrganizationId === "string" && payerOrganizationId) {
    return payerOrganizationId
  }

  return typeof payerId === "string" && payerId.startsWith("org_")
    ? payerId
    : null
}

const getAmountValue = (value: any): number => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === "object") {
    return Math.max(
      getAmountValue(value.amount),
      getAmountValue(value.value),
      getAmountValue(value.cents)
    )
  }

  return 0
}

const hasPaidPlanSignal = (payload: any): boolean => {
  const planText = [
    payload?.plan?.slug,
    payload?.plan?.key,
    payload?.plan?.name,
    payload?.planId,
    payload?.plan_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (/\b(free|default)\b/.test(planText)) {
    return false
  }

  return /\b(pro|premium|paid|plus|business|team|growth)\b/.test(planText)
}

const polarSubscriptionEvents = new Set([
  "subscription.created",
  "subscription.active",
  "subscription.updated",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.past_due",
  "subscription.revoked",
])

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key]
  return typeof value === "string" && value ? value : null
}

const getPolarOrganizationId = (subscription: any): string | null => {
  const externalCustomerId = subscription?.customer?.externalId

  if (typeof externalCustomerId === "string" && externalCustomerId) {
    return externalCustomerId
  }

  return (
    getMetadataString(subscription?.metadata, "organizationId") ??
    getMetadataString(subscription?.customer?.metadata, "organizationId")
  )
}

const getTimestamp = (value: unknown): number | undefined => {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === "string") {
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? timestamp : undefined
  }

  return undefined
}

const isPaidSubscriptionItemPayload = (payload: any): boolean => {
  return (
    getAmountValue(payload?.amount) > 0 ||
    getAmountValue(
      payload?.nextPayment?.amount ?? payload?.next_payment?.amount
    ) > 0 ||
    getAmountValue(payload?.lifetimePaid ?? payload?.lifetime_paid) > 0 ||
    hasPaidPlanSignal(payload)
  )
}

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request)

    if (!event) {
      return new Response("Error occurred", { status: 400 })
    }

    switch (event.type) {
      case "subscription.updated": {
        const subscriptions = event.data as {
          status: string
          payer?: {
            organization_id: string
          }
        }

        const organizationId = subscriptions.payer?.organization_id

        if (!organizationId) {
          return new Response("Missing Organization ID", { status: 400 })
        }

        const newMaxAllowedMemberships =
          subscriptions.status === "active" ? 5 : 1

        await clerkClient.organizations.updateOrganization(organizationId, {
          maxAllowedMemberships: newMaxAllowedMemberships,
        })

        await ctx.runMutation(internal.system.subscriptions.upsert, {
          organizationId,
          status: subscriptions.status,
        })

        break
      }
      case "subscriptionItem.active": {
        const subscriptionItem = event.data as any
        const organizationId = getBillingOrganizationId(subscriptionItem)

        if (!organizationId) {
          return new Response("Missing Organization ID", { status: 400 })
        }

        if (!isPaidSubscriptionItemPayload(subscriptionItem)) {
          break
        }

        await clerkClient.organizations.updateOrganization(organizationId, {
          maxAllowedMemberships: 5,
        })

        await ctx.runMutation(internal.system.subscriptions.upsert, {
          organizationId,
          status: "active",
        })

        break
      }
      case "subscriptionItem.canceled":
      case "subscriptionItem.ended":
      case "subscriptionItem.abandoned":
      case "subscriptionItem.incomplete":
      case "subscriptionItem.pastDue": {
        const subscriptionItem = event.data as any
        const organizationId = getBillingOrganizationId(subscriptionItem)

        if (!organizationId) {
          return new Response("Missing Organization ID", { status: 400 })
        }

        if (!isPaidSubscriptionItemPayload(subscriptionItem)) {
          break
        }

        await clerkClient.organizations.updateOrganization(organizationId, {
          maxAllowedMemberships: 1,
        })

        await ctx.runMutation(internal.system.subscriptions.upsert, {
          organizationId,
          status: subscriptionItem.status ?? "inactive",
        })

        break
      }
      default:
        console.log("Ignore Clerk webhook event", event.type)
    }
    return new Response(null, { status: 200 })
  }),
})

http.route({
  path: "/polar-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

    if (!webhookSecret) {
      return new Response("Missing Polar webhook secret", { status: 500 })
    }

    const body = await request.text()
    const headers = {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    }

    let event: ReturnType<typeof validatePolarWebhookEvent>

    try {
      event = validatePolarWebhookEvent(body, headers, webhookSecret)
    } catch (error) {
      if (error instanceof PolarWebhookVerificationError) {
        return new Response("Invalid signature", { status: 403 })
      }

      throw error
    }

    if (!polarSubscriptionEvents.has(event.type)) {
      return new Response(null, { status: 200 })
    }

    const subscription = event.data as any
    const organizationId = getPolarOrganizationId(subscription)

    if (!organizationId) {
      console.warn("Ignore Polar subscription without organization id", {
        event: event.type,
        subscriptionId: subscription?.id,
      })
      return new Response(null, { status: 200 })
    }

    await ctx.runMutation(internal.system.subscriptions.upsert, {
      organizationId,
      status:
        typeof subscription.status === "string"
          ? subscription.status
          : event.type.replace("subscription.", ""),
      provider: "polar",
      polarCustomerId:
        typeof subscription.customerId === "string"
          ? subscription.customerId
          : subscription.customer?.id,
      polarProductId:
        typeof subscription.productId === "string"
          ? subscription.productId
          : undefined,
      polarSubscriptionId:
        typeof subscription.id === "string" ? subscription.id : undefined,
      currentPeriodEnd: getTimestamp(subscription.currentPeriodEnd),
    })

    return new Response(null, { status: 200 })
  }),
})

http.route({
  pathPrefix: "/telegram/webhook/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const webhookSecret = pathParts[pathParts.length - 1]

    if (!webhookSecret) {
      return new Response("Missing Telegram webhook secret", { status: 400 })
    }

    let update: unknown

    try {
      update = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    const result = (await ctx.runMutation(
      (internal as any).system.telegram.receiveWebhook,
      {
        webhookSecret,
        headerSecret:
          request.headers.get("x-telegram-bot-api-secret-token") || undefined,
        update,
      }
    )) as { queued: boolean; reason?: string }

    if (!result.queued && result.reason === "invalid_secret") {
      return new Response("Invalid Telegram secret", { status: 403 })
    }

    return new Response("ok", { status: 200 })
  }),
})

http.route({
  path: "/instagram/webhook",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get("hub.mode")
    const verifyToken = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (!verifyToken || !challenge || mode !== "subscribe") {
      return new Response("Invalid Instagram verification request", {
        status: 400,
      })
    }

    const isVerified = (await ctx.runQuery(
      (internal as any).system.instagram.verifyWebhookToken,
      {
        verifyToken,
      }
    )) as boolean

    if (!isVerified) {
      return new Response("Invalid Instagram verify token", { status: 403 })
    }

    return new Response(challenge, { status: 200 })
  }),
})

http.route({
  path: "/instagram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: unknown

    try {
      payload = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    const result = (await ctx.runMutation(
      (internal as any).system.instagram.receiveWebhookByPayload,
      {
        payload,
      }
    )) as { queued: boolean; reason?: string }

    if (!result.queued) {
      console.warn("Instagram webhook was not queued", result)
    }

    return new Response("EVENT_RECEIVED", { status: 200 })
  }),
})

http.route({
  pathPrefix: "/instagram/webhook/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const webhookSecret = pathParts[pathParts.length - 1]
    const mode = url.searchParams.get("hub.mode")
    const verifyToken = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (!webhookSecret || !verifyToken || !challenge || mode !== "subscribe") {
      return new Response("Invalid Instagram verification request", {
        status: 400,
      })
    }

    const isVerified = (await ctx.runQuery(
      (internal as any).system.instagram.verifyWebhook,
      {
        webhookSecret,
        verifyToken,
      }
    )) as boolean

    if (!isVerified) {
      return new Response("Invalid Instagram verify token", { status: 403 })
    }

    return new Response(challenge, { status: 200 })
  }),
})

http.route({
  pathPrefix: "/instagram/webhook/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const webhookSecret = pathParts[pathParts.length - 1]

    if (!webhookSecret) {
      return new Response("Missing Instagram webhook secret", { status: 400 })
    }

    let payload: unknown

    try {
      payload = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    const result = (await ctx.runMutation(
      (internal as any).system.instagram.receiveWebhook,
      {
        webhookSecret,
        payload,
      }
    )) as { queued: boolean; reason?: string }

    if (!result.queued && result.reason === "integration_not_found") {
      return new Response("Instagram integration not found", { status: 404 })
    }

    return new Response("EVENT_RECEIVED", { status: 200 })
  }),
})

http.route({
  pathPrefix: "/whatsapp/webhook/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const webhookSecret = pathParts[pathParts.length - 1]
    const mode = url.searchParams.get("hub.mode")
    const verifyToken = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (!webhookSecret || !verifyToken || !challenge || mode !== "subscribe") {
      return new Response("Invalid WhatsApp verification request", {
        status: 400,
      })
    }

    const isVerified = (await ctx.runQuery(
      (internal as any).system.whatsapp.verifyWebhook,
      {
        webhookSecret,
        verifyToken,
      }
    )) as boolean

    if (!isVerified) {
      return new Response("Invalid WhatsApp verify token", { status: 403 })
    }

    return new Response(challenge, { status: 200 })
  }),
})

http.route({
  pathPrefix: "/whatsapp/webhook/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const webhookSecret = pathParts[pathParts.length - 1]

    if (!webhookSecret) {
      return new Response("Missing WhatsApp webhook secret", { status: 400 })
    }

    let payload: unknown

    try {
      payload = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    const result = (await ctx.runMutation(
      (internal as any).system.whatsapp.receiveWebhook,
      {
        webhookSecret,
        payload,
      }
    )) as { queued: boolean; reason?: string }

    if (!result.queued && result.reason === "integration_not_found") {
      return new Response("WhatsApp integration not found", { status: 404 })
    }

    return new Response("EVENT_RECEIVED", { status: 200 })
  }),
})

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text()
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id") || "",
    "svix-timestamp": req.headers.get("svix-timestamp") || "",
    "svix-signature": req.headers.get("svix-signature") || "",
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "")

  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent
  } catch (error) {
    console.error("Error verifying webhook event", error)
    return null
  }
}

export default http
