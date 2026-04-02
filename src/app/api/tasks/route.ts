/**
 * /api/tasks
 *
 * GET  — Task queue for current user (or all tasks for admin)
 * POST — Create a standalone task
 */

import { type NextRequest } from "next/server"
import { getAuthContext, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createTaskSchema } from "@/lib/validations/task"
import { logActivity } from "@/lib/services/activity.service"

export async function GET(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const { searchParams } = new URL(req.url)

    const includeCompleted = searchParams.get("completed") === "true"
    const repId = searchParams.get("repId")

    const tasks = await db.task.findMany({
      where: {
        assignedToId: user.role === "ADMIN" ? (repId ?? undefined) : user.id,
        isCompleted: includeCompleted ? undefined : false,
      },
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }],
      include: {
        restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } },
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })

    return ApiResponse.ok(tasks)
  })
}

export async function POST(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()

    const body = await req.json()
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { dueDate, assignedToId, ...rest } = parsed.data

    // Reps can only create tasks for restaurants they have access to
    if (parsed.data.restaurantId && user.role !== "ADMIN") {
      const restaurant = await db.restaurant.findUnique({
        where: { id: parsed.data.restaurantId },
        select: { repId: true },
      })
      if (!restaurant) return ApiResponse.notFound("Restaurant not found")
      const access = await getRestaurantAccess(
        parsed.data.restaurantId,
        user.id,
        user.role,
        restaurant.repId,
      )
      if (access === "none") return ApiResponse.forbidden()
    }

    const task = await db.task.create({
      data: {
        ...rest,
        dueDate: new Date(dueDate),
        assignedToId: user.role === "ADMIN" && assignedToId ? assignedToId : user.id,
      },
      include: {
        restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } },
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })

    if (parsed.data.restaurantId) {
      await logActivity({
        userId: user.id,
        restaurantId: parsed.data.restaurantId,
        action: "TASK_CREATED",
        description: `${user.name} created task: ${parsed.data.title}`,
      })
    }

    return ApiResponse.created(task)
  })
}
