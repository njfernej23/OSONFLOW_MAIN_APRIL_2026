/**
 * Turning a fetched web page into plain text.
 *
 * Shared by the knowledge base importer and the AI setup crawler so both read a
 * page the same way, and so the SSRF guard around an owner-supplied URL lives in
 * one place rather than being re-derived per caller.
 */
import { ConvexError } from "convex/values"

import { OutboundUrlError, assertSafeOutboundUrl } from "./outboundUrl"

export const SCRAPER_USER_AGENT = "OsonflowKnowledgeBaseBot/1.0"
export const SCRAPE_TIMEOUT_MS = 15_000
export const MAX_SCRAPED_HTML_LENGTH = 1_500_000
export const MAX_SCRAPED_TEXT_LENGTH = 120_000

/**
 * The scraped body is stored in the organization's knowledge base and read back
 * through the assistant, so an unvalidated URL here is a readable SSRF rather
 * than a blind one.
 */
export const normalizeAndValidateWebsiteUrl = (rawUrl: string): string => {
  const normalized = rawUrl.trim()

  if (!normalized) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Website URL is required",
    })
  }

  try {
    return assertSafeOutboundUrl(normalized).toString()
  } catch (error) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message:
        error instanceof OutboundUrlError
          ? error.message
          : "Invalid website URL",
    })
  }
}

/**
 * Named entities plus numeric ones.
 *
 * The numeric pass matters more than it looks: WordPress emits `&#039;` and
 * `&#8217;` for ordinary apostrophes, so without it every other business name
 * arrives looking like "King&#039;s Academy".
 */
export const decodeHtmlEntities = (content: string): string =>
  content
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    // Ampersand last, so a double-encoded "&amp;#39;" does not become a quote.
    .replaceAll("&amp;", "&")

export const extractWebsiteTextFromHtml = (
  html: string
): {
  title?: string
  description?: string
  bodyText: string
} => {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  )
  const ogDescriptionMatch = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  )

  const cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")

  const bodyText = decodeHtmlEntities(cleanedHtml).replace(/\s+/g, " ").trim()

  const title = titleMatch?.[1]?.trim()
  const description = (descriptionMatch?.[1] || ogDescriptionMatch?.[1])?.trim()

  // Titles and descriptions are shown to the owner and stored as knowledge base
  // entry names, so they get the same entity decoding the body does.
  return {
    title: title ? decodeHtmlEntities(title) : undefined,
    description: description ? decodeHtmlEntities(description) : undefined,
    bodyText,
  }
}
