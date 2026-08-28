// Cookie consent state.
//
// Osonflow currently sets only strictly necessary cookies (authentication, a
// language preference, and the record of this choice), so nothing is gated on
// consent today. The machinery exists so that the day analytics or any other
// non-essential script is added, it can be gated properly instead of being
// bolted on afterwards — call `hasConsent("analytics")` before loading it, and
// subscribe to `onConsentChange` to react when the visitor changes their mind.

export const CONSENT_STORAGE_KEY = "osonflow-cookie-consent"
export const CONSENT_VERSION = 1
export const CONSENT_CHANGE_EVENT = "osonflow:consent-change"

/** Categories a visitor can decline. Necessary cookies are not listed: they are
 *  required for the site to work and are covered by the privacy policy. */
export type ConsentCategory = "analytics"

export type ConsentState = {
  version: number
  /** ISO timestamp of the decision, so we can re-ask if the policy changes. */
  decidedAt: string
  analytics: boolean
}

const isConsentState = (value: unknown): value is ConsentState =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ConsentState).version === "number" &&
  typeof (value as ConsentState).decidedAt === "string" &&
  typeof (value as ConsentState).analytics === "boolean"

/** Returns the stored decision, or null if the visitor has not answered yet
 *  (or answered an older version of the notice). */
export const readConsent = (): ConsentState | null => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (!isConsentState(parsed) || parsed.version !== CONSENT_VERSION) {
      return null
    }

    return parsed
  } catch {
    // Private browsing, disabled storage, or corrupt value: treat as undecided.
    return null
  }
}

export const writeConsent = (analytics: boolean): ConsentState => {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    analytics,
  }

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable. The choice still applies for this page view; the
    // notice will simply appear again next visit.
  }

  window.dispatchEvent(
    new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: state })
  )

  return state
}

/** Gate non-essential scripts on this. Defaults to false when undecided. */
export const hasConsent = (category: ConsentCategory): boolean =>
  readConsent()?.[category] ?? false

export const onConsentChange = (
  listener: (state: ConsentState) => void
): (() => void) => {
  const handler = (event: Event) => {
    listener((event as CustomEvent<ConsentState>).detail)
  }

  window.addEventListener(CONSENT_CHANGE_EVENT, handler)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler)
}
