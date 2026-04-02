/**
 * /api/restaurants/[id]/visits
 *
 * GET  — List all visits for a restaurant
 * POST — Log a new visit
 *
 * On POST: auto-creates a follow-up task if followUpDate is provided,
 * updates pipeline stage, and logs an activity entry.
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createVisitSchema } from "@/lib/validations/visit"
import { logActivity } from "@/lib/services/activity.service"
import { recalculateScore } from "@/lib/services/scoring.service"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { repId: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    const access = await getRestaurantAccess(id, user.id, user.role, restaurant.repId)
    if (access === "none") return ApiResponse.forbidden()

    const visits = await db.visit.findMany({
      where: { restaurantId: id },
      orderBy: { visitDate: "desc" },
      include: {
        rep: { select: { id: true, name: true, email: true, avatarUrl: true } },
        files: true,
      },
    })

    return ApiResponse.ok(visits)
  })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id: restaurantId } = await params
    const { user } = await getAuthContext()

    if (!can.logVisit(user.role)) {
      return ApiResponse.forbidden()
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { repId: true, name: true, pipelineStage: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    if (user.role === "SALES_REP" && restaurant.repId !== user.id) {
      return ApiResponse.forbidden()
    }

    const body = await req.json()
    const parsed = createVisitSchema.safeParse({ ...body, restaurantId })
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { followUpDate, visitDate, ...rest } = parsed.data

    const visit = await db.visit.create({
      data: {
        ...rest,
        restaurantId,
        repId: user.id,
        visitDate: new Date(visitDate),
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      },
    })

    // Auto-create a follow-up task when followUpDate is set
    if (followUpDate && parsed.data.nextAction) {
      await db.task.create({
        data: {
          restaurantId,
          assignedToId: user.id,
          title: parsed.data.nextAction,
          taskType: "OTHER",
          dueDate: new Date(followUpDate),
          priority: "HIGH",
        },
      })
    }

    // Advance stage from NOT_CONTACTED or NEEDS_VISIT automatically
    if (
      restaurant.pipelineStage === "NOT_CONTACTED" ||
      restaurant.pipelineStage === "NEEDS_VISIT"
    ) {
      await db.restaurant.update({
        where: { id: restaurantId },
        data: { pipelineStage: "VISITED" },
      })
      await db.stageHistory.create({
        data: {
          restaurantId,
          changedById: user.id,
          fromStage: restaurant.pipelineStage,
          toStage: "VISITED",
          notes: "Auto-advanced on visit log",
        },
      })
    }

    await Promise.all([
      logActivity({
        userId: user.id,
        restaurantId,
        action: "VISIT_LOGGED",
        description: `${user.name} logged a ${parsed.data.visitType.toLowerCase().replace("_", " ")} visit to ${restaurant.name}`,
      }),
      recalculateScore(restaurantId),
    ])

    return ApiResponse.created(visit)
  })
}
