/**
 * POST /api/restaurants/[id]/contacts
 * Create a new contact for a restaurant.
 * Requires edit access (primary rep or admin).
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { createContactSchema } from "@/lib/validations/restaurant"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { repId: true },
    })
    if (!restaurant) return ApiResponse.notFound()
    if (!can.editRestaurant(user.role, restaurant.repId, user.id)) {
      return ApiResponse.forbidden()
    }

    const body = await req.json()
    const parsed = createContactSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    // If setting as primary, clear other primaries first
    if (parsed.data.isPrimary) {
      await db.contact.updateMany({
        where: { restaurantId: id },
        data: { isPrimary: false },
      })
    }

    const contact = await db.contact.create({
      data: {
        restaurantId: id,
        ...parsed.data,
      },
    })

    return ApiResponse.ok(contact)
  })
}
