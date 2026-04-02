/**
 * /api/restaurants/[id]
 *
 * GET    — Full restaurant profile with all relations
 * PATCH  — Update core fields
 * DELETE — Soft-delete (archive)
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { updateRestaurantSchema } from "@/lib/validations/restaurant"
import { matchTerritory } from "@/lib/territories/autoAssign"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      include: {
        rep: { select: { id: true, name: true, email: true, avatarUrl: true } },
        territory: { select: { id: true, name: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        visits: {
          orderBy: { visitDate: "desc" },
          include: { rep: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        meetings: {
          orderBy: { scheduledAt: "asc" },
          include: { owner: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        tasks: {
          where: { isCompleted: false },
          orderBy: { dueDate: "asc" },
          include: { assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        warmIntros: {
          where: { isActive: true },
          orderBy: { priority: "desc" },
          include: { addedBy: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        samples: { orderBy: { sampleDate: "desc" } },
        productInterests: true,
        competitorNote: true,
        stageHistory: {
          orderBy: { changedAt: "desc" },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { visits: true, tasks: true, warmIntros: true, meetings: true } },
      },
    })

    if (!restaurant || restaurant.isArchived) {
      return ApiResponse.notFound("Restaurant not found")
    }

    const access = await getRestaurantAccess(id, user.id, user.role, restaurant.repId)
    if (access === "none") return ApiResponse.forbidden()

    return ApiResponse.ok(restaurant)
  })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { repId: true, city: true, zip: true, territoryId: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    if (!can.editRestaurant(user.role, restaurant.repId, user.id)) {
      return ApiResponse.forbidden()
    }

    const body = await req.json()
    const parsed = updateRestaurantSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const patchData = { ...parsed.data }

    // Re-run territory auto-assign if city or zip changed and no explicit territoryId was provided
    const cityChanged = patchData.city && patchData.city !== restaurant.city
    const zipChanged = patchData.zip && patchData.zip !== restaurant.zip
    if ((cityChanged || zipChanged) && patchData.territoryId === undefined) {
      const territories = await db.territory.findMany({
        select: { id: true, cities: true, zipCodes: true },
      })
      const newCity = patchData.city ?? restaurant.city
      const newZip = patchData.zip ?? restaurant.zip
      patchData.territoryId = matchTerritory(newCity, newZip, territories) ?? undefined
    }

    const updated = await db.restaurant.update({
      where: { id },
      data: patchData,
    })

    // Log ownership change when primary rep is reassigned
    if (patchData.repId !== undefined && patchData.repId !== restaurant.repId) {
      const newRep = patchData.repId
        ? await db.user.findUnique({ where: { id: patchData.repId }, select: { name: true } })
        : null
      await db.activityLog.create({
        data: {
          restaurantId: id,
          userId: user.id,
          action: "OWNERSHIP_ASSIGNED",
          description: newRep
            ? `${user.name} reassigned primary rep to ${newRep.name}`
            : `${user.name} removed the primary rep assignment`,
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

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { repId: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    if (!can.deleteRestaurant(user.role, restaurant.repId, user.id)) {
      return ApiResponse.forbidden()
    }

    await db.restaurant.update({
      where: { id },
      data: { isArchived: true },
    })

    return ApiResponse.noContent()
  })
}
