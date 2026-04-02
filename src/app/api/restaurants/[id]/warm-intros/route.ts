/**
 * /api/restaurants/[id]/warm-intros
 *
 * GET  — List warm intros for a restaurant
 * POST — Create a warm intro (all roles)
 */

import { type NextRequest } from "next/server"
import { getAuthContext, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createWarmIntroSchema } from "@/lib/validations/warm-intro"
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

    const warmIntros = await db.warmIntro.findMany({
      where: { restaurantId: id },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: { addedBy: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    return ApiResponse.ok(warmIntros)
  })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id: restaurantId } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { repId: true, name: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    const access = await getRestaurantAccess(restaurantId, user.id, user.role, restaurant.repId)
    if (access === "none") return ApiResponse.forbidden()

    const body = await req.json()
    const parsed = createWarmIntroSchema.safeParse({ ...body, restaurantId })
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { meetingDate, ...rest } = parsed.data

    const warmIntro = await db.warmIntro.create({
      data: {
        ...rest,
        addedById: user.id,
        meetingDate: meetingDate ? new Date(meetingDate) : undefined,
      },
      include: { addedBy: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    await Promise.all([
      logActivity({
        userId: user.id,
        restaurantId,
        action: "WARM_INTRO_ADDED",
        description: `${user.name} added a warm intro for ${restaurant.name} (via ${parsed.data.introducedBy})`,
      }),
      recalculateScore(restaurantId),
    ])

    return ApiResponse.created(warmIntro)
  })
}
