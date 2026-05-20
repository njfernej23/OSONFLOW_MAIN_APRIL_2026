import type { Metadata } from "next"

import { HomeLandingPage } from "@/modules/marketing/ui/components/home-landing"

export const metadata: Metadata = {
  title: "Osonflow | AI Customer Support",
  description:
    "Launch a polished AI support widget, voice assistant, and human handoff inbox from one calm customer support platform.",
}

export default function LandingPage() {
  return <HomeLandingPage />
}
