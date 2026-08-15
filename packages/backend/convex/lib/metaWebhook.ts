const encoder = new TextEncoder()

export type MetaProvider = "instagram" | "whatsapp"

export const META_APP_SECRET_ENV_VAR: Record<MetaProvider, string> = {
  instagram: "INSTAGRAM_APP_SECRET",
  whatsapp: "WHATSAPP_APP_SECRET",
}

// Deliberately no shared fallback: Instagram and WhatsApp can be different Meta
// apps with different signing secrets, so a shared variable would silently
// switch one provider to strict verification against the wrong secret the
// moment the other was configured.
const getAppSecret = (provider: MetaProvider): string | undefined =>
  process.env[META_APP_SECRET_ENV_VAR[provider]]?.trim() || undefined

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

const signPayload = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)))
}

// Comparison time must not depend on how many leading characters match, or the
// signature can be recovered byte by byte.
const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }

  return mismatch === 0
}

export type MetaSignatureResult =
  | { ok: true }
  | {
      ok: false
      reason: "not_configured" | "missing_signature" | "invalid_signature"
    }

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request body.
 * Meta delivers every app event to a single callback URL, so this signature is
 * the only thing proving a payload actually came from Meta.
 */
export const verifyMetaSignature = async ({
  provider,
  rawBody,
  signatureHeader,
}: {
  provider: MetaProvider
  rawBody: string
  signatureHeader: string | null
}): Promise<MetaSignatureResult> => {
  const appSecret = getAppSecret(provider)

  if (!appSecret) {
    return { ok: false, reason: "not_configured" }
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return { ok: false, reason: "missing_signature" }
  }

  const provided = signatureHeader.slice("sha256=".length).trim().toLowerCase()
  const expected = await signPayload(appSecret, rawBody)

  return timingSafeEqual(provided, expected)
    ? { ok: true }
    : { ok: false, reason: "invalid_signature" }
}
