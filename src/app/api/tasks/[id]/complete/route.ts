/**
 * /api/tasks/[id]/complete
 *
 * POST — Mark a task as complete with outcome type and notes.
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { completeTaskSchema } from "@/lib/validations/task"
import { logActivity } from "@/lib/services/activity.service"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const task = await db.task.findUnique({
      where: { id },
      select: { assignedToId: true, restaurantId: true, title: true, taskType: true, isCompleted: true },
    })
    if (!task) return ApiResponse.notFound()
    if (task.isCompleted) return ApiResponse.ok({ alreadyCompleted: true })

    // Only the assigned user or an admin can complete a task
    if (user.role !== "ADMIN" && task.assignedToId !== user.id) {
      return ApiResponse.forbidden()
    }

    const body = await req.json().catch(() => ({}))
    const parsed = completeTaskSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const updated = await db.task.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        outcomeType: parsed.data.outcomeType ?? null,
        completionNotes: parsed.data.completionNotes ?? null,
      },
    })

    if (task.restaurantId) {
      const outcomeLabel = parsed.data.outcomeType
        ? parsed.data.outcomeType.replace(/_/g, " ").toLowerCase()
        : null
      const description = outcomeLabel
        ? `${user.name} completed "${task.title}" — ${outcomeLabel}${parsed.data.completionNotes ? `: ${parsed.data.completionNotes}` : ""}`
        : `${user.name} completed task: ${task.title}`

      // Fetch restaurant name for notification body (reuse for both activity + notification)
      const restaurant = await db.restaurant.findUnique({
        where: { id: task.restaurantId },
        select: { name: true },
      })

      await logActivity({
        userId: user.id,
        restaurantId: task.restaurantId,
        action: "TASK_COMPLETED",
        description,
      })

      // Notify active admins (skip if actor is admin — they don't need to notify themselves)
      if (user.role !== "ADMIN") {
        const admins = await db.user.findMany({
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { id: true },
        })
        if (admins.length > 0) {
          await db.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: "TASK_COMPLETED" as const,
              title: "Task Completed",
              body: restaurant
                ? `${description} (${restaurant.name})`
                : description,
              link: `/restaurants/${task.restaurantId}`,
            })),
          })
        }
      }
    }

    return ApiResponse.ok(updated)
  })
}
