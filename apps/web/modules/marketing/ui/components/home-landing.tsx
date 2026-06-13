"use client"

import { useEffect } from "react"

import "@/modules/marketing/ui/styles/japandi-landing.css"

import { JapandiLandingNav } from "./japandi-landing-nav"
import { landingPageBodyMarkup } from "./landing-page-markup"

export const HomeLandingPage = () => {
  useEffect(() => {
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      element.classList.add("is-in")
    })

    const script = document.createElement("script")
    script.src = "/landing/main.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      script.remove()
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <>
      <JapandiLandingNav />
      <div dangerouslySetInnerHTML={{ __html: landingPageBodyMarkup }} />
    </>
  )
}
