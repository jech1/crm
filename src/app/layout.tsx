/**
 * Root layout.
 * Wraps the entire app in ClerkProvider and sets the document metadata.
 * No UI here — just providers and global styles.
 */

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Produce CRM",
    template: "%s | Produce CRM",
  },
  description: "Sales operating system for produce distribution teams",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  )
}
