/**
 * /api/restaurants/[id]/stage
 *
 * PATCH — Update pipeline stage.
 * Delegates to stage.service which handles history, activity, and scoring atomically.
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { updateStageSchema } from "@/lib/validations/restaurant"
import { updateStage } from "@/lib/services/stage.service"
import type { LossReason } from "@prisma/client"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { repId: true },
    })
    if (!restaurant) return ApiResponse.notFound()

    if (!can.updateStage(user.role, restaurant.repId, user.id)) {
      return ApiResponse.forbidden()
    }

    const body = await req.json()
    const parsed = updateStageSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    await updateStage({
      restaurantId: id,
      toStage: parsed.data.stage,
      changedById: user.id,
      notes: parsed.data.notes,
      firstProduct: parsed.data.firstProduct,
      leadSource: parsed.data.leadSource,
      warmIntroUsed: parsed.data.warmIntroUsed,
      winNotes: parsed.data.winNotes,
      lossReason: parsed.data.lossReason as LossReason | undefined,
      lossNotes: parsed.data.lossNotes,
    })

    const updated = await db.restaurant.findUnique({ where: { id } })
    return ApiResponse.ok(updated)
  })
}
