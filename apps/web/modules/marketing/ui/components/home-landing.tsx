"use client"

import { useLayoutEffect, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { LandingCaseStudyShowcase } from "./landing-case-study-showcase"
import { JapandiLandingNav } from "./japandi-landing-nav"
import { landingPageBodyMarkup } from "./landing-page-markup"

declare global {
  interface Window {
    __initOsonflowLanding?: () => void
    __destroyOsonflowLanding?: () => void
  }
}

const LANDING_SCRIPT_ID = "osonflow-landing-main"
const LANDING_MOTION_SCRIPT_ID = "osonflow-landing-motion"
const LANDING_STYLES_ID = "osonflow-landing-styles"
const LANDING_MOTION_STYLES_ID = "osonflow-landing-motion-styles"
const LANDING_STYLES_HREF = "/landing/japandi-landing.css"
const LANDING_MOTION_STYLES_HREF = "/landing/motion.css"
const LANDING_MOTION_SCRIPT_HREF = "/landing/motion.js"

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

function ensureLandingMotionStyles() {
  const existing = document.getElementById(LANDING_MOTION_STYLES_ID)

  if (existing instanceof HTMLLinkElement) {
    return existing
  }

  document
    .querySelectorAll('link[rel="stylesheet"][href*="motion.css"]')
    .forEach((node) => {
      if (node.id !== LANDING_MOTION_STYLES_ID) {
        node.remove()
      }
    })

  const link = document.createElement("link")
  link.id = LANDING_MOTION_STYLES_ID
  link.rel = "stylesheet"
  link.href = LANDING_MOTION_STYLES_HREF
  document.head.appendChild(link)
  return link
}

function removeLandingMotionStyles() {
  document.getElementById(LANDING_MOTION_STYLES_ID)?.remove()

  document
    .querySelectorAll('link[rel="stylesheet"][href*="motion.css"]')
    .forEach((node) => {
      node.remove()
    })
}

function removeLandingStyles() {
  removeLandingMotionStyles()
  document.getElementById(LANDING_STYLES_ID)?.remove()

  document
    .querySelectorAll('link[rel="stylesheet"][href*="japandi-landing"]')
    .forEach((node) => {
      node.remove()
    })
}

function destroyLandingMotionChrome() {
  document.documentElement.classList.remove("mo-on")
  document.querySelector(".mo-progress")?.remove()
  document.querySelector(".mo-top")?.remove()
}

function initLandingMotionScript() {
  const existingScript = document.getElementById(LANDING_MOTION_SCRIPT_ID)

  if (existingScript) {
    destroyLandingMotionChrome()
    existingScript.remove()
  }

  const script = document.createElement("script")
  script.id = LANDING_MOTION_SCRIPT_ID
  script.src = LANDING_MOTION_SCRIPT_HREF
  script.async = true
  document.body.appendChild(script)
}

function initLandingScript() {
  const initLanding = () => {
    window.__initOsonflowLanding?.()
    initLandingMotionScript()
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
    ensureLandingMotionStyles()
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
      destroyLandingMotionChrome()
      document.getElementById(LANDING_MOTION_SCRIPT_ID)?.remove()
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
      destroyLandingMotionChrome()
      document.getElementById(LANDING_MOTION_SCRIPT_ID)?.remove()
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
    </div>
  )
}
