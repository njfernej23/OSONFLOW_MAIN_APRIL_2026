import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google"

import "@workspace/ui/styles/globals.css"
import { Providers } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full overflow-hidden antialiased",
        fontMono.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <body className="h-full overflow-hidden" suppressHydrationWarning>
        <Providers>
          <div className="h-full min-h-0 w-full min-w-0 overflow-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
