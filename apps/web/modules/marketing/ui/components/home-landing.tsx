"use client"

import { useUser } from "@clerk/nextjs"
import { useLayoutEffect, useEffect, useRef } from "react"

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

export const HomeLandingPage = () => {
  const { isLoaded: isAuthLoaded, isSignedIn } = useUser()
  const previousSignedIn = useRef<boolean | undefined>(undefined)

  useLayoutEffect(() => {
    ensureLandingStyles()

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

    revealHeroOnly()
    initLandingScript()

    return () => {
      window.__destroyOsonflowLanding?.()
      document.body.style.overflow = ""
    }
  }, [])

  // Re-bind vanilla JS widgets after Clerk sign-out/sign-in on the same page.
  useEffect(() => {
    if (!isAuthLoaded) return

    if (
      previousSignedIn.current !== undefined &&
      previousSignedIn.current !== isSignedIn
    ) {
      revealHeroOnly()
      initLandingScript()
    }

    previousSignedIn.current = isSignedIn
  }, [isAuthLoaded, isSignedIn])

  return (
    <div className="japandi-landing">
      <JapandiLandingNav />
      <div dangerouslySetInnerHTML={{ __html: landingPageBodyMarkup }} />
      <LandingScrollMotion />
    </div>
  )
}
