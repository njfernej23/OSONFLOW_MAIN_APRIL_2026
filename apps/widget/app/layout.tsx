import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/styles/globals.css"
import { Providers } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
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
      className={cn("h-full overflow-hidden antialiased", fontMono.variable, "font-sans", geist.variable)}
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
