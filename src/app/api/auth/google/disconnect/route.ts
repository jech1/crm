/**
 * POST /api/auth/google/disconnect
 *
 * Revokes the Google OAuth token and clears calendar sync settings.
 */

import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { getOAuth2Client } from "@/lib/services/googleCalendar.service"
import { db } from "@/lib/db"

export async function POST() {
  try {
    const { user } = await getAuthContext()

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { googleAccessToken: true },
    })

    // Best-effort revoke — ignore failures (token may already be expired)
    if (dbUser?.googleAccessToken) {
      const oauth2 = getOAuth2Client()
      if (oauth2) {
        oauth2.revokeToken(dbUser.googleAccessToken).catch(() => {
          // Ignore revoke errors
        })
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCalendarSync: false,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[google-oauth] Disconnect failed:", err)
    return NextResponse.json({ error: "Failed to disconnect." }, { status: 500 })
  }
}
