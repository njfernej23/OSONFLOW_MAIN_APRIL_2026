import type { MetadataRoute } from "next"

import { getMarketingOrigin } from "@/lib/urls"

// One robots.txt is served from both hosts (www.osonflow.uz and app.osonflow.uz),
// so the rules have to be correct for either. Everything behind auth is listed
// explicitly as disallowed rather than relying on the login wall, because a
// crawler that follows a stale link should be told not to index the redirect.
const APP_ONLY_PATHS = [
  "/ai-conversations",
  "/analytics",
  "/assistant-tools",
  "/billing",
  "/conversations",
  "/customer-memory",
  "/customization",
  "/files",
  "/integrations",
  "/leads",
  "/org-selection",
  "/org-transfer",
  "/organization-created",
  "/workflows",
]

const AUTH_PATHS = ["/sign-in", "/sign-up", "/sso-callback"]

export default function robots(): MetadataRoute.Robots {
  const origin = getMarketingOrigin()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          ...APP_ONLY_PATHS.map((path) => `${path}/`),
          ...AUTH_PATHS.map((path) => `${path}/`),
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
