/**
 * /api/restaurants/[id]/team
 *
 * POST   — Add a supporting rep (admin or primary rep)
 * DELETE — Remove a supporting rep (admin or primary rep)
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const bodySchema = z.object({ userId: z.string().min(1) })

export async function POST(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id: restaurantId } = await params
    const { user } = await getAuthContext()

    // Fetch restaurant first — needed for both the permission check and the
    // primary-rep guard below.
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, repId: true },
    })
    if (!restaurant) throw Object.assign(new Error("Not found"), { statusCode: 404 })

    // Admin or the primary rep can add supporting reps
    const canManage = user.role === "ADMIN" || restaurant.repId === user.id
    if (!canManage) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 })
    }

    const body = bodySchema.parse(await req.json())

    // Can't add the primary rep as a supporting rep
    if (restaurant.repId === body.userId) {
      throw Object.assign(
        new Error("This user is already the primary rep"),
        { statusCode: 400 }
      )
    }

    const entry = await db.restaurantRep.upsert({
      where: { restaurantId_userId: { restaurantId, userId: body.userId } },
      create: {
        restaurantId,
        userId: body.userId,
        addedById: user.id,
      },
      update: {},
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    await db.activityLog.create({
      data: {
        restaurantId,
        userId: user.id,
        action: "OWNERSHIP_ASSIGNED",
        description: `Added ${entry.user.name} as a supporting rep`,
      },
    })

    return ApiResponse.ok(entry)
  })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id: restaurantId } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { repId: true },
    })
    if (!restaurant) throw Object.assign(new Error("Not found"), { statusCode: 404 })

    // Admin or the primary rep can remove supporting reps
    const canManage = user.role === "ADMIN" || restaurant.repId === user.id
    if (!canManage) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 })
    }

    const body = bodySchema.parse(await req.json())

    const entry = await db.restaurantRep.findUnique({
      where: { restaurantId_userId: { restaurantId, userId: body.userId } },
      include: { user: { select: { name: true } } },
    })
    if (!entry) throw Object.assign(new Error("Supporting rep not found"), { statusCode: 404 })

    await db.restaurantRep.delete({
      where: { restaurantId_userId: { restaurantId, userId: body.userId } },
    })

    await db.activityLog.create({
      data: {
        restaurantId,
        userId: user.id,
        action: "OWNERSHIP_ASSIGNED",
        description: `Removed ${entry.user.name} as a supporting rep`,
      },
    })

    return ApiResponse.noContent()
  })
}
