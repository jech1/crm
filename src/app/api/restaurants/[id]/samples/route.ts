/**
 * /api/restaurants/[id]/samples
 *
 * GET  — List samples for a restaurant
 * POST — Log a new sample
 */

import { type NextRequest } from "next/server"
import { getAuthContext, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createSampleSchema } from "@/lib/validations/sample"
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

    const samples = await db.sample.findMany({
      where: { restaurantId: id },
      orderBy: { sampleDate: "desc" },
    })

    return ApiResponse.ok(samples)
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
    const parsed = createSampleSchema.safeParse({ ...body, restaurantId })
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { sampleDate, ...rest } = parsed.data

    const sample = await db.sample.create({
      data: {
        ...rest,
        sampleDate: new Date(sampleDate),
      },
    })

    await Promise.all([
      logActivity({
        userId: user.id,
        restaurantId,
        action: "SAMPLE_LOGGED",
        description: `${user.name} logged a ${parsed.data.product} sample for ${restaurant.name}`,
      }),
      recalculateScore(restaurantId),
    ])

    return ApiResponse.created(sample)
  })
}
