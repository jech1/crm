/**
 * GET /api/auth/google/callback
 *
 * Handles the Google OAuth callback:
 *   1. Validates the returned `state` param against the cookie (CSRF check)
 *   2. Exchanges the code for tokens
 *   3. Stores tokens on the User record, enables sync
 *   4. Clears the state cookie and redirects to /calendar with a result param
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { getOAuth2Client } from "@/lib/services/googleCalendar.service"
import { db } from "@/lib/db"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  try {
    const { user } = await getAuthContext()

    const code = searchParams.get("code")
    const returnedState = searchParams.get("state")
    const oauthError = searchParams.get("error")

    // User denied access on Google's consent screen
    if (oauthError) {
      console.warn("[google-oauth] User denied access or Google returned error:", oauthError)
      return redirectWithCleanCookie("/calendar?google=denied")
    }

    if (!code) {
      return redirectWithCleanCookie("/calendar?google=error")
    }

    // ── CSRF: validate state ──────────────────────────────────────────────
    const cookieState = req.cookies.get("google_oauth_state")?.value

    if (!returnedState || !cookieState || returnedState !== cookieState) {
      console.warn("[google-oauth] State mismatch — possible CSRF attempt", {
        returnedState: returnedState ? "present" : "missing",
        cookieState: cookieState ? "present" : "missing",
        match: returnedState === cookieState,
      })
      return redirectWithCleanCookie("/calendar?google=error")
    }

    // ── Token exchange ────────────────────────────────────────────────────
    const oauth2 = getOAuth2Client()
    if (!oauth2) {
      return redirectWithCleanCookie("/calendar?google=not-configured")
    }

    const { tokens } = await oauth2.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      // This can happen if the user has connected before and Google
      // doesn't re-issue a refresh token without `prompt: "consent"`.
      // getAuthUrl always requests consent, so this should be rare.
      console.warn("[google-oauth] Token exchange succeeded but refresh_token missing")
      return redirectWithCleanCookie("/calendar?google=error")
    }

    // ── Persist tokens ────────────────────────────────────────────────────
    await db.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleCalendarSync: true,
        googleSyncExpired: false, // clear any previous expiry flag
      },
    })

    return redirectWithCleanCookie("/calendar?google=connected")
  } catch (err) {
    console.error("[google-oauth] Callback failed:", err)
    return redirectWithCleanCookie("/calendar?google=error")
  }
}

function redirectWithCleanCookie(path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, APP_URL))
  response.cookies.delete("google_oauth_state")
  return response
}
