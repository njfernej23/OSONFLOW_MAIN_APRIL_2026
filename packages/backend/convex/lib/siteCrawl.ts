/**
 * A small, bounded crawler for AI setup.
 *
 * The knowledge base importer takes one page at a time because the owner picks
 * each URL. AI setup instead has to form a picture of a whole business from a
 * single address, so it follows the sitemap (and failing that, the homepage's
 * own links) far enough to see the pages that answer real questions - services,
 * prices, hours, contact - without turning into an unbounded web crawler.
 *
 * Every fetch goes through the same SSRF guard the importer uses, and the crawl
 * never leaves the origin it started on.
 */
import {
  MAX_SCRAPED_HTML_LENGTH,
  SCRAPER_USER_AGENT,
  extractWebsiteTextFromHtml,
  normalizeAndValidateWebsiteUrl,
} from "./websiteText"
import { OutboundUrlError, assertSafeOutboundUrl, safeFetch } from "./outboundUrl"

/** Kept low: each page costs a round trip, and the whole crawl runs inside one action. */
export const MAX_CRAWL_PAGES = 12
/** Sitemap indexes are cheap to read and decide which pages are reachable at all. */
const MAX_CHILD_SITEMAPS = 12
const PAGE_TIMEOUT_MS = 12_000
const MAX_PAGE_TEXT_LENGTH = 20_000
/** Total text handed to the model. Well under the context budget, with room for the prompt. */
export const MAX_CORPUS_LENGTH = 120_000

export type CrawledPage = {
  url: string
  title: string
  description?: string
  text: string
}

export type CrawlResult = {
  origin: string
  homepageTitle: string
  pages: CrawledPage[]
  /** Pages that were discovered but not fetched, because the cap was reached. */
  skippedCount: number
}

/**
 * Paths that rarely describe the business but are common enough to crowd out the
 * pages that do. Dropped before the page budget is spent, not after.
 */
const LOW_VALUE_PATTERN =
  /\/(privacy|terms|cookie|legal|login|signin|signup|register|cart|checkout|account|search|tag|author|feed|rss|wp-admin|wp-login)\b/i

const ASSET_PATTERN =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|xml|pdf|zip|mp4|mp3|woff2?|ttf|eot)(\?|$)/i

/**
 * Pages that answer the questions customers actually ask. A sitemap lists
 * everything in whatever order it likes, so without this the page budget gets
 * spent on carousel slides and promo banners while the price list goes unread.
 */
const HIGH_VALUE_PATTERN =
  /(price|pricing|tarif|narx|cena|service|servic|xizmat|uslugi|course|kurs|product|catalog|menu|about|haqida|o-biz|contact|kontakt|aloqa|manzil|branch|filial|location|faq|help|support|team|doctor|shifokor|vrach|staff|book|appointment|qabul|zapis)/i

/** Decorative content types that exist to be looked at, not read. */
const LOW_SIGNAL_PATTERN =
  /(banner|slider|carousel|gallery|galere|photo|portfolio|review|otziv|partner)/i

/**
 * Score a candidate so the useful pages win the budget. Higher is better.
 *
 * `preferredPrefix` is the path the owner actually pasted. On a bilingual site
 * that is the language they expect the assistant to speak, and without the
 * bonus the shorter other-language paths win on depth alone.
 */
const scoreUrl = (url: string, preferredPrefix: string): number => {
  const path = new URL(url).pathname.toLowerCase()

  let score = 0

  if (preferredPrefix && path.startsWith(preferredPrefix)) score += 12
  if (HIGH_VALUE_PATTERN.test(path)) score += 10
  if (LOW_SIGNAL_PATTERN.test(path)) score -= 8

  // Shallow pages tend to be the real sections; deep ones tend to be one item.
  const depth = path.split("/").filter(Boolean).length
  score -= depth

  return score
}

/** First path segment, used to stop one section swallowing the whole budget. */
const sectionOf = (url: string): string =>
  new URL(url).pathname.split("/").filter(Boolean)[0] ?? ""

/** Max pages taken from any single section, so the crawl stays broad. */
const MAX_PER_SECTION = 3

/**
 * Orders candidates by usefulness, then interleaves them so no single section
 * dominates - a site with forty course pages should still surrender its contact
 * and pricing pages.
 */
const prioritize = (urls: string[], preferredPrefix = ""): string[] => {
  const ranked = [...urls].sort(
    (a, b) => scoreUrl(b, preferredPrefix) - scoreUrl(a, preferredPrefix)
  )

  const perSection = new Map<string, number>()
  const kept: string[] = []
  const overflow: string[] = []

  for (const url of ranked) {
    const section = sectionOf(url)
    const used = perSection.get(section) ?? 0

    if (used < MAX_PER_SECTION) {
      perSection.set(section, used + 1)
      kept.push(url)
    } else {
      overflow.push(url)
    }
  }

  return [...kept, ...overflow]
}

const fetchText = async (url: string): Promise<string | null> => {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), PAGE_TIMEOUT_MS)

  try {
    const response = await safeFetch(url, {
      method: "GET",
      headers: {
        "User-Agent": SCRAPER_USER_AGENT,
        Accept: "text/html,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      },
      signal: abortController.signal,
    })

    if (!response.ok) {
      return null
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase()

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("xml")
    ) {
      return null
    }

    return (await response.text()).slice(0, MAX_SCRAPED_HTML_LENGTH)
  } catch {
    // A single unreachable page must not abort the crawl - the pages that did
    // load are still worth building a setup from.
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** Same-origin, non-asset, not obviously boilerplate, de-fragmented. */
const collectCandidateUrls = (
  rawUrls: string[],
  origin: string,
  seen: Set<string>
): string[] => {
  const candidates: string[] = []

  for (const raw of rawUrls) {
    let parsed: URL

    try {
      parsed = new URL(raw, origin)
    } catch {
      continue
    }

    parsed.hash = ""

    const href = parsed.toString()

    if (parsed.origin !== origin) continue
    if (ASSET_PATTERN.test(parsed.pathname)) continue
    if (LOW_VALUE_PATTERN.test(parsed.pathname)) continue
    if (seen.has(href)) continue

    // Guard every discovered link too: a page can link anywhere, and discovery
    // must not become a way around the outbound checks.
    try {
      assertSafeOutboundUrl(href)
    } catch (error) {
      if (error instanceof OutboundUrlError) continue
      continue
    }

    seen.add(href)
    candidates.push(href)
  }

  return candidates
}

const urlsFromSitemap = (xml: string): string[] =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((match) => match[1])
    .filter((url): url is string => Boolean(url))

const urlsFromHtml = (html: string): string[] =>
  [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
    .map((match) => match[1])
    .filter((url): url is string => Boolean(url))

/**
 * Fetches the sitemap when there is one, walking a sitemap index one level deep.
 * Returns an empty list when the site has no usable sitemap.
 */
const discoverFromSitemap = async (
  origin: string,
  seen: Set<string>,
  preferredPrefix: string
): Promise<string[]> => {
  const sitemapXml = await fetchText(new URL("/sitemap.xml", origin).toString())

  if (!sitemapXml) {
    return []
  }

  const isIndex = /<sitemapindex/i.test(sitemapXml)

  if (!isIndex) {
    return collectCandidateUrls(urlsFromSitemap(sitemapXml), origin, seen)
  }

  // Rank the child sitemaps before fetching any: a big WordPress site splits by
  // content type, and reading them in document order spends the whole budget on
  // whichever type happens to be listed first (usually banners).
  const childSitemaps = prioritize(
    urlsFromSitemap(sitemapXml),
    preferredPrefix
  ).slice(0, MAX_CHILD_SITEMAPS)
  const discovered: string[] = []

  for (const childUrl of childSitemaps) {
    let safeChildUrl: string

    try {
      safeChildUrl = assertSafeOutboundUrl(childUrl).toString()
    } catch {
      continue
    }

    if (new URL(safeChildUrl).origin !== origin) continue

    const childXml = await fetchText(safeChildUrl)

    if (childXml) {
      discovered.push(...collectCandidateUrls(urlsFromSitemap(childXml), origin, seen))
    }

    if (discovered.length >= MAX_CRAWL_PAGES * 8) break
  }

  return discovered
}

const readPage = (url: string, html: string): CrawledPage | null => {
  const extracted = extractWebsiteTextFromHtml(html)

  if (!extracted.bodyText || extracted.bodyText.length < 60) {
    return null
  }

  return {
    url,
    title: extracted.title || new URL(url).pathname || url,
    description: extracted.description,
    text: extracted.bodyText.slice(0, MAX_PAGE_TEXT_LENGTH),
  }
}

export const crawlSite = async (
  rawUrl: string,
  options: { maxPages?: number } = {}
): Promise<CrawlResult> => {
  const maxPages = Math.min(options.maxPages ?? MAX_CRAWL_PAGES, MAX_CRAWL_PAGES)
  const startUrl = normalizeAndValidateWebsiteUrl(rawUrl)
  const origin = new URL(startUrl).origin

  const seen = new Set<string>([startUrl])
  const pages: CrawledPage[] = []

  const homepageHtml = await fetchText(startUrl)

  if (!homepageHtml) {
    throw new Error("Could not read that website. Check the address and try again.")
  }

  const homepage = readPage(startUrl, homepageHtml)

  if (homepage) {
    pages.push(homepage)
  }

  const homepageTitle =
    homepage?.title || extractWebsiteTextFromHtml(homepageHtml).title || origin

  // Prefer the sitemap: it is the site's own list of what matters, and it finds
  // pages the homepage never links to.
  // "https://kings.uz/uz/" -> "/uz", so the Uzbek pages outrank the Russian ones.
  const startPath = new URL(startUrl).pathname.toLowerCase()
  const preferredPrefix =
    startPath.split("/").filter(Boolean).length === 1
      ? `/${startPath.split("/").filter(Boolean)[0]}`
      : ""

  let queue = await discoverFromSitemap(origin, seen, preferredPrefix)

  if (queue.length === 0) {
    queue = collectCandidateUrls(urlsFromHtml(homepageHtml), origin, seen)
  }

  const budget = maxPages - pages.length
  const toFetch = prioritize(queue, preferredPrefix).slice(0, Math.max(0, budget))

  for (const url of toFetch) {
    const html = await fetchText(url)

    if (!html) continue

    const page = readPage(url, html)

    if (page) {
      pages.push(page)
    }

    if (pages.length >= maxPages) break
  }

  return {
    origin,
    homepageTitle,
    pages,
    skippedCount: Math.max(0, queue.length - toFetch.length),
  }
}

/**
 * Flattens a crawl into the single block of text the model reasons over, newest
 * pages last so truncation drops the least important material.
 */
export const buildCorpus = (result: CrawlResult): string => {
  const blocks = result.pages.map((page) =>
    [
      `--- PAGE: ${page.title}`,
      `URL: ${page.url}`,
      page.description ? `DESCRIPTION: ${page.description}` : "",
      page.text,
    ]
      .filter(Boolean)
      .join("\n")
  )

  return blocks.join("\n\n").slice(0, MAX_CORPUS_LENGTH)
}
