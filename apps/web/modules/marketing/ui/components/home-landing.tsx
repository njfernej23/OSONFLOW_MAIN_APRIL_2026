"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect } from "react"

import "@/modules/marketing/ui/styles/japandi-landing.css"

import { JapandiLandingNav } from "./japandi-landing-nav"
import { landingPageBodyMarkup } from "./landing-page-markup"

declare global {
  interface Window {
    __initOsonflowLanding?: () => void
    __destroyOsonflowLanding?: () => void
  }
}

const LANDING_SCRIPT_ID = "osonflow-landing-main"

export const HomeLandingPage = () => {
  const { isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    document.querySelectorAll(".japandi-landing [data-reveal]").forEach((element) => {
      element.classList.add("is-in")
    })

    const initLanding = () => {
      window.__initOsonflowLanding?.()
    }

    const existingScript = document.getElementById(LANDING_SCRIPT_ID)

    if (existingScript) {
      initLanding()
    } else {
      const script = document.createElement("script")
      script.id = LANDING_SCRIPT_ID
      script.src = "/landing/main.js"
      script.async = true
      script.onload = initLanding
      document.body.appendChild(script)
    }

    return () => {
      window.__destroyOsonflowLanding?.()
      document.body.style.overflow = ""
    }
  }, [isLoaded, isSignedIn])

  return (
    <div className="japandi-landing">
      <JapandiLandingNav />
      <div dangerouslySetInnerHTML={{ __html: landingPageBodyMarkup }} />
    </div>
  )
}
