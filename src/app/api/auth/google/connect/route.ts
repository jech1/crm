/**
 * GET /api/auth/google/connect
 *
 * Initiates the Google OAuth flow. Stores a random state token in
 * a short-lived cookie to prevent CSRF, then redirects to Google.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { getAuthUrl } from "@/lib/services/googleCalendar.service"
import { randomBytes } from "crypto"

export async function GET(_req: NextRequest) {
  try {
    await getAuthContext() // Ensure user is authenticated

    const authUrl = getAuthUrl()
    if (!authUrl) {
      return NextResponse.json(
        { error: "Google Calendar integration is not configured." },
        { status: 503 },
      )
    }

    const state = randomBytes(16).toString("hex")

    const response = NextResponse.redirect(authUrl)
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    })

    return response
  } catch {
    return NextResponse.redirect(new URL("/calendar", process.env.NEXT_PUBLIC_APP_URL ?? ""))
  }
}
