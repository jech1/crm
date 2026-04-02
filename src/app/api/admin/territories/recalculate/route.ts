/**
 * POST /api/admin/territories/recalculate
 *
 * Bulk recalculates territory assignments for all non-archived restaurants.
 * Loads all territories once, then matches each restaurant by ZIP → city.
 * Returns counts of updated and cleared assignments.
 */

import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { matchTerritory } from "@/lib/territories/autoAssign"

export async function POST() {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    if (user.role !== "ADMIN") return ApiResponse.forbidden()

    // Load territories once
    const territories = await db.territory.findMany({
      select: { id: true, cities: true, zipCodes: true },
    })

    if (territories.length === 0) {
      return ApiResponse.ok({ updated: 0, cleared: 0, message: "No territories defined yet." })
    }

    // Load all active restaurants
    const restaurants = await db.restaurant.findMany({
      where: { isArchived: false },
      select: { id: true, city: true, zip: true, territoryId: true },
    })

    let updated = 0
    let cleared = 0

    // Run updates in a transaction
    await db.$transaction(
      restaurants.map((r) => {
        const matchedId = matchTerritory(r.city, r.zip, territories)
        if (matchedId === r.territoryId) return db.$queryRaw`SELECT 1` // no-op

        if (matchedId) updated++
        else if (r.territoryId) cleared++ // had a territory, now has none

        return db.restaurant.update({
          where: { id: r.id },
          data: { territoryId: matchedId },
        })
      }),
    )

    return ApiResponse.ok({
      updated,
      cleared,
      total: restaurants.length,
      message: `${updated} restaurants assigned, ${cleared} cleared.`,
    })
  })
}
