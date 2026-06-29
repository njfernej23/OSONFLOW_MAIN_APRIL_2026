"use client"

import { useLayoutEffect, useEffect } from "react"

import { JapandiLandingNav } from "./japandi-landing-nav"
import { landingPageBodyMarkup } from "./landing-page-markup"

declare global {
  interface Window {
    __initOsonflowLanding?: () => void
    __destroyOsonflowLanding?: () => void
  }
}

const LANDING_SCRIPT_ID = "osonflow-landing-main"
const LANDING_STYLES_ID = "osonflow-landing-styles"
const LANDING_STYLES_HREF = "/landing/japandi-landing.css"

function ensureLandingStyles() {
  const existing = document.getElementById(LANDING_STYLES_ID)

  if (existing instanceof HTMLLinkElement) {
    return existing
  }

  document
    .querySelectorAll('link[rel="stylesheet"][href*="japandi-landing"]')
    .forEach((node) => {
      if (node.id !== LANDING_STYLES_ID) {
        node.remove()
      }
    })

  const link = document.createElement("link")
  link.id = LANDING_STYLES_ID
  link.rel = "stylesheet"
  link.href = LANDING_STYLES_HREF
  document.head.appendChild(link)
  return link
}

function removeLandingStyles() {
  document.getElementById(LANDING_STYLES_ID)?.remove()

  document
    .querySelectorAll('link[rel="stylesheet"][href*="japandi-landing"]')
    .forEach((node) => {
      node.remove()
    })
}

function initLandingScript() {
  const initLanding = () => {
    window.__initOsonflowLanding?.()
  }

  const existingScript = document.getElementById(LANDING_SCRIPT_ID)

  if (existingScript) {
    initLanding()
    return
  }

  const script = document.createElement("script")
  script.id = LANDING_SCRIPT_ID
  script.src = "/landing/main.js"
  script.async = true
  script.onload = initLanding
  document.body.appendChild(script)
}

function revealLandingContent() {
  document.querySelectorAll(".japandi-landing [data-reveal]").forEach((element) => {
    element.classList.add("is-in")
  })
}

export const HomeLandingPage = () => {
  // Inject styles before paint so client-side navigations (e.g. sign-out → /)
  // never render an unstyled landing page.
  useLayoutEffect(() => {
    ensureLandingStyles()

    return () => {
      removeLandingStyles()
    }
  }, [])

  useEffect(() => {
    revealLandingContent()
    initLandingScript()

    return () => {
      window.__destroyOsonflowLanding?.()
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="japandi-landing">
      <JapandiLandingNav />
      <div dangerouslySetInnerHTML={{ __html: landingPageBodyMarkup }} />
    </div>
  )
}
