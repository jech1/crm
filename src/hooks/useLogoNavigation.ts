"use client"

import { usePathname, useRouter } from "next/navigation"
import type { MouseEvent } from "react"

/**
 * Routes where navigating away via the logo could cause loss of unsaved input.
 * Pattern-matched against the current pathname.
 */
const UNSAFE_PATTERNS: Array<string | RegExp> = [
  "/restaurants/new",
  /^\/restaurants\/[^/]+\/edit/,
  "/visits/new",
  "/meetings/new",
  "/warm-leads/new",
]

function isUnsafePage(pathname: string): boolean {
  return UNSAFE_PATTERNS.some((p) =>
    typeof p === "string" ? pathname === p : p.test(pathname),
  )
}

/**
 * Returns an onClick handler for the app logo.
 *
 * - Safe pages: lets the Link navigate normally (handler does nothing).
 * - Unsafe pages (active form input risk): intercepts, shows a native
 *   confirm dialog, and navigates only if the user confirms.
 * - Already on /dashboard: navigation still works (Next.js no-ops it).
 */
export function useLogoNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogoClick(e: MouseEvent) {
    if (!isUnsafePage(pathname)) return // safe — let Link handle it

    e.preventDefault()
    const leave = window.confirm("You have unsaved changes. Leave this page?")
    if (leave) router.push("/dashboard")
  }

  return { handleLogoClick }
}
