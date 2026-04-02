/**
 * /api/restaurants/[id]/notes
 *
 * GET  — List notes for a restaurant
 * POST — Add a note (all roles)
 */

import { type NextRequest } from "next/server"
import { getAuthContext, getRestaurantAccess } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"
import { logActivity } from "@/lib/services/activity.service"

const createNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(2000),
  isPrivate: z.boolean().default(false),
})

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

    const notes = await db.note.findMany({
      where: {
        restaurantId: id,
        // Connectors can only see non-private notes and their own private notes
        ...(user.role === "CONNECTOR" ? { OR: [{ isPrivate: false }, { authorId: user.id }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    return ApiResponse.ok(notes)
  })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id: restaurantId } = await params
    const { user } = await getAuthContext()

    const body = await req.json()
    const parsed = createNoteSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { repId: true, name: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    const access = await getRestaurantAccess(restaurantId, user.id, user.role, restaurant.repId)
    if (access === "none") return ApiResponse.forbidden()

    const note = await db.note.create({
      data: {
        restaurantId,
        authorId: user.id,
        body: parsed.data.body,
        isPrivate: parsed.data.isPrivate,
      },
      include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    await logActivity({
      userId: user.id,
      restaurantId,
      action: "NOTE_ADDED",
      description: `${user.name} added a note on ${restaurant.name}`,
    })

    return ApiResponse.created(note)
  })
}
