/**
 * /api/restaurants/[id]/credit
 *
 * PUT — Upsert credit attributions for a restaurant (admin only).
 *       Replaces all existing attributions with the new set.
 *       Percentages must sum to 100.
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const creditEntrySchema = z.object({
  userId: z.string().min(1),
  percentage: z.number().int().min(1).max(100),
  note: z.string().max(200).optional(),
})

const bodySchema = z.object({
  attributions: z.array(creditEntrySchema).min(1).max(10),
})

export async function PUT(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id: restaurantId } = await params
    const { user } = await getAuthContext()

    if (user.role !== "ADMIN") {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 })
    }

    const { attributions } = bodySchema.parse(await req.json())

    // Validate sum = 100
    const total = attributions.reduce((sum, a) => sum + a.percentage, 0)
    if (total !== 100) {
      throw Object.assign(
        new Error(`Percentages must sum to 100 (got ${total})`),
        { statusCode: 400 }
      )
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    })
    if (!restaurant) throw Object.assign(new Error("Not found"), { statusCode: 404 })

    // Replace all attributions in a transaction
    const results = await db.$transaction([
      db.creditAttribution.deleteMany({ where: { restaurantId } }),
      db.creditAttribution.createMany({
        data: attributions.map((a) => ({
          restaurantId,
          userId: a.userId,
          percentage: a.percentage,
          note: a.note ?? null,
        })),
      }),
    ])

    await db.activityLog.create({
      data: {
        restaurantId,
        userId: user.id,
        action: "OWNERSHIP_ASSIGNED",
        description: `Updated credit attribution (${attributions.map((a) => `${a.percentage}%`).join(", ")})`,
      },
    })

    return ApiResponse.ok({ deleted: results[0].count, created: results[1].count })
  })
}
