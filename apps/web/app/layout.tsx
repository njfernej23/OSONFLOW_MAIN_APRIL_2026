import { ClerkProvider } from "@clerk/nextjs"
import { IBM_Plex_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google"
import "@workspace/ui/styles/globals.css"
import "./globals.css"
import { Providers } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import { Toaster } from "@workspace/ui/components/sonner"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
})

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "antialiased",
          fontMono.variable,
          fontSans.variable,
          fontSerif.variable,
          "font-sans"
        )}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <Providers>
            <Toaster />
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
