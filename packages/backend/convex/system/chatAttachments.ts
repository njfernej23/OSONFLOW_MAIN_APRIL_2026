import { ConvexError, v } from "convex/values"

import { internalMutation, internalQuery } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"
import {
  ORPHAN_ATTACHMENT_TTL_MS,
  createAttachmentAccessKey,
  normalizeAttachmentDimensions,
  resolveImageUploadPolicy,
  sanitizeAttachmentFilename,
  toPublicAttachment,
} from "../lib/chatAttachments"
import { resolveWidgetSettings } from "./widgetSettings"

const ATTACHMENT_PURPOSE = "chat_attachment"

/** Ceiling on uploads waiting to be sent, so an abandoned composer cannot be
 *  used to park unbounded blobs in the organization's storage. */
const MAX_PENDING_ATTACHMENTS_PER_CONVERSATION = 12

const notFound = () =>
  new ConvexError({
    code: "NOT_FOUND",
    message: "Attachment not found",
  })

export const getStorageMetadata = internalQuery({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get(args.storageId)

    if (!metadata) {
      return null
    }

    return {
      size: metadata.size,
      contentType: metadata.contentType ?? null,
      sha256: metadata.sha256,
    }
  },
})

export const getConversationContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      return null
    }

    return {
      organizationId: conversation.organizationId,
      threadId: conversation.threadId,
      status: conversation.status,
      contactSessionId: conversation.contactSessionId,
      agentId: conversation.agentId,
    }
  },
})

export const getUploadPolicy = internalQuery({
  args: {
    organizationId: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const widgetSettings = await resolveWidgetSettings(ctx, args)

    return resolveImageUploadPolicy(widgetSettings?.appearance)
  },
})

/**
 * Deletes a blob that failed validation, but only when nothing has claimed it.
 * A claimed blob belongs to some other feature (or another organization) and
 * must survive a rejected attach, otherwise this endpoint doubles as a way to
 * destroy other people's files.
 */
export const discardUnclaimedBlob = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingOwner = await ctx.db
      .query("storageObjects")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()

    if (existingOwner) {
      return null
    }

    await ctx.storage.delete(args.storageId)

    return null
  },
})

export const record = internalMutation({
  args: {
    organizationId: v.string(),
    conversationId: v.id("conversations"),
    threadId: v.string(),
    storageId: v.id("_storage"),
    source: v.union(v.literal("contact"), v.literal("operator")),
    contactSessionId: v.optional(v.id("contactSessions")),
    operatorId: v.optional(v.string()),
    filename: v.optional(v.string()),
    mediaType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Convex storage ids carry no tenant information, so a blob that some other
    // organization already claimed can never be adopted here.
    const existingOwner = await ctx.db
      .query("storageObjects")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()

    if (existingOwner && existingOwner.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Attachment not found",
      })
    }

    if (existingOwner && existingOwner.purpose !== ATTACHMENT_PURPOSE) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "That file is not a chat attachment.",
      })
    }

    const existingAttachment = await ctx.db
      .query("chatAttachments")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()

    if (existingAttachment) {
      // Re-finalising the same upload is a retry, not a second attachment.
      if (
        existingAttachment.conversationId !== args.conversationId ||
        existingAttachment.organizationId !== args.organizationId
      ) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Attachment not found",
        })
      }

      return toPublicAttachment(existingAttachment)
    }

    const pending = await ctx.db
      .query("chatAttachments")
      .withIndex("by_conversation_id_and_message_id", (q) =>
        q.eq("conversationId", args.conversationId).eq("messageId", undefined)
      )
      .collect()

    if (pending.length >= MAX_PENDING_ATTACHMENTS_PER_CONVERSATION) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Too many images are waiting to be sent. Send or remove some.",
      })
    }

    const now = Date.now()
    const { width, height } = normalizeAttachmentDimensions(args)

    if (!existingOwner) {
      await ctx.db.insert("storageObjects", {
        storageId: args.storageId,
        organizationId: args.organizationId,
        uploadedBy: args.operatorId ?? args.contactSessionId,
        purpose: ATTACHMENT_PURPOSE,
        createdAt: now,
      })
    }

    const attachmentId = await ctx.db.insert("chatAttachments", {
      organizationId: args.organizationId,
      conversationId: args.conversationId,
      threadId: args.threadId,
      storageId: args.storageId,
      source: args.source,
      contactSessionId: args.contactSessionId,
      operatorId: args.operatorId,
      filename: sanitizeAttachmentFilename(args.filename, args.mediaType),
      mediaType: args.mediaType,
      size: args.size,
      width,
      height,
      accessKey: createAttachmentAccessKey(),
      createdAt: now,
    })

    const attachment = await ctx.db.get(attachmentId)

    if (!attachment) {
      throw notFound()
    }

    return toPublicAttachment(attachment)
  },
})

const loadSendableAttachments = async (
  ctx: { db: any },
  {
    attachmentIds,
    conversationId,
    source,
    contactSessionId,
    operatorId,
  }: {
    attachmentIds: Id<"chatAttachments">[]
    conversationId: Id<"conversations">
    source: "contact" | "operator"
    contactSessionId?: Id<"contactSessions">
    operatorId?: string
  }
): Promise<Doc<"chatAttachments">[]> => {
  const attachments: Doc<"chatAttachments">[] = []
  const seen = new Set<string>()

  for (const attachmentId of attachmentIds) {
    if (seen.has(attachmentId)) {
      continue
    }

    seen.add(attachmentId)

    const attachment: Doc<"chatAttachments"> | null =
      await ctx.db.get(attachmentId)

    // The uploader is the only one who may send an upload, and only into the
    // conversation it was uploaded for. Anything else is treated as missing so
    // this never confirms that another conversation's attachment id exists.
    if (
      !attachment ||
      attachment.conversationId !== conversationId ||
      attachment.source !== source ||
      attachment.messageId !== undefined ||
      (source === "contact" &&
        attachment.contactSessionId !== contactSessionId) ||
      (source === "operator" && attachment.operatorId !== operatorId)
    ) {
      throw notFound()
    }

    attachments.push(attachment)
  }

  return attachments
}

/** Reads the attachments a send is about to include, without binding them. */
export const resolveForSend = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    attachmentIds: v.array(v.id("chatAttachments")),
    source: v.union(v.literal("contact"), v.literal("operator")),
    contactSessionId: v.optional(v.id("contactSessions")),
    operatorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const attachments = await loadSendableAttachments(ctx, args)

    return attachments.map((attachment) => ({
      id: attachment._id,
      storageId: attachment.storageId,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
      size: attachment.size,
    }))
  },
})

/**
 * Binds uploads to the message that carries them. Until this runs an upload is
 * invisible in the transcript, which is what makes the orphan sweep safe.
 */
export const bindToMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    attachmentIds: v.array(v.id("chatAttachments")),
    messageId: v.string(),
    source: v.union(v.literal("contact"), v.literal("operator")),
    contactSessionId: v.optional(v.id("contactSessions")),
    operatorId: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const attachments = await loadSendableAttachments(ctx, args)

    for (const attachment of attachments) {
      await ctx.db.patch(attachment._id, { messageId: args.messageId })
    }

    return attachments.length
  },
})

const deleteAttachmentDoc = async (ctx: any, attachment: Doc<"chatAttachments">) => {
  const owner = await ctx.db
    .query("storageObjects")
    .withIndex("by_storage_id", (q: any) =>
      q.eq("storageId", attachment.storageId)
    )
    .unique()

  if (owner) {
    await ctx.db.delete(owner._id)
  }

  await ctx.storage.delete(attachment.storageId)
  await ctx.db.delete(attachment._id)
}

export const remove = internalMutation({
  args: {
    attachmentId: v.id("chatAttachments"),
    organizationId: v.string(),
    source: v.optional(v.union(v.literal("contact"), v.literal("operator"))),
    contactSessionId: v.optional(v.id("contactSessions")),
    /** Visitors may drop an upload they have not sent, but not unsend one. */
    onlyPending: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)

    if (!attachment || attachment.organizationId !== args.organizationId) {
      throw notFound()
    }

    if (args.source && attachment.source !== args.source) {
      throw notFound()
    }

    if (
      args.contactSessionId &&
      attachment.contactSessionId !== args.contactSessionId
    ) {
      throw notFound()
    }

    if (args.onlyPending && attachment.messageId !== undefined) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "That image has already been sent.",
      })
    }

    await deleteAttachmentDoc(ctx, attachment)

    return null
  },
})

/**
 * Serving lookup for the HTTP route. Takes the id as a raw path segment because
 * it arrives from a URL rather than from a typed client call.
 */
export const getForAccess = internalQuery({
  args: {
    attachmentId: v.string(),
  },
  handler: async (ctx, args) => {
    const attachmentId = ctx.db.normalizeId("chatAttachments", args.attachmentId)

    if (!attachmentId) {
      return null
    }

    const attachment = await ctx.db.get(attachmentId)

    if (!attachment) {
      return null
    }

    return {
      storageId: attachment.storageId,
      accessKey: attachment.accessKey,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
    }
  },
})

export const sweepOrphans = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_ATTACHMENT_TTL_MS
    const stale = await ctx.db
      .query("chatAttachments")
      .withIndex("by_message_id", (q) => q.eq("messageId", undefined))
      .take(200)

    let removed = 0

    for (const attachment of stale) {
      if (attachment.createdAt > cutoff) {
        continue
      }

      await deleteAttachmentDoc(ctx, attachment)
      removed += 1
    }

    return removed
  },
})
