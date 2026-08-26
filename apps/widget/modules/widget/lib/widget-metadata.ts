import type { Doc } from "@workspace/backend/_generated/dataModel"

export const getWidgetMetadata = (
  source = "workflow_widget"
): Doc<"contactSessions">["metadata"] => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      source,
    }
  }

  let visitorId: string | null = null

  try {
    visitorId = window.localStorage.getItem("osonflow_visitor_id")

    if (!visitorId) {
      visitorId = `visitor_${Date.now().toString(36)}`
      window.localStorage.setItem("osonflow_visitor_id", visitorId)
    }
  } catch {
    visitorId = `visitor_${Date.now().toString(36)}`
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(","),
    platform: navigator.platform,
    vendor: navigator.vendor,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookieEnabled: navigator.cookieEnabled,
    referrer: document.referrer || "direct",
    currentUrl: window.location.href,
    source,
    visitorId,
  }
}
