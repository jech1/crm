/**
 * Google Calendar sync service.
 *
 * Responsibilities:
 *   - Build an OAuth2 client from stored user tokens
 *   - Auto-refresh the access token and persist the new token
 *   - Create / update / delete Calendar events for meetings
 *
 * All functions are fire-and-forget safe — callers catch errors and
 * proceed; a sync failure never breaks the CRM operation.
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

export function getAuthUrl(): string | null {
  const oauth2 = getOAuth2Client()
  if (!oauth2) return null
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
  })
}

// ── Token helper ──────────────────────────────────────────────────────────

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

  // Persist refreshed access token automatically
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

interface MeetingEventData {
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
    start: { dateTime: startTime.toISOString(), timeZone: "UTC" },
    end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Create a Google Calendar event and return the event ID.
 * Returns null if the user hasn't connected Google Calendar.
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
      await db.meeting.update({ where: { id: meetingId }, data: { googleEventId: eventId } })
    }

    return eventId
  } catch (err) {
    console.error("[google-calendar] createCalendarEvent failed:", err)
    return null
  }
}

/**
 * Update an existing Google Calendar event.
 * No-op if the meeting has no googleEventId or user hasn't connected.
 */
export async function updateCalendarEvent(
  userId: string,
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
  } catch (err) {
    console.error("[google-calendar] updateCalendarEvent failed:", err)
  }
}

/**
 * Delete a Google Calendar event.
 * No-op if the meeting has no googleEventId or user hasn't connected.
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
    console.error("[google-calendar] deleteCalendarEvent failed:", err)
  }
}
