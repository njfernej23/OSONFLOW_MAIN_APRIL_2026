import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { IBM_Plex_Mono, Lora } from "next/font/google"
import localFont from "next/font/local"
import "@workspace/ui/styles/globals.css"
import "./globals.css"
import { Providers } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import { Toaster } from "@workspace/ui/components/sonner"

export const metadata: Metadata = {
  metadataBase: new URL("https://www.osonflow.uz"),
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
          signInFallbackRedirectUrl="/analytics"
          signUpFallbackRedirectUrl="/org-selection"
        >
          <Providers>
            <Toaster />
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
