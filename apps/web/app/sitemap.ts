import type { MetadataRoute } from "next"

import { marketingPath } from "@/lib/urls"

// Only public marketing pages belong here. The dashboard lives on another host
// behind auth, and listing it would just feed crawlers a wall of redirects.
//
// The three site languages (en / uz / ru) are applied client-side on the same
// URL rather than served from separate paths, so there is one entry per page
// and no alternates to declare.
const ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
] as const satisfies ReadonlyArray<{
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
  priority: number
}>

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: marketingPath(path),
    lastModified,
    changeFrequency,
    priority,
  }))
}
