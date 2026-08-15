import type { Doc } from "../_generated/dataModel"

export const ANONYMOUS_EMAIL_DOMAIN = "anonymous.osonflow.local"

export const isAnonymousContactSession = (
  session: Doc<"contactSessions"> | null | undefined
) => {
  if (!session) {
    return false
  }

  if (session.isAnonymous === true) {
    return true
  }

  return session.email.toLowerCase().endsWith(`@${ANONYMOUS_EMAIL_DOMAIN}`)
}
