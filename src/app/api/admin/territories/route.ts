/**
 * /api/admin/territories
 *
 * GET  — list all territories (admin only)
 * POST — create a territory (admin only)
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"

const createTerritorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  repId: z.string().nullable().optional(),
  cities: z.array(z.string().min(1)).default([]),
  zipCodes: z.array(z.string().min(1)).default([]),
})

export async function GET() {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    if (user.role !== "ADMIN") return ApiResponse.forbidden()

    const territories = await db.territory.findMany({
      include: {
        rep: { select: { id: true, name: true, email: true } },
        _count: { select: { restaurants: true } },
      },
      orderBy: { name: "asc" },
    })

    return ApiResponse.ok(territories)
  })
}

export async function POST(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    if (user.role !== "ADMIN") return ApiResponse.forbidden()

    const body = await req.json()
    const parsed = createTerritorySchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { repId, ...rest } = parsed.data

    const territory = await db.territory.create({
      data: {
        ...rest,
        ...(repId ? { repId } : {}),
      },
      include: {
        rep: { select: { id: true, name: true, email: true } },
        _count: { select: { restaurants: true } },
      },
    })

    return ApiResponse.created(territory)
  })
}
