import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { IBM_Plex_Mono, Lora } from "next/font/google"
import localFont from "next/font/local"
import "@workspace/ui/styles/globals.css"
import "./globals.css"
import { CookieConsent } from "@/components/cookie-consent"
import { Providers } from "@/components/theme-provider"
import { appPath } from "@/lib/urls"
import { cn } from "@workspace/ui/lib/utils"
import { Toaster } from "@workspace/ui/components/sonner"

// Note: `alternates.canonical` is deliberately NOT set here. Metadata is merged
// down the tree, so a canonical on the root layout would silently point every
// page that forgot to override it at the same URL. Each page sets its own.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.osonflow.uz"),
  title: {
    default: "Osonflow — AI customer support for chat and voice",
    template: "%s | Osonflow",
  },
  description:
    "Osonflow answers your customers on chat and voice from your own help docs, prices, and policies — and hands the conversation to your team, with the full history, the moment a person is needed.",
  applicationName: "Osonflow",
  referrer: "origin-when-cross-origin",
  openGraph: {
    siteName: "Osonflow",
    type: "website",
    locale: "en",
    alternateLocale: ["uz", "ru"],
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
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
})

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
})

const fontDisplay = localFont({
  src: "./fonts/ClashDisplay-Variable.woff2",
  variable: "--font-display",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Expanded:wght@100;200;300;400;500;600;700;800;900&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          "antialiased",
          fontDisplay.variable,
          fontMono.variable,
          fontSerif.variable,
          "font-sans"
        )}
        suppressHydrationWarning
      >
        <ClerkProvider
          signInFallbackRedirectUrl={appPath("/analytics")}
          signUpFallbackRedirectUrl={appPath("/org-selection")}
          taskUrls={{
            "choose-organization": "/org-selection",
          }}
        >
          <Providers>
            <a
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-[8px] focus:bg-[#397dff] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
              href="#main"
            >
              Skip to main content
            </a>
            <Toaster />
            {children}
            <CookieConsent />
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
