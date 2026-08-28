import type { Metadata } from "next"

import { HomeLandingPage } from "@/modules/marketing/ui/components/home-landing"

const title = "Osonflow — AI customer support for chat and voice"
const description =
  "Osonflow answers your customers by chat and voice using your own help docs, prices, and policies — and hands the conversation to your team, with the full history, the moment a person is needed."

export const metadata: Metadata = {
  // Absolute so the homepage does not render as "… | Osonflow | Osonflow"
  // under the root layout's title template.
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
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
        alt: "Osonflow — AI customer support for chat and voice",
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
