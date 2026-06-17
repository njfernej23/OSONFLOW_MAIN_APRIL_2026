"use client"

import { useEffect } from "react"

const OrganizationCreatedPage = () => {
  useEffect(() => {
    window.location.replace("/analytics")
  }, [])

  return null
}

export default OrganizationCreatedPage
