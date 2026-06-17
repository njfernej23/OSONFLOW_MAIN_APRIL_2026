import {
  Webhook,
  WebhookVerificationError as StandardWebhookVerificationError,
} from "standardwebhooks"

export class PolarWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PolarWebhookVerificationError"
  }
}

type PolarWebhookEvent = {
  type: string
  data: unknown
}

const encodeWebhookSecret = (secret: string) => {
  // Convex HTTP actions don't provide Node's Buffer; Polar secrets are ASCII.
  return btoa(secret)
}

export const validatePolarWebhookEvent = (
  body: string,
  headers: Record<string, string>,
  secret: string
): PolarWebhookEvent => {
  const webhook = new Webhook(encodeWebhookSecret(secret))

  try {
    return webhook.verify(body, headers) as PolarWebhookEvent
  } catch (error) {
    if (error instanceof StandardWebhookVerificationError) {
      throw new PolarWebhookVerificationError(
        error instanceof Error ? error.message : "Invalid webhook signature"
      )
    }

    throw error
  }
}
