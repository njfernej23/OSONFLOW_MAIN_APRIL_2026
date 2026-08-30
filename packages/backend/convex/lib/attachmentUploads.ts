import { ConvexError } from "convex/values"

import { internal } from "../_generated/api"
import type { ActionCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import {
  type ImageUploadPolicy,
  type PublicChatAttachment,
  sniffImageMediaType,
} from "./chatAttachments"

/**
 * Turns a freshly uploaded blob into an attachment, or destroys it.
 *
 * Convex upload URLs accept any bytes with any declared content type, so this
 * is the only place the upload is actually checked. The declared type is
 * ignored in favour of the file's magic number, and anything that fails is
 * deleted rather than left sitting in storage.
 */
export const finalizeAttachmentUpload = async (
  ctx: ActionCtx,
  {
    organizationId,
    conversationId,
    threadId,
    storageId,
    policy,
    source,
    contactSessionId,
    operatorId,
    filename,
    width,
    height,
  }: {
    organizationId: string
    conversationId: Id<"conversations">
    threadId: string
    storageId: Id<"_storage">
    policy: ImageUploadPolicy
    source: "contact" | "operator"
    contactSessionId?: Id<"contactSessions">
    operatorId?: string
    filename?: string
    width?: number
    height?: number
  }
): Promise<PublicChatAttachment> => {
  const reject = async (message: string): Promise<never> => {
    await ctx.runMutation(
      internal.system.chatAttachments.discardUnclaimedBlob,
      { storageId }
    )

    throw new ConvexError({ code: "INVALID_INPUT", message })
  }

  const metadata = await ctx.runQuery(
    internal.system.chatAttachments.getStorageMetadata,
    { storageId }
  )

  if (!metadata) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Upload not found. Please try again.",
    })
  }

  if (metadata.size <= 0) {
    return await reject("That file is empty.")
  }

  if (metadata.size > policy.maxSizeBytes) {
    return await reject(
      `Images must be ${policy.maxSizeMb}MB or smaller.`
    )
  }

  const blob = await ctx.storage.get(storageId)

  if (!blob) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Upload not found. Please try again.",
    })
  }

  // Only the header is needed to identify the format, so a large upload is not
  // pulled into memory just to be rejected.
  const header = await blob.slice(0, 32).arrayBuffer()
  const mediaType = sniffImageMediaType(header)

  if (!mediaType) {
    return await reject("Only JPEG, PNG, WebP and GIF images can be attached.")
  }

  return await ctx.runMutation(internal.system.chatAttachments.record, {
    organizationId,
    conversationId,
    threadId,
    storageId,
    source,
    contactSessionId,
    operatorId,
    filename,
    mediaType,
    size: metadata.size,
    width,
    height,
  })
}

/**
 * The image parts handed to the model for one turn only. They are never written
 * into the thread, so a screenshot costs vision tokens once instead of on every
 * later message in the conversation.
 */
export const buildModelImageParts = async (
  ctx: ActionCtx,
  attachments: Array<{ storageId: Id<"_storage">; mediaType: string }>
) => {
  const parts = await Promise.all(
    attachments.map(async (attachment) => {
      const blob = await ctx.storage.get(attachment.storageId)

      if (!blob) {
        return null
      }

      return {
        type: "image" as const,
        image: new Uint8Array(await blob.arrayBuffer()),
        mediaType: attachment.mediaType,
      }
    })
  )

  return parts.filter((part): part is NonNullable<typeof part> => part !== null)
}
