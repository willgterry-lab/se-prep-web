import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SE Prep — Discovery-to-brief in minutes",
  description:
    "Paste your product URL and discovery notes. Get MEDDPICC scoring, matched case studies, and a follow-up email — instantly.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
