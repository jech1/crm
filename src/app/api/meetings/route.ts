/**
 * /api/meetings
 *
 * GET  — list meetings (admin: all, rep: own + supported restaurants)
 * POST — create a meeting, log activity, notify admins
 */

import { type NextRequest } from "next/server"
import { getAuthContext, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createMeetingSchema } from "@/lib/validations/meeting"
import { formatDateTime } from "@/lib/utils"
import { MEETING_TYPE_LABELS } from "@/lib/constants"
import { sendEmail } from "@/lib/email"
import { meetingScheduledTemplate } from "@/lib/email/templates"
import { createCalendarEvent } from "@/lib/services/googleCalendar.service"
import type { MeetingType } from "@prisma/client"

export async function GET(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const { searchParams } = new URL(req.url)
    const includeCompleted = searchParams.get("includeCompleted") === "true"
    const repId = searchParams.get("repId") || undefined

    const where =
      user.role === "ADMIN"
        ? {
            ownerId: repId,
            isCompleted: includeCompleted ? undefined : false,
          }
        : {
            OR: [
              { ownerId: user.id },
              {
                restaurant: {
                  supportingReps: { some: { userId: user.id } },
                },
              },
            ],
            isCompleted: includeCompleted ? undefined : false,
          }

    const meetings = await db.meeting.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
        owner: { select: { id: true, name: true } },
      },
    })

    return ApiResponse.ok(meetings)
  })
}

export async function POST(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()

    const body = await req.json()
    const parsed = createMeetingSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { restaurantId, scheduledAt, ...rest } = parsed.data

    // Look up the restaurant
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, repId: true },
    })
    if (!restaurant) return ApiResponse.notFound("Restaurant not found")

    // Check access — supporting reps and above can schedule
    const access = await getRestaurantAccess(restaurantId, user.id, user.role, restaurant.repId)
    if (access === "none") return ApiResponse.forbidden("You don't have access to this restaurant")

    // Create meeting
    const meeting = await db.meeting.create({
      data: {
        restaurantId,
        ownerId: user.id,
        scheduledAt: new Date(scheduledAt),
        ...rest,
      },
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        restaurantId,
        userId: user.id,
        action: "MEETING_SCHEDULED",
        description: `${user.name} scheduled a ${MEETING_TYPE_LABELS[rest.meetingType as MeetingType]} for ${formatDateTime(meeting.scheduledAt)}`,
      },
    })

    // Notify all active admins except the creator
    const admins = await db.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: user.id } },
      select: { id: true },
    })
    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "MEETING_SCHEDULED" as const,
          title: "New Meeting Scheduled",
          body: `${user.name} scheduled a ${MEETING_TYPE_LABELS[rest.meetingType as MeetingType]} with ${restaurant.name} on ${formatDateTime(meeting.scheduledAt)}${rest.notes ? ` — "${rest.notes}"` : ""}`,
          link: `/restaurants/${restaurantId}`,
        })),
      })
    }

    // Sync to Google Calendar — awaited so googleEventId is persisted before
    // the response is returned. Errors are caught inside and never throw here.
    await createCalendarEvent(user.id, meeting.id, {
      title: meeting.title,
      scheduledAt: meeting.scheduledAt,
      durationMins: meeting.durationMins,
      location: meeting.location,
      notes: meeting.notes,
      restaurantName: meeting.restaurant.name,
    })

    // Email confirmation to the meeting owner
    const { subject, html } = meetingScheduledTemplate({
      ownerName: meeting.owner.name,
      meetingTitle: meeting.title,
      restaurantName: meeting.restaurant.name,
      restaurantId: meeting.restaurant.id,
      scheduledAt: meeting.scheduledAt,
      durationMins: meeting.durationMins,
      location: meeting.location,
      meetingType: MEETING_TYPE_LABELS[meeting.meetingType],
      notes: meeting.notes,
    })
    await sendEmail({ to: meeting.owner.email, subject, html })

    return ApiResponse.created(meeting)
  })
}
