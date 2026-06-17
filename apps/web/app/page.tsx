import type { Metadata } from "next"

import { HomeLandingPage } from "@/modules/marketing/ui/components/home-landing"

export const metadata: Metadata = {
  title: "Osonflow — One calm front door for customer support",
  description:
    "Osonflow is the calm AI customer-support layer for your whole site. Customers reach you by chat or voice, AI answers from trusted context, and every hard question hands off to a human with the full history intact.",
  openGraph: {
    title: "Osonflow — One calm front door for customer support",
    description:
      "AI answers grounded in trusted context. Humans take over with full history when judgment is needed. Chat, voice, routing, and analytics in one serene support layer.",
    type: "website",
  },
}

export default function LandingPage() {
  return (
    <>
      <link
        id="osonflow-landing-styles"
        rel="stylesheet"
        href="/landing/japandi-landing.css"
      />
      <HomeLandingPage />
    </>
  )
}
