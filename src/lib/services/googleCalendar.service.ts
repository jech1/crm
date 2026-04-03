/**
 * Google Calendar sync service.
 *
 * Design principles:
 *   - CRM is always source of truth. Sync is one-way: CRM → Google.
 *   - Every sync function catches and classifies its own errors.
 *     Auth errors auto-disable sync so the user knows to reconnect.
 *     Not-found errors clear the stale googleEventId so future calls
 *     don't keep hitting the same dead event.
 *   - createCalendarEvent is awaited by callers so googleEventId is
 *     guaranteed to be persisted before the HTTP response is returned.
 *   - updateCalendarEvent and deleteCalendarEvent are also awaited so
 *     error-driven side-effects (clearing stale IDs, marking expired)
 *     happen within the same request lifecycle.
 */

import { google } from "googleapis"
import { db } from "@/lib/db"

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const redirectUri = process.env.GOOGLE_REDIRECT_URI

export function getOAuth2Client() {
  if (!clientId || !clientSecret || !redirectUri) return null
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Build the Google OAuth consent URL.
 * The `state` parameter is required for CSRF protection — generate a
 * random value in the connect route, store it in a cookie, pass it here,
 * and validate it in the callback route.
 */
export function getAuthUrl(state: string): string | null {
  const oauth2 = getOAuth2Client()
  if (!oauth2) return null
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
    state,
  })
}

// ── Error classification ───────────────────────────────────────────────────

function isAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  if (
    msg.includes("invalid_grant") ||
    msg.includes("token has been expired or revoked") ||
    msg.includes("revoked") ||
    msg.includes("unauthorized")
  )
    return true
  const status =
    (err as any).status ?? (err as any).code ?? (err as any).response?.status
  return status === 401
}

function isNotFoundError(err: unknown): boolean {
  const status =
    (err as any).status ?? (err as any).code ?? (err as any).response?.status
  return status === 404 || status === 410
}

// ── Side-effect helpers ────────────────────────────────────────────────────

/**
 * Called when Google returns an auth error (invalid_grant / 401).
 * Clears the tokens and flags the connection as expired so the banner
 * shows the "reconnect needed" state instead of "connected".
 */
async function markSyncExpired(userId: string): Promise<void> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        googleCalendarSync: false,
        googleSyncExpired: true,
        googleAccessToken: null,
        googleRefreshToken: null,
      },
    })
  } catch {
    // Best effort — don't let a DB error mask the original sync problem
  }
}

// ── Token helper ───────────────────────────────────────────────────────────

async function buildAuthenticatedClient(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleCalendarSync: true },
  })

  if (!user?.googleCalendarSync || !user.googleAccessToken || !user.googleRefreshToken) {
    return null
  }

  const oauth2 = getOAuth2Client()
  if (!oauth2) return null

  oauth2.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  })

  // Persist a refreshed access token when the googleapis library auto-renews it
  oauth2.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.user.update({
        where: { id: userId },
        data: { googleAccessToken: tokens.access_token },
      })
    }
  })

  return oauth2
}

// ── Event payload builder ─────────────────────────────────────────────────

export interface MeetingEventData {
  title: string
  scheduledAt: Date
  durationMins?: number | null
  location?: string | null
  notes?: string | null
  restaurantName: string
}

function buildEventResource(data: MeetingEventData) {
  const startTime = new Date(data.scheduledAt)
  const endTime = new Date(startTime.getTime() + (data.durationMins ?? 45) * 60_000)

  return {
    summary: `${data.title} — ${data.restaurantName}`,
    location: data.location ?? undefined,
    description: data.notes ?? undefined,
    // dateTime is an absolute UTC ISO string; timeZone: "UTC" instructs
    // Google to display it in the user's own calendar timezone.
    start: { dateTime: startTime.toISOString(), timeZone: "UTC" },
    end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Create a Google Calendar event and persist the eventId on the meeting.
 *
 * This function is awaited by the caller (not fire-and-forget) so that
 * googleEventId is written to the DB before the HTTP response is returned.
 * If this function is not awaited, a fast delete after create can orphan
 * a Google event that the CRM can never clean up.
 */
export async function createCalendarEvent(
  userId: string,
  meetingId: string,
  data: MeetingEventData,
): Promise<string | null> {
  try {
    const auth = await buildAuthenticatedClient(userId)
    if (!auth) return null

    const calendar = google.calendar({ version: "v3", auth })
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: buildEventResource(data),
    })

    const eventId = res.data.id ?? null

    if (eventId) {
      await db.meeting.update({
        where: { id: meetingId },
        data: { googleEventId: eventId, googleLastSyncedAt: new Date() },
      })
    }

    return eventId
  } catch (err) {
    if (isAuthError(err)) {
      console.warn("[google-calendar] Auth error on create — marking sync expired for user", userId)
      await markSyncExpired(userId)
    } else {
      console.error("[google-calendar] createCalendarEvent failed:", err)
    }
    return null
  }
}

/**
 * Update an existing Google Calendar event.
 *
 * On 404 / 410 (event manually deleted in Google Calendar):
 *   clears the stale googleEventId so future edits don't keep hitting 404.
 *
 * On auth error:
 *   marks sync as expired so the user sees the reconnect prompt.
 */
export async function updateCalendarEvent(
  userId: string,
  meetingId: string,
  googleEventId: string,
  data: MeetingEventData,
): Promise<void> {
  try {
    const auth = await buildAuthenticatedClient(userId)
    if (!auth) return

    const calendar = google.calendar({ version: "v3", auth })
    await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: buildEventResource(data),
    })

    await db.meeting.update({
      where: { id: meetingId },
      data: { googleLastSyncedAt: new Date() },
    })
  } catch (err) {
    if (isNotFoundError(err)) {
      // Event was deleted directly in Google Calendar — clear the dead reference
      console.warn(
        "[google-calendar] Event not found on update — clearing stale googleEventId for meeting",
        meetingId,
      )
      await db.meeting.update({
        where: { id: meetingId },
        data: { googleEventId: null, googleLastSyncedAt: null },
      })
    } else if (isAuthError(err)) {
      console.warn("[google-calendar] Auth error on update — marking sync expired for user", userId)
      await markSyncExpired(userId)
    } else {
      console.error("[google-calendar] updateCalendarEvent failed:", err)
    }
  }
}

/**
 * Delete a Google Calendar event.
 *
 * On 404 / 410: event is already gone — treat as success, no action needed.
 * On auth error: marks sync as expired.
 * Other errors: logged; the CRM meeting is already deleted so an orphaned
 * Google event is the worst outcome.
 */
export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string,
): Promise<void> {
  try {
    const auth = await buildAuthenticatedClient(userId)
    if (!auth) return

    const calendar = google.calendar({ version: "v3", auth })
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId })
  } catch (err) {
    if (isNotFoundError(err)) {
      // Already gone — desired outcome
    } else if (isAuthError(err)) {
      console.warn("[google-calendar] Auth error on delete — marking sync expired for user", userId)
      await markSyncExpired(userId)
    } else {
      console.error("[google-calendar] deleteCalendarEvent failed:", err)
    }
  }
}
