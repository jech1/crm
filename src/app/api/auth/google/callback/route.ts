/**
 * GET /api/auth/google/callback
 *
 * Handles the Google OAuth callback. Exchanges the code for tokens,
 * stores them on the User record, and enables calendar sync.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { getOAuth2Client } from "@/lib/services/googleCalendar.service"
import { db } from "@/lib/db"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function GET(req: NextRequest) {
  const calendarUrl = new URL("/calendar", APP_URL)

  try {
    const { user } = await getAuthContext()

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error || !code) {
      console.warn("[google-oauth] Callback error:", error ?? "no code")
      return NextResponse.redirect(
        new URL("/calendar?google=error", APP_URL),
      )
    }

    const oauth2 = getOAuth2Client()
    if (!oauth2) {
      return NextResponse.redirect(new URL("/calendar?google=not-configured", APP_URL))
    }

    const { tokens } = await oauth2.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      console.warn("[google-oauth] Missing tokens in response")
      return NextResponse.redirect(new URL("/calendar?google=error", APP_URL))
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleCalendarSync: true,
      },
    })

    const response = NextResponse.redirect(new URL("/calendar?google=connected", APP_URL))
    response.cookies.delete("google_oauth_state")
    return response
  } catch (err) {
    console.error("[google-oauth] Callback failed:", err)
    return NextResponse.redirect(calendarUrl)
  }
}
