/**
 * POST /api/auth/google/disconnect
 *
 * Cleanly disconnects Google Calendar:
 *   1. Best-effort revokes the Google token
 *   2. Clears all token fields and disables sync
 *   3. Nulls googleEventId on all the user's meetings so that if they
 *      reconnect (possibly with a different Google account), stale event
 *      IDs don't cause silent 404 failures on future edits
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
        oauth2.revokeToken(dbUser.googleAccessToken).catch(() => {})
      }
    }

    // Clear tokens, disable sync, reset expired flag
    await db.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCalendarSync: false,
        googleSyncExpired: false,
      },
    })

    // Clear googleEventId on all owned meetings.
    // This prevents stale IDs from causing silent failures on edit
    // if the user reconnects with a different Google account.
    await db.meeting.updateMany({
      where: { ownerId: user.id, googleEventId: { not: null } },
      data: { googleEventId: null, googleLastSyncedAt: null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[google-oauth] Disconnect failed:", err)
    return NextResponse.json({ error: "Failed to disconnect." }, { status: 500 })
  }
}
