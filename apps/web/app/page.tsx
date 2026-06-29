import type { Metadata } from "next"

import { HomeLandingPage } from "@/modules/marketing/ui/components/home-landing"

const title = "Osonflow — One calm front door for customer support"
const description =
  "AI answers grounded in trusted context. Humans take over with full history when judgment is needed. Chat, voice, routing, and analytics in one serene support layer."

export const metadata: Metadata = {
  title,
  description:
    "Osonflow is the calm AI customer-support layer for your whole site. Customers reach you by chat or voice, AI answers from trusted context, and every hard question hands off to a human with the full history intact.",
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Osonflow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
}

export default function LandingPage() {
  return <HomeLandingPage />
}
