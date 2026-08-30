import { ConvexError } from "convex/values"

import type { Doc } from "../_generated/dataModel"
import { getDeploymentSiteUrl } from "./webhookBaseUrl"

/**
 * Image attachments for conversations, shared by the widget (visitor) and the
 * dashboard (operator) sides.
 *
 * Two rules shape everything here:
 *
 * 1. Only real raster images are ever stored. The declared content type is a
 *    claim made by the uploader, so the stored bytes are sniffed and the blob is
 *    deleted unless its magic number matches one of the four formats below.
 *    `image/svg+xml` is deliberately absent — an SVG is a script container, and
 *    serving one from our own origin would be stored XSS.
 * 2. A blob is never handed out as a Convex storage URL. Every image is served
 *    through `/chat-attachment/<id>/<accessKey>`, so access dies with the row.
 */

type AllowedAttachmentMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"

/** Ceiling the organization's own limit is clamped to, in bytes. */
export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024

/** Pending uploads that never made it onto a message are swept after this. */
export const ORPHAN_ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000

export const DEFAULT_IMAGE_UPLOAD_POLICY = {
  enabled: true,
  maxSizeMb: 8,
  maxPerMessage: 3,
  aiVisionEnabled: true,
} as const

export const IMAGE_UPLOAD_POLICY_BOUNDS = {
  minSizeMb: 1,
  maxSizeMb: 20,
  minPerMessage: 1,
  maxPerMessage: 6,
} as const

export type ImageUploadPolicy = {
  enabled: boolean
  maxSizeMb: number
  maxSizeBytes: number
  maxPerMessage: number
  aiVisionEnabled: boolean
}

type AppearanceLike =
  | {
      imageUploadsEnabled?: boolean
      imageUploadMaxSizeMb?: number
      imageUploadMaxPerMessage?: number
      imageUploadAiVisionEnabled?: boolean
    }
  | null
  | undefined

const clampInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(parsed)))
}

/**
 * The upload rules actually enforced on the server. The widget renders the same
 * numbers, but nothing it sends is trusted: every limit is re-checked here.
 */
export const resolveImageUploadPolicy = (
  appearance: AppearanceLike
): ImageUploadPolicy => {
  const maxSizeMb = clampInteger(
    appearance?.imageUploadMaxSizeMb,
    DEFAULT_IMAGE_UPLOAD_POLICY.maxSizeMb,
    IMAGE_UPLOAD_POLICY_BOUNDS.minSizeMb,
    IMAGE_UPLOAD_POLICY_BOUNDS.maxSizeMb
  )

  return {
    enabled: appearance?.imageUploadsEnabled !== false,
    maxSizeMb,
    maxSizeBytes: Math.min(maxSizeMb * 1024 * 1024, MAX_ATTACHMENT_SIZE_BYTES),
    maxPerMessage: clampInteger(
      appearance?.imageUploadMaxPerMessage,
      DEFAULT_IMAGE_UPLOAD_POLICY.maxPerMessage,
      IMAGE_UPLOAD_POLICY_BOUNDS.minPerMessage,
      IMAGE_UPLOAD_POLICY_BOUNDS.maxPerMessage
    ),
    aiVisionEnabled: appearance?.imageUploadAiVisionEnabled !== false,
  }
}

/** The policy applied to operator uploads, which the widget switch never gates. */
export const OPERATOR_IMAGE_UPLOAD_POLICY: ImageUploadPolicy = {
  enabled: true,
  maxSizeMb: IMAGE_UPLOAD_POLICY_BOUNDS.maxSizeMb,
  maxSizeBytes: MAX_ATTACHMENT_SIZE_BYTES,
  maxPerMessage: IMAGE_UPLOAD_POLICY_BOUNDS.maxPerMessage,
  aiVisionEnabled: false,
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte)

const asciiAt = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length))

/**
 * Identifies the format from the leading bytes, ignoring the extension and the
 * `Content-Type` the uploader chose. Returns null for anything unrecognised —
 * including HTML, SVG and polyglot files that merely start with image-ish text.
 */
export const sniffImageMediaType = (
  input: ArrayBuffer | Uint8Array
): AllowedAttachmentMediaType | null => {
  const bytes =
    input instanceof Uint8Array ? input : new Uint8Array(input.slice(0, 32))

  if (bytes.length < 12) {
    return null
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg"
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }

  if (asciiAt(bytes, 0, 6) === "GIF87a" || asciiAt(bytes, 0, 6) === "GIF89a") {
    return "image/gif"
  }

  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") {
    return "image/webp"
  }

  return null
}

/**
 * Strips directories and control characters so the name can go into a
 * `Content-Disposition` header without smuggling a second header line.
 */
export const sanitizeAttachmentFilename = (
  filename: string | undefined,
  mediaType: string
) => {
  const extension =
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }[mediaType] ?? "img"

  const base = (filename ?? "")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)

  if (!base || base === "." || base === "..") {
    return `image.${extension}`
  }

  return /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}.${extension}`
}

const clampDimension = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }

  return Math.min(20_000, Math.round(parsed))
}

export const normalizeAttachmentDimensions = (dimensions: {
  width?: number
  height?: number
}) => ({
  width: clampDimension(dimensions.width),
  height: clampDimension(dimensions.height),
})

export type PublicChatAttachment = {
  id: string
  messageId: string | null
  url: string
  mediaType: string
  filename: string
  size: number
  width?: number
  height?: number
  source: "contact" | "operator"
  createdAt: number
}

const requireSiteUrl = () => {
  const siteUrl = getDeploymentSiteUrl()

  if (!siteUrl) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message:
        "Image attachments need a deployment site URL. Set CONVEX_SITE_URL in your Convex environment variables.",
    })
  }

  return siteUrl
}

const buildAttachmentUrl = (attachment: Doc<"chatAttachments">) =>
  `${requireSiteUrl()}/chat-attachment/${attachment._id}/${attachment.accessKey}`

export const toPublicAttachment = (
  attachment: Doc<"chatAttachments">
): PublicChatAttachment => ({
  id: attachment._id,
  messageId: attachment.messageId ?? null,
  url: buildAttachmentUrl(attachment),
  mediaType: attachment.mediaType,
  filename: attachment.filename,
  size: attachment.size,
  width: attachment.width,
  height: attachment.height,
  source: attachment.source,
  createdAt: attachment.createdAt,
})

/**
 * Constant-time comparison, so a wrong access key cannot be recovered one
 * character at a time from how long the request took.
 */
export const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

/**
 * The unguessable half of an attachment's URL. Two v4 UUIDs give ~244 bits of
 * entropy, matching how the rest of the backend mints per-row secrets — and
 * unlike `crypto.getRandomValues`, `randomUUID` is available inside a mutation.
 */
export const createAttachmentAccessKey = () =>
  `${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`
