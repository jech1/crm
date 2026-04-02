/**
 * PATCH /api/restaurants/[id]/contacts/[contactId] — update a contact
 * DELETE /api/restaurants/[id]/contacts/[contactId] — remove a contact
 * Requires edit access (primary rep or admin).
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { updateContactSchema } from "@/lib/validations/restaurant"

type RouteContext = { params: Promise<{ id: string; contactId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id, contactId } = await params
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
    const parsed = updateContactSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    // If setting as primary, clear other primaries first
    if (parsed.data.isPrimary) {
      await db.contact.updateMany({
        where: { restaurantId: id, id: { not: contactId } },
        data: { isPrimary: false },
      })
    }

    const contact = await db.contact.update({
      where: { id: contactId },
      data: parsed.data,
    })

    return ApiResponse.ok(contact)
  })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id, contactId } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { repId: true },
    })
    if (!restaurant) return ApiResponse.notFound()
    if (!can.editRestaurant(user.role, restaurant.repId, user.id)) {
      return ApiResponse.forbidden()
    }

    await db.contact.delete({ where: { id: contactId } })
    return ApiResponse.noContent()
  })
}
