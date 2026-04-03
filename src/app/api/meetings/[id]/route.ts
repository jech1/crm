/**
 * /api/meetings/[id]
 *
 * PATCH  — update meeting fields or mark as complete
 * DELETE — cancel (delete) a meeting
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"
import { formatDateTime } from "@/lib/utils"
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/services/googleCalendar.service"

type RouteContext = { params: Promise<{ id: string }> }

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  scheduledAt: z.string().optional(),
  durationMins: z.number().int().min(5).max(480).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  isCompleted: z.boolean().optional(),
  outcome: z.string().optional(),
  nextStep: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const meeting = await db.meeting.findUnique({
      where: { id },
      select: { id: true, ownerId: true, restaurantId: true, isCompleted: true, googleEventId: true },
    })
    if (!meeting) return ApiResponse.notFound()

    // Only the owner or an admin can modify the meeting
    if (user.role !== "ADMIN" && meeting.ownerId !== user.id) {
      return ApiResponse.forbidden()
    }

    const body = await req.json()
    const parsed = updateMeetingSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { isCompleted, scheduledAt, ...rest } = parsed.data

    const updated = await db.meeting.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(isCompleted && !meeting.isCompleted
          ? { isCompleted: true, completedAt: new Date() }
          : {}),
      },
      include: {
        restaurant: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    })

    // Sync to Google Calendar if a linked event exists and any synced field changed.
    // Awaited so that stale-ID cleanup and auth-expiry side-effects happen within
    // this request. updateCalendarEvent catches its own errors and never throws.
    if (
      meeting.googleEventId &&
      (scheduledAt ||
        rest.title ||
        rest.durationMins !== undefined ||
        rest.location !== undefined ||
        rest.notes !== undefined)
    ) {
      await updateCalendarEvent(meeting.ownerId, meeting.id, meeting.googleEventId, {
        title: updated.title,
        scheduledAt: updated.scheduledAt,
        durationMins: updated.durationMins,
        location: updated.location,
        notes: updated.notes,
        restaurantName: updated.restaurant.name,
      })
    }

    // Log activity when completing
    if (isCompleted && !meeting.isCompleted) {
      await db.activityLog.create({
        data: {
          restaurantId: meeting.restaurantId,
          userId: user.id,
          action: "MEETING_COMPLETED",
          description: `${user.name} marked the meeting with ${updated.restaurant.name} as completed`,
        },
      })
    }

    return ApiResponse.ok(updated)
  })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const meeting = await db.meeting.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        restaurantId: true,
        title: true,
        scheduledAt: true,
        googleEventId: true,
        restaurant: { select: { name: true } },
      },
    })
    if (!meeting) return ApiResponse.notFound()

    if (user.role !== "ADMIN" && meeting.ownerId !== user.id) {
      return ApiResponse.forbidden()
    }

    await db.meeting.delete({ where: { id } })

    // Remove from Google Calendar — awaited so auth-expiry side-effects are
    // captured. deleteCalendarEvent treats 404 as success and never throws.
    if (meeting.googleEventId) {
      await deleteCalendarEvent(meeting.ownerId, meeting.googleEventId)
    }

    await db.activityLog.create({
      data: {
        restaurantId: meeting.restaurantId,
        userId: user.id,
        action: "MEETING_CANCELLED",
        description: `${user.name} cancelled the meeting "${meeting.title}" with ${meeting.restaurant.name} (was ${formatDateTime(meeting.scheduledAt)})`,
      },
    })

    return ApiResponse.ok({ id })
  })
}
