/**
 * PATCH /api/restaurants/bulk
 *
 * Bulk update restaurant records. Admin-only.
 *
 * Body:
 *   { ids: string[], action: "assign" | "stage" | "archive", repId?: string, stage?: PipelineStage }
 *
 * Returns: { updated: number }
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import type { PipelineStage } from "@prisma/client"

const VALID_STAGES = new Set<string>([
  "NOT_CONTACTED",
  "NEEDS_VISIT",
  "VISITED",
  "SPOKE_TO_BUYER",
  "SAMPLES_REQUESTED",
  "PRICING_SENT",
  "FOLLOW_UP_NEEDED",
  "INTERESTED",
  "CUSTOMER",
  "LOST_LEAD",
])

export async function PATCH(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    if (user.role !== "ADMIN") return ApiResponse.forbidden("Admin access required")

    const body = await req.json()
    const { ids, action, repId, stage } = body as {
      ids: unknown
      action: unknown
      repId?: string
      stage?: string
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.error("ids must be a non-empty array", 400)
    }
    if (ids.some((id) => typeof id !== "string")) {
      return ApiResponse.error("All ids must be strings", 400)
    }

    const safeIds = ids as string[]

    switch (action) {
      case "assign": {
        if (!repId) return ApiResponse.error("repId required for assign action", 400)
        // Validate the target rep exists and is active
        const rep = await db.user.findFirst({
          where: { id: repId, status: "ACTIVE" },
          select: { id: true },
        })
        if (!rep) return ApiResponse.error("Rep not found or inactive", 400)
        await db.restaurant.updateMany({
          where: { id: { in: safeIds } },
          data: { repId },
        })
        break
      }

      case "stage": {
        if (!stage || !VALID_STAGES.has(stage)) {
          return ApiResponse.error("Invalid stage value", 400)
        }
        await db.restaurant.updateMany({
          where: { id: { in: safeIds } },
          data: { pipelineStage: stage as PipelineStage },
        })
        break
      }

      case "archive": {
        await db.restaurant.updateMany({
          where: { id: { in: safeIds } },
          data: { isArchived: true },
        })
        break
      }

      default:
        return ApiResponse.error("action must be assign | stage | archive", 400)
    }

    return ApiResponse.ok({ updated: safeIds.length })
  })
}
