import { Webhook } from "svix";
import { createClerkClient } from "@clerk/backend";
import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY || "",
});

const getBillingOrganizationId = (payload: any): string | null => {
    const payerOrganizationId =
        payload?.payer?.organization_id ?? payload?.payer?.organizationId;
    const payerId = payload?.payer_id ?? payload?.payerId;

    if (typeof payerOrganizationId === "string" && payerOrganizationId) {
        return payerOrganizationId;
    }

    return typeof payerId === "string" && payerId.startsWith("org_")
        ? payerId
        : null;
};

const getAmountValue = (value: any): number => {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    if (value && typeof value === "object") {
        return Math.max(
            getAmountValue(value.amount),
            getAmountValue(value.value),
            getAmountValue(value.cents)
        );
    }

    return 0;
};

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
        .toLowerCase();

    if (/\b(free|default)\b/.test(planText)) {
        return false;
    }

    return /\b(pro|premium|paid|plus|business|team|growth)\b/.test(planText);
};

const isPaidSubscriptionItemPayload = (payload: any): boolean => {
    return (
        getAmountValue(payload?.amount) > 0 ||
        getAmountValue(payload?.nextPayment?.amount ?? payload?.next_payment?.amount) > 0 ||
        getAmountValue(payload?.lifetimePaid ?? payload?.lifetime_paid) > 0 ||
        hasPaidPlanSignal(payload)
    );
};

http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateRequest(request);

        if (!event) {
            return new Response("Error occurred", { status: 400 });
        }

        switch (event.type) {
            case "subscription.updated": {
                const subscriptions = event.data as {
                    status: string;
                    payer?: {
                        organization_id: string;
                    };
                };

                const organizationId = subscriptions.payer?.organization_id;

                if (!organizationId) {
                    return new Response("Missing Organization ID", { status: 400 });
                }

                const newMaxAllowedMemberships = subscriptions.status === "active" ? 5 : 1;

                await clerkClient.organizations.updateOrganization(organizationId, {
                    maxAllowedMemberships: newMaxAllowedMemberships,
                });

                await ctx.runMutation(internal.system.subscriptions.upsert, {
                    organizationId,
                    status: subscriptions.status,
                });

                break;
            }
            case "subscriptionItem.active": {
                const subscriptionItem = event.data as any;
                const organizationId = getBillingOrganizationId(subscriptionItem);

                if (!organizationId) {
                    return new Response("Missing Organization ID", { status: 400 });
                }

                if (!isPaidSubscriptionItemPayload(subscriptionItem)) {
                    break;
                }

                await clerkClient.organizations.updateOrganization(organizationId, {
                    maxAllowedMemberships: 5,
                });

                await ctx.runMutation(internal.system.subscriptions.upsert, {
                    organizationId,
                    status: "active",
                });

                break;
            }
            case "subscriptionItem.canceled":
            case "subscriptionItem.ended":
            case "subscriptionItem.abandoned":
            case "subscriptionItem.incomplete":
            case "subscriptionItem.pastDue": {
                const subscriptionItem = event.data as any;
                const organizationId = getBillingOrganizationId(subscriptionItem);

                if (!organizationId) {
                    return new Response("Missing Organization ID", { status: 400 });
                }

                if (!isPaidSubscriptionItemPayload(subscriptionItem)) {
                    break;
                }

                await clerkClient.organizations.updateOrganization(organizationId, {
                    maxAllowedMemberships: 1,
                });

                await ctx.runMutation(internal.system.subscriptions.upsert, {
                    organizationId,
                    status: subscriptionItem.status ?? "inactive",
                });

                break;
            }
            default:
                console.log("Ignore Clerk webhook event", event.type)
        }
        return new Response(null, {status: 200});

    }),
});

http.route({
    pathPrefix: "/telegram/webhook/",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/").filter(Boolean);
        const webhookSecret = pathParts[pathParts.length - 1];

        if (!webhookSecret) {
            return new Response("Missing Telegram webhook secret", { status: 400 });
        }

        let update: unknown;

        try {
            update = await request.json();
        } catch {
            return new Response("Invalid JSON", { status: 400 });
        }

        const result = (await ctx.runMutation((internal as any).system.telegram.receiveWebhook, {
            webhookSecret,
            headerSecret:
                request.headers.get("x-telegram-bot-api-secret-token") || undefined,
            update,
        })) as { queued: boolean; reason?: string };

        if (!result.queued && result.reason === "invalid_secret") {
            return new Response("Invalid Telegram secret", { status: 403 });
        }

        return new Response("ok", { status: 200 });
    }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
    const payloadString = await req.text();
    const svixHeaders = {
        "svix-id": req.headers.get("svix-id") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
    };

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

    try {
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook event", error);
        return null;
    }
}

export default http;
