/**
 * /api/restaurants
 *
 * GET  — Paginated, filtered restaurant list
 * POST — Create a new restaurant
 *
 * Query params for GET:
 *   page, limit, q (search), stage, repId, zip, city, sort, order
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createRestaurantSchema } from "@/lib/validations/restaurant"
import { logActivity } from "@/lib/services/activity.service"
import { matchTerritory } from "@/lib/territories/autoAssign"
import { checkNameCityDuplicate } from "@/lib/restaurants/deduplicate"
import type { Prisma, PipelineStage } from "@prisma/client"

export async function GET(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"))
    const skip = (page - 1) * limit

    const q = searchParams.get("q") ?? ""
    const stage = searchParams.get("stage") as PipelineStage | null
    const repId = searchParams.get("repId")
    const zip = searchParams.get("zip")
    const city = searchParams.get("city")
    const sort = (searchParams.get("sort") ?? "updatedAt") as keyof Prisma.RestaurantOrderByWithRelationInput
    const order = (searchParams.get("order") ?? "desc") as "asc" | "desc"

    // Reps can only see their assigned restaurants
    const ownershipFilter = user.role === "ADMIN" ? repId ?? undefined : user.id

    const where: Prisma.RestaurantWhereInput = {
      isArchived: false,
      ...(ownershipFilter && { repId: ownershipFilter }),
      ...(stage && { pipelineStage: stage }),
      ...(zip && { zip }),
      ...(city && { city }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }),
    }

    const [restaurants, total] = await Promise.all([
      db.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          rep: { select: { id: true, name: true, email: true, avatarUrl: true } },
          territory: { select: { id: true, name: true } },
          _count: { select: { visits: true, tasks: true, warmIntros: true } },
        },
      }),
      db.restaurant.count({ where }),
    ])

    return ApiResponse.ok({
      data: restaurants,
      total,
      page,
      limit,
      hasMore: skip + restaurants.length < total,
    })
  })
}

export async function POST(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()

    if (!can.createRestaurant(user.role)) {
      return ApiResponse.forbidden()
    }

    const body = await req.json()
    const parsed = createRestaurantSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { skipDuplicateCheck, ...data } = parsed.data

    // Duplicate guard — same name + same address + city + zip = true duplicate.
    // Allows same-name restaurants at different addresses (chains, multi-location).
    // Skipped when the rep has already seen the warning and confirmed intent.
    if (!skipDuplicateCheck) {
      const existingId = await checkNameCityDuplicate(
        data.name,
        data.city,
        data.zip,
        data.address,
      )
      if (existingId) {
        return ApiResponse.conflict({
          error: "A restaurant at this address already exists in the CRM.",
          existingId,
        })
      }
    }

    // Ownership rules:
    // - REP: always owns the restaurant they create (repId = themselves, ignore any passed repId)
    // - ADMIN: can assign to any rep via repId, or leave unassigned
    const repId = user.role === "SALES_REP" ? user.id : (data.repId ?? undefined)

    // Auto-assign territory by ZIP then city (unless caller explicitly set one)
    let territoryId = data.territoryId ?? null
    if (!territoryId) {
      const territories = await db.territory.findMany({
        select: { id: true, cities: true, zipCodes: true },
      })
      territoryId = matchTerritory(data.city, data.zip, territories)
    }

    const restaurant = await db.restaurant.create({
      data: {
        ...data,
        repId,
        territoryId,
        createdByUserId: user.id,
      },
    })

    // Log to stage history and activity
    await Promise.all([
      db.stageHistory.create({
        data: {
          restaurantId: restaurant.id,
          changedById: user.id,
          fromStage: null,
          toStage: "NOT_CONTACTED",
        },
      }),
      logActivity({
        userId: user.id,
        restaurantId: restaurant.id,
        action: "RESTAURANT_CREATED",
        description: `${user.name} added ${restaurant.name}`,
      }),
    ])

    return ApiResponse.created(restaurant)
  })
}
