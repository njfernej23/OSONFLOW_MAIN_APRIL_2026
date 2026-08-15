import { ConvexError } from "convex/values"

import { internal } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server"

type ReadCtx = QueryCtx | MutationCtx

const invalidSession = () =>
  new ConvexError({
    code: "UNAUTHORIZED",
    message: "Invalid session",
  })

const assertSessionMatches = (
  contactSession: Doc<"contactSessions"> | null,
  organizationId?: string
) => {
  if (!contactSession || contactSession.expiresAt < Date.now()) {
    throw invalidSession()
  }

  // The widget is unauthenticated, so the contact session is the only proof of
  // identity. It must be bound to the organization the caller claims to act for,
  // otherwise a session minted against one tenant could be replayed at another.
  if (
    organizationId !== undefined &&
    contactSession.organizationId !== organizationId
  ) {
    throw invalidSession()
  }

  return contactSession
}

export const requireContactSession = async (
  ctx: ReadCtx,
  {
    contactSessionId,
    organizationId,
  }: {
    contactSessionId: Id<"contactSessions">
    organizationId?: string
  }
) => {
  return assertSessionMatches(
    await ctx.db.get(contactSessionId),
    organizationId
  )
}

export const requireContactSessionFromAction = async (
  ctx: ActionCtx,
  {
    contactSessionId,
    organizationId,
  }: {
    contactSessionId: Id<"contactSessions">
    organizationId?: string
  }
) => {
  const contactSession: Doc<"contactSessions"> | null = await ctx.runQuery(
    internal.system.contactSessions.getOne,
    { contactSessionId }
  )

  return assertSessionMatches(contactSession, organizationId)
}

export const requireContactSessionConversation = async (
  ctx: ReadCtx,
  {
    conversationId,
    contactSessionId,
  }: {
    conversationId: Id<"conversations">
    contactSessionId: Id<"contactSessions">
  }
) => {
  const contactSession = await requireContactSession(ctx, { contactSessionId })
  const conversation = await ctx.db.get(conversationId)

  if (!conversation) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Conversation not found",
    })
  }

  if (
    conversation.contactSessionId !== contactSession._id ||
    conversation.organizationId !== contactSession.organizationId
  ) {
    throw invalidSession()
  }

  return { conversation, contactSession }
}

export const requireContactSessionThread = async (
  ctx: ReadCtx,
  {
    threadId,
    contactSessionId,
  }: {
    threadId: string
    contactSessionId: Id<"contactSessions">
  }
) => {
  const contactSession = await requireContactSession(ctx, { contactSessionId })
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    // `first`, not `unique`: a duplicated threadId should deny access below
    // rather than throw an unhandled error out of the query.
    .first()

  if (
    !conversation ||
    conversation.contactSessionId !== contactSession._id ||
    conversation.organizationId !== contactSession.organizationId
  ) {
    throw invalidSession()
  }

  return { conversation, contactSession }
}
