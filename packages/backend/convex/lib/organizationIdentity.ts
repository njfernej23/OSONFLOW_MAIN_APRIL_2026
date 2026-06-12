import { ConvexError } from "convex/values"
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server"

type AuthCtx = QueryCtx | MutationCtx | ActionCtx

export const getOrganizationIdFromIdentity = (identity: unknown) => {
  const claims = identity as {
    orgId?: unknown
    org_id?: unknown
    organizationId?: unknown
  }

  const organizationId =
    claims.orgId ?? claims.org_id ?? claims.organizationId

  return typeof organizationId === "string" && organizationId.length > 0
    ? organizationId
    : undefined
}

export const requireOrganizationIdentity = async (ctx: AuthCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    })
  }

  const orgId = getOrganizationIdFromIdentity(identity)

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    })
  }

  return { identity, orgId }
}
