/**
 * GET /api/auth/google/connect
 *
 * Initiates the Google OAuth flow with CSRF protection:
 *   1. Generates a random `state` value
 *   2. Stores it in a short-lived httpOnly cookie
 *   3. Passes it to Google via the auth URL
 *   4. The callback route reads the cookie and validates the returned state
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { getAuthUrl } from "@/lib/services/googleCalendar.service"
import { randomBytes } from "crypto"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function GET(_req: NextRequest) {
  try {
    await getAuthContext() // Ensure user is authenticated before redirecting

    const state = randomBytes(16).toString("hex")
    const authUrl = getAuthUrl(state)

    if (!authUrl) {
      // Google env vars are not configured — redirect with a clean error param
      return NextResponse.redirect(new URL("/calendar?google=not-configured", APP_URL))
    }

    const response = NextResponse.redirect(authUrl)
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes — long enough for slow OAuth flows
      path: "/",
    })

    return response
  } catch {
    return NextResponse.redirect(new URL("/calendar?google=error", APP_URL))
  }
}
