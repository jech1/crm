/**
 * POST /api/restaurants/search
 *
 * Searches for restaurants via Google Places Text Search and returns
 * a normalized preview list with duplicate flags.
 *
 * This endpoint does NOT write to the database — it is read-only.
 * Results are ephemeral; only the import endpoint persists records.
 *
 * Body params:
 *   query       — city name, ZIP code, or area description (required)
 *   keyword     — optional cuisine/style filter ("sushi", "fine dining")
 *   radiusMiles — location bias radius in miles (default 5, max 50)
 *   maxResults  — max results to return (default 20, max 20 per call)
 *   pageToken   — pagination token from previous response
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { searchRestaurantsByArea } from "@/lib/services/google-places"
import { checkForDuplicates } from "@/lib/restaurants/deduplicate"
import { z } from "zod"

const searchSchema = z.object({
  query: z.string().min(2, "Enter a city, ZIP code, or area name"),
  keyword: z.string().max(50).optional(),
  radiusMiles: z.number().min(0.5).max(50).default(5),
  maxResults: z.number().int().min(1).max(20).default(20),
  pageToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()

    if (!can.createRestaurant(user.role)) {
      return ApiResponse.forbidden("Only admins and reps can search for restaurants.")
    }

    const body = await req.json()
    const parsed = searchSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { query, keyword, radiusMiles, maxResults, pageToken } = parsed.data

    const { results, nextPageToken } = await searchRestaurantsByArea({
      query,
      keyword,
      radiusMiles,
      maxResults,
      pageToken,
    })

    // Mark which results already exist in our DB (batched, fast)
    const withDuplicateFlags = await checkForDuplicates(results)

    const annotatedResults = withDuplicateFlags.map(
      ({ result, isDuplicate, existingId, duplicateReason }) => ({
        ...result,
        isDuplicate,
        existingId,
        duplicateReason,
      }),
    )

    return ApiResponse.ok({
      results: annotatedResults,
      nextPageToken,
      total: annotatedResults.length,
      duplicateCount: annotatedResults.filter((r) => r.isDuplicate).length,
    })
  })
}
