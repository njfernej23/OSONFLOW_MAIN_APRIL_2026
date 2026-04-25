import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const providerValidator = v.union(
  v.literal("openai_realtime"),
  v.literal("gemini_live"),
);

const roleValidator = v.union(v.literal("user"), v.literal("assistant"));

const getValidatedContactSession = async (
  ctx: MutationCtx,
  {
    contactSessionId,
    organizationId,
  }: {
    contactSessionId: Id<"contactSessions">;
    organizationId: string;
  }
) => {
  const contactSession = await ctx.db.get(contactSessionId);

  if (!contactSession || contactSession.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid session",
    });
  }

  if (contactSession.organizationId !== organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid organization",
    });
  }

  return contactSession;
};

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    await getValidatedContactSession(ctx, {
      contactSessionId: args.contactSessionId,
      organizationId: args.organizationId,
    });

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });

    const now = Date.now();

    return await ctx.db.insert("aiVoiceConversations", {
      organizationId: args.organizationId,
      contactSessionId: args.contactSessionId,
      provider: args.provider,
      lastActivityAt: now,
    });
  },
});

export const appendMessage = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    contactSessionId: v.id("contactSessions"),
    role: roleValidator,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();

    if (!text) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message text is required",
      });
    }

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "AI conversation not found",
      });
    }

    await getValidatedContactSession(ctx, {
      contactSessionId: args.contactSessionId,
      organizationId: conversation.organizationId,
    });

    if (conversation.contactSessionId !== args.contactSessionId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });

    const now = Date.now();

    const messageId = await ctx.db.insert("aiVoiceConversationMessages", {
      conversationId: args.conversationId,
      role: args.role,
      text,
    });

    await ctx.db.patch(args.conversationId, {
      lastActivityAt: now,
      lastMessagePreview: text.slice(0, 240),
      lastMessageRole: args.role,
      endedAt: conversation.endedAt ? now : undefined,
    });

    return messageId;
  },
});

export const finish = mutation({
  args: {
    conversationId: v.id("aiVoiceConversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "AI conversation not found",
      });
    }

    await getValidatedContactSession(ctx, {
      contactSessionId: args.contactSessionId,
      organizationId: conversation.organizationId,
    });

    if (conversation.contactSessionId !== args.contactSessionId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const now = Date.now();

    await ctx.db.patch(args.conversationId, {
      lastActivityAt: now,
      endedAt: conversation.endedAt ?? now,
    });
  },
});
