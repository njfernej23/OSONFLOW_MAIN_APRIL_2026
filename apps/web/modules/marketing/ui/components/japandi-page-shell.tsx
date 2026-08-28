"use client"

import { useLayoutEffect } from "react"

import { JapandiLandingNav } from "./japandi-landing-nav"
import { secondaryFooterMarkup } from "./landing-chrome"

const LANDING_STYLES_ID = "osonflow-landing-styles"
const LANDING_STYLES_HREF = "/landing/japandi-landing.css"

// Secondary pages need the landing's typography and palette but none of its
// behaviour, so this shell loads only the stylesheet — no main.js, no motion
// layer. The stylesheet is removed on unmount for the same reason the landing
// page removes it: it is a global sheet and must not leak into the dashboard.
function ensureLandingStyles() {
  if (document.getElementById(LANDING_STYLES_ID)) {
    return
  }

  const link = document.createElement("link")
  link.id = LANDING_STYLES_ID
  link.rel = "stylesheet"
  link.href = LANDING_STYLES_HREF
  document.head.appendChild(link)
}

function removeLandingStyles() {
  document.getElementById(LANDING_STYLES_ID)?.remove()

  document
    .querySelectorAll('link[rel="stylesheet"][href*="japandi-landing"]')
    .forEach((node) => {
      node.remove()
    })
}

export const JapandiPageShell = ({
  children,
}: {
  children: React.ReactNode
}) => {
  useLayoutEffect(() => {
    ensureLandingStyles()
    return removeLandingStyles
  }, [])

  return (
    <div className="japandi-landing">
      <JapandiLandingNav />
      <main id="main">
        {children}
        <div
          dangerouslySetInnerHTML={{ __html: secondaryFooterMarkup }}
          suppressHydrationWarning
        />
      </main>
    </div>
  )
}
