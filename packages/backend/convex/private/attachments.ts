import { ConvexError, v } from "convex/values"

import { action, mutation, query } from "../_generated/server"
import { internal } from "../_generated/api"
import { finalizeAttachmentUpload } from "../lib/attachmentUploads"
import {
  OPERATOR_IMAGE_UPLOAD_POLICY,
  type PublicChatAttachment,
  toPublicAttachment,
} from "../lib/chatAttachments"
import { requireOrganizationIdentity } from "../lib/organizationIdentity"
import { enforceRateLimit } from "../lib/rateLimits"

/** Newest attachments the inbox will render in one conversation. */
const MAX_RENDERED_ATTACHMENTS = 300

const notFound = () =>
  new ConvexError({
    code: "NOT_FOUND",
    message: "Conversation not found",
  })

/**
 * Operator uploads are not gated by the widget's attachment switch: that switch
 * governs what visitors may send, while an operator sending a screenshot back is
 * part of answering the ticket.
 */
export const generateUploadUrl = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { identity, orgId } = await requireOrganizationIdentity(ctx)
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation || conversation.organizationId !== orgId) {
      throw notFound()
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      })
    }

    await enforceRateLimit(ctx, "chatAttachmentByOperator", {
      key: `${orgId}:${identity.subject}`,
      message: "You are uploading images too quickly. Please wait a moment.",
    })

    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
      maxSizeBytes: OPERATOR_IMAGE_UPLOAD_POLICY.maxSizeBytes,
      maxPerMessage: OPERATOR_IMAGE_UPLOAD_POLICY.maxPerMessage,
    }
  },
})

export const attach = action({
  args: {
    conversationId: v.id("conversations"),
    storageId: v.id("_storage"),
    filename: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PublicChatAttachment> => {
    const { identity, orgId } = await requireOrganizationIdentity(ctx)
    const conversation = await ctx.runQuery(
      internal.system.chatAttachments.getConversationContext,
      { conversationId: args.conversationId }
    )

    if (!conversation || conversation.organizationId !== orgId) {
      throw notFound()
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      })
    }

    return await finalizeAttachmentUpload(ctx, {
      organizationId: orgId,
      conversationId: args.conversationId,
      threadId: conversation.threadId,
      storageId: args.storageId,
      policy: OPERATOR_IMAGE_UPLOAD_POLICY,
      source: "operator",
      operatorId: identity.subject,
      filename: args.filename,
      width: args.width,
      height: args.height,
    })
  },
})

/**
 * Deletes an attachment for the whole organization — an operator's own draft, or
 * an image a visitor should not have sent. The blob goes with it, so the serving
 * URL stops working everywhere the moment this runs.
 */
export const remove = mutation({
  args: {
    attachmentId: v.id("chatAttachments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)

    await ctx.runMutation(internal.system.chatAttachments.remove, {
      attachmentId: args.attachmentId,
      organizationId: orgId,
    })

    return null
  },
})

export const getForConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<PublicChatAttachment[]> => {
    const { orgId } = await requireOrganizationIdentity(ctx)
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation || conversation.organizationId !== orgId) {
      return []
    }

    const attachments = await ctx.db
      .query("chatAttachments")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(MAX_RENDERED_ATTACHMENTS)

    return attachments
      .filter((attachment) => attachment.messageId !== undefined)
      .map(toPublicAttachment)
  },
})
