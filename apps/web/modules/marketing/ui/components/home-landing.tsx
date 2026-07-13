"use client"

import { useLayoutEffect, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { LandingCaseStudyShowcase } from "./landing-case-study-showcase"
import { JapandiLandingNav } from "./japandi-landing-nav"
import { LandingScrollMotion } from "./landing-scroll-motion"
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

function revealHeroOnly() {
  document
    .querySelectorAll(".japandi-landing .hero [data-reveal], .japandi-landing .hero .reveal")
    .forEach((element) => {
      element.classList.add("is-in")
    })
}

function mountLandingMarkup(host: HTMLDivElement | null) {
  if (!host || host.dataset.landingMarkupMounted === "true") return
  host.innerHTML = landingPageBodyMarkup
  host.dataset.landingMarkupMounted = "true"
}

function landingMarkupIsReady() {
  return Boolean(document.getElementById("main"))
}

function runLandingInit() {
  if (!landingMarkupIsReady()) return
  revealHeroOnly()
  initLandingScript()
}

export const HomeLandingPage = () => {
  const landingContentRef = useRef<HTMLDivElement>(null)
  const [caseStudyHost, setCaseStudyHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    ensureLandingStyles()
    mountLandingMarkup(landingContentRef.current)
    setCaseStudyHost(document.getElementById("osonflow-case-study-root"))

    const previousRestoration = history.scrollRestoration
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }

    if (!window.location.hash) {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    return () => {
      removeLandingStyles()
      if ("scrollRestoration" in history) {
        history.scrollRestoration = previousRestoration || "auto"
      }
    }
  }, [])

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0)
    }

    runLandingInit()

    return () => {
      window.__destroyOsonflowLanding?.()
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="japandi-landing">
      <JapandiLandingNav />
      <div ref={landingContentRef} />
      {caseStudyHost
        ? createPortal(<LandingCaseStudyShowcase />, caseStudyHost)
        : null}
      <LandingScrollMotion />
    </div>
  )
}
