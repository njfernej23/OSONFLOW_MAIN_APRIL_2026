import { landingPageBodyMarkup } from "./landing-page-markup"

// The site footer (final CTA panel + footer columns on the leaf image) lives
// inside the landing body markup. Secondary pages slice it out of that same
// string rather than keeping a second copy, so the two can never drift apart.
const FOOTER_START = "<!-- ============ FINAL CTA ============ -->"
const MAIN_END = "</main>"

const start = landingPageBodyMarkup.indexOf(FOOTER_START)
const end = landingPageBodyMarkup.lastIndexOf(MAIN_END)

if (start < 0 || end <= start) {
  throw new Error(
    "landing-chrome: could not locate the footer section in landingPageBodyMarkup"
  )
}

const footer = landingPageBodyMarkup.slice(start, end)

/**
 * The footer as it appears on the landing page, where its section anchors
 * ("#pricing", "#faq") resolve against the page they are already on.
 */
export const landingFooterMarkup = footer

/**
 * The same footer for pages that are not the landing page. A bare "#pricing"
 * there points at a section that does not exist, so every section anchor is
 * rewritten to an absolute "/#pricing". Empty "#" placeholders are left alone —
 * they have no destination to resolve to.
 */
export const secondaryFooterMarkup = footer.replace(
  /href="#([\w-]+)"/g,
  'href="/#$1"'
)
