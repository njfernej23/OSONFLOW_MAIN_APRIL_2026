import { ConvexError, v } from "convex/values"

import { action, mutation, query } from "../_generated/server"
import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { finalizeAttachmentUpload } from "../lib/attachmentUploads"
import {
  type PublicChatAttachment,
  resolveImageUploadPolicy,
  toPublicAttachment,
} from "../lib/chatAttachments"
import { enforceRateLimit } from "../lib/rateLimits"
import {
  requireContactSession,
  requireContactSessionConversation,
} from "../lib/widgetAuth"
import { resolveWidgetSettings } from "../system/widgetSettings"

/** Newest attachments a widget transcript will render in one conversation. */
const MAX_RENDERED_ATTACHMENTS = 300

const uploadsDisabled = () =>
  new ConvexError({
    code: "FORBIDDEN",
    message: "Image attachments are turned off for this widget.",
  })

const conversationClosed = () =>
  new ConvexError({
    code: "BAD_REQUEST",
    message: "Conversation resolved",
  })

/**
 * Hands the visitor a one-shot Convex upload URL.
 *
 * The URL itself carries no authorization, so everything that matters is
 * checked here and again when the upload is finalized: the session owns this
 * conversation, the widget still allows attachments, and the visitor is not
 * uploading faster than the rate limit allows.
 */
export const generateUploadUrl = mutation({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const { conversation, contactSession } =
      await requireContactSessionConversation(ctx, args)

    if (conversation.status === "resolved") {
      throw conversationClosed()
    }

    const widgetSettings = await resolveWidgetSettings(ctx, {
      organizationId: conversation.organizationId,
      agentId: conversation.agentId,
    })
    const policy = resolveImageUploadPolicy(widgetSettings?.appearance)

    if (!policy.enabled) {
      throw uploadsDisabled()
    }

    await enforceRateLimit(ctx, "chatAttachmentBySession", {
      key: `${conversation.organizationId}:${contactSession._id}`,
      message: "You are uploading images too quickly. Please wait a moment.",
    })
    await enforceRateLimit(ctx, "chatAttachmentByOrg", {
      key: conversation.organizationId,
      message: "This widget is receiving too many uploads. Try again shortly.",
    })

    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
      maxSizeBytes: policy.maxSizeBytes,
      maxPerMessage: policy.maxPerMessage,
    }
  },
})

export const attach = action({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    storageId: v.id("_storage"),
    filename: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PublicChatAttachment> => {
    const conversation = await ctx.runQuery(
      internal.system.chatAttachments.getConversationContext,
      { conversationId: args.conversationId }
    )
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      { contactSessionId: args.contactSessionId }
    )

    if (
      !conversation ||
      !contactSession ||
      contactSession.expiresAt < Date.now() ||
      conversation.contactSessionId !== args.contactSessionId ||
      conversation.organizationId !== contactSession.organizationId
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      })
    }

    if (conversation.status === "resolved") {
      throw conversationClosed()
    }

    const policy = await ctx.runQuery(
      internal.system.chatAttachments.getUploadPolicy,
      {
        organizationId: conversation.organizationId,
        agentId: conversation.agentId,
      }
    )

    if (!policy.enabled) {
      throw uploadsDisabled()
    }

    return await finalizeAttachmentUpload(ctx, {
      organizationId: conversation.organizationId,
      conversationId: args.conversationId,
      threadId: conversation.threadId,
      storageId: args.storageId,
      policy,
      source: "contact",
      contactSessionId: args.contactSessionId,
      filename: args.filename,
      width: args.width,
      height: args.height,
    })
  },
})

/** Removes an upload the visitor decided not to send. */
export const remove = mutation({
  args: {
    attachmentId: v.id("chatAttachments"),
    contactSessionId: v.id("contactSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const contactSession = await requireContactSession(ctx, {
      contactSessionId: args.contactSessionId,
    })

    await ctx.runMutation(internal.system.chatAttachments.remove, {
      attachmentId: args.attachmentId,
      organizationId: contactSession.organizationId,
      source: "contact",
      contactSessionId: args.contactSessionId,
      onlyPending: true,
    })

    return null
  },
})

/**
 * Attachments already sent in this conversation, keyed by the message that
 * carries them. Kept out of the message pagination so scrolling the transcript
 * never re-reads image metadata it already has.
 */
export const getForConversation = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args): Promise<PublicChatAttachment[]> => {
    await requireContactSessionConversation(ctx, args)

    const attachments = await ctx.db
      .query("chatAttachments")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId as Id<"conversations">)
      )
      .order("desc")
      .take(MAX_RENDERED_ATTACHMENTS)

    return attachments
      .filter((attachment) => attachment.messageId !== undefined)
      .map(toPublicAttachment)
  },
})
