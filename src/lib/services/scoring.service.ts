/**
 * Opportunity score computation.
 *
 * Scores are stored on the Restaurant record and recalculated whenever
 * a relevant mutation happens (visit logged, warm intro added, stage changed).
 *
 * Max score: 100
 */

import { db } from "@/lib/db"
import { differenceInDays } from "date-fns"

export async function recalculateScore(restaurantId: string): Promise<number> {
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      warmIntros: { where: { isActive: true } },
      visits: { orderBy: { visitDate: "desc" }, take: 5 },
      contacts: true,
      samples: true,
      competitorNote: true,
    },
  })

  if (!restaurant) return 0

  let score = 0

  // Warm intro exists
  if (restaurant.warmIntros.length > 0) score += 25

  // Has been visited at least once
  if (restaurant.visits.length > 0) score += 15

  // Multiple visits show persistence
  if (restaurant.visits.length >= 3) score += 10

  // A contact (buyer) has been identified
  if (restaurant.contacts.length > 0) score += 10

  // Samples have been dropped off
  if (restaurant.samples.length > 0) score += 15

  // Known competitor complaints — an opening exists
  if (restaurant.competitorNote?.complaints) score += 10

  // Recent engagement (visited in last 14 days)
  if (restaurant.visits[0]) {
    const daysSince = differenceInDays(new Date(), restaurant.visits[0].visitDate)
    if (daysSince <= 14) score += 10
  }

  // High-volume restaurant type
  if (restaurant.estimatedVolume === "HIGH") score += 5

  const finalScore = Math.min(score, 100)

  await db.restaurant.update({
    where: { id: restaurantId },
    data: { opportunityScore: finalScore },
  })

  return finalScore
}
