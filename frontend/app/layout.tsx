import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { BootSplashLayer } from "@/components/boot-splash"
import { BootSplashClient } from "@/components/boot-splash-client"
import { I18nProvider } from "@/lib/i18n-context"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NAST - Nepal Academy of Science & Technology",
  description: "Empowering innovation and scientific excellence in Nepal.",
  generator: "apex-student",
  icons: {
    icon: [
      {
        url: "/Nepal_Academy_of_Science_and_Technology_Logo.svg.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/Nepal_Academy_of_Science_and_Technology_Logo.svg.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/Nepal_Academy_of_Science_and_Technology_Logo.svg.png",
        type: "image/svg+xml",
      },
    ],
    apple: "/Nepal_Academy_of_Science_and_Technology_Logo.svg.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`font-sans antialiased overflow-x-hidden`}>
        <BootSplashLayer />
        <BootSplashClient />
        <I18nProvider>{children}</I18nProvider>
        <Toaster />
      </body>
    </html>
  )
}
