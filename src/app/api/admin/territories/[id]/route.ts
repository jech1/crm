/**
 * /api/admin/territories/[id]
 *
 * PATCH  — update territory fields
 * DELETE — delete territory (nulls out restaurant assignments first)
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const updateTerritorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  repId: z.string().nullable().optional(),
  cities: z.array(z.string().min(1)).optional(),
  zipCodes: z.array(z.string().min(1)).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()
    if (user.role !== "ADMIN") return ApiResponse.forbidden()

    const existing = await db.territory.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return ApiResponse.notFound()

    const body = await req.json()
    const parsed = updateTerritorySchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { repId, ...rest } = parsed.data

    const territory = await db.territory.update({
      where: { id },
      data: {
        ...rest,
        // repId: null clears the rep; repId: string sets it; undefined leaves unchanged
        ...(repId !== undefined ? { repId: repId ?? null } : {}),
      },
      include: {
        rep: { select: { id: true, name: true, email: true } },
        _count: { select: { restaurants: true } },
      },
    })

    return ApiResponse.ok(territory)
  })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user } = await getAuthContext()
    if (user.role !== "ADMIN") return ApiResponse.forbidden()

    const existing = await db.territory.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return ApiResponse.notFound()

    // Null out restaurant assignments before deleting
    await db.restaurant.updateMany({
      where: { territoryId: id },
      data: { territoryId: null },
    })

    await db.territory.delete({ where: { id } })

    return ApiResponse.noContent()
  })
}
