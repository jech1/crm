/**
 * POST /api/notifications/generate
 *
 * Generates proactive in-app notifications for the calling user:
 *   TASK_OVERDUE    — tasks past their due date, not yet completed
 *   MEETING_REMINDER — meetings starting within the next 24 hours
 *
 * Deduplication: skips creating a notification if an identical
 * (type, link) pair was already created within the last 12 hours.
 * This prevents badge spam across repeated polling cycles.
 *
 * Returns { unreadCount } for the sidebar badge.
 */

import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { rateLimit } from "@/lib/rateLimit"
import { db } from "@/lib/db"
import { addHours, subHours } from "date-fns"
import { sendEmail } from "@/lib/email"
import { overdueTaskDigestTemplate } from "@/lib/email/templates"

// Client polls every 60 s. Allow 3/min so multiple tabs don't hit the wall,
// but scripted rapid-fire calls (which trigger email sends) are still capped.
const GENERATE_LIMIT = 3
const GENERATE_WINDOW_MS = 60_000

export async function POST() {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()

    const rl = rateLimit(`${user.id}:notify-generate`, GENERATE_LIMIT, GENERATE_WINDOW_MS)
    if (rl.limited) return ApiResponse.tooManyRequests(rl.retryAfterSecs)

    // Connectors have no owned tasks or meetings — just return count
    if (user.role === "CONNECTOR") {
      const unreadCount = await db.notification.count({
        where: { userId: user.id, isRead: false },
      })
      return ApiResponse.ok({ unreadCount })
    }

    const now = new Date()
    const dedupCutoff = subHours(now, 12)

    // ── Overdue tasks assigned to this user ───────────────────────
    const overdueTasks = await db.task.findMany({
      where: {
        assignedToId: user.id,
        isCompleted: false,
        dueDate: { lt: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        restaurantId: true,
        restaurant: { select: { name: true } },
      },
      take: 10,
    })

    // ── Meetings this user owns, starting in the next 24 h ────────
    const upcomingMeetings = await db.meeting.findMany({
      where: {
        ownerId: user.id,
        isCompleted: false,
        scheduledAt: { gte: now, lte: addHours(now, 24) },
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        restaurantId: true,
        restaurant: { select: { name: true } },
      },
      take: 5,
    })

    if (overdueTasks.length === 0 && upcomingMeetings.length === 0) {
      const unreadCount = await db.notification.count({
        where: { userId: user.id, isRead: false },
      })
      return ApiResponse.ok({ unreadCount })
    }

    // ── Load recently-sent notifications to deduplicate ───────────
    const recentNotifs = await db.notification.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: dedupCutoff },
        type: { in: ["TASK_OVERDUE", "MEETING_REMINDER"] },
      },
      select: { type: true, link: true },
    })
    const sent = new Set(recentNotifs.map((n) => `${n.type}::${n.link}`))

    const toCreate: {
      userId: string
      type: "TASK_OVERDUE" | "MEETING_REMINDER"
      title: string
      body: string
      link: string
    }[] = []

    // One TASK_OVERDUE notification per restaurant (covers all overdue tasks there)
    for (const task of overdueTasks) {
      const link = `/restaurants/${task.restaurantId}`
      const key = `TASK_OVERDUE::${link}`
      if (!sent.has(key)) {
        toCreate.push({
          userId: user.id,
          type: "TASK_OVERDUE",
          title: "Overdue task",
          body: `"${task.title}" at ${task.restaurant?.name ?? "a restaurant"} is past due.`,
          link,
        })
        sent.add(key)
      }
    }

    // One MEETING_REMINDER summarising all meetings in the next 24 h
    if (upcomingMeetings.length > 0) {
      const key = `MEETING_REMINDER::/calendar`
      if (!sent.has(key)) {
        const preview = upcomingMeetings
          .slice(0, 2)
          .map((m) => `"${m.title}"`)
          .join(", ")
        const extra =
          upcomingMeetings.length > 2
            ? ` +${upcomingMeetings.length - 2} more`
            : ""
        toCreate.push({
          userId: user.id,
          type: "MEETING_REMINDER",
          title: `${upcomingMeetings.length} meeting${upcomingMeetings.length > 1 ? "s" : ""} coming up`,
          body: `${preview}${extra} in the next 24 hours.`,
          link: "/calendar",
        })
      }
    }

    if (toCreate.length > 0) {
      await db.notification.createMany({ data: toCreate })

      // Send overdue task digest email if any new TASK_OVERDUE notifications were created
      const newOverdueTasks = toCreate.filter((n) => n.type === "TASK_OVERDUE")
      if (newOverdueTasks.length > 0) {
        const digestTasks = overdueTasks
          .filter((t) => newOverdueTasks.some((n) => n.link === `/restaurants/${t.restaurantId}`))
          .filter((t) => t.restaurantId !== null)
          .map((t) => ({
            title: t.title,
            restaurantName: t.restaurant?.name ?? "Unknown restaurant",
            restaurantId: t.restaurantId!,
            dueDate: t.dueDate!,
          }))

        const { subject, html } = overdueTaskDigestTemplate({
          recipientName: user.name,
          tasks: digestTasks,
        })
        await sendEmail({ to: user.email, subject, html })
      }
    }

    const unreadCount = await db.notification.count({
      where: { userId: user.id, isRead: false },
    })

    return ApiResponse.ok({ unreadCount })
  })
}
