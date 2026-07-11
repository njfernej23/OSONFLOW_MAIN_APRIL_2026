"use client"

import { useUser } from "@clerk/nextjs"
import { useCallback, useLayoutEffect, useEffect, useRef, useState } from "react"

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

function runLandingInit(onReady: () => void) {
  const initLanding = () => {
    window.__initOsonflowLanding?.()
    onReady()
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

function hasLandingMarkup(markupRoot: HTMLDivElement | null) {
  return Boolean(markupRoot?.querySelector("#main"))
}

export const HomeLandingPage = () => {
  const markupRef = useRef<HTMLDivElement>(null)
  const [motionKey, setMotionKey] = useState(0)
  const { isLoaded: isAuthLoaded, isSignedIn } = useUser()
  const previousSignedIn = useRef<boolean | undefined>(undefined)

  const bootstrapLanding = useCallback(() => {
    const start = (attempt = 0) => {
      if (!hasLandingMarkup(markupRef.current)) {
        if (attempt < 8) {
          requestAnimationFrame(() => start(attempt + 1))
        }
        return
      }

      runLandingInit(() => {
        revealHeroOnly()
        setMotionKey((key) => key + 1)
      })
    }

    start()
  }, [])

  // Inject styles before paint so client-side navigations (e.g. sign-out → /)
  // never render an unstyled landing page.
  useLayoutEffect(() => {
    ensureLandingStyles()

    const previousRestoration = history.scrollRestoration
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }

    // Refresh / remount should start at the top unless the URL has a section hash.
    if (!window.location.hash) {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    bootstrapLanding()

    return () => {
      window.__destroyOsonflowLanding?.()
      document.body.style.overflow = ""
      removeLandingStyles()
      if ("scrollRestoration" in history) {
        history.scrollRestoration = previousRestoration || "auto"
      }
    }
  }, [bootstrapLanding])

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0)
    }
  }, [])

  // Clerk sign-out on the landing page can refresh client state without a full
  // reload, leaving stale listeners on replaced markup. Re-bind interactivity.
  useEffect(() => {
    if (!isAuthLoaded) return

    if (
      previousSignedIn.current !== undefined &&
      previousSignedIn.current !== isSignedIn
    ) {
      bootstrapLanding()
    }

    previousSignedIn.current = isSignedIn
  }, [bootstrapLanding, isAuthLoaded, isSignedIn])

  return (
    <div className="japandi-landing">
      <JapandiLandingNav />
      {motionKey > 0 ? <LandingScrollMotion resetKey={motionKey} /> : null}
      <div
        ref={markupRef}
        dangerouslySetInnerHTML={{ __html: landingPageBodyMarkup }}
      />
    </div>
  )
}
