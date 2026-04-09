/**
 * POST /api/restaurants/import
 *
 * Takes a selection of Google Places results and saves them as Restaurant
 * records in our database. Runs full duplicate detection before each insert.
 *
 * Body params:
 *   restaurants  — array of ImportSearchResult objects (selected by the user)
 *   repId        — optional rep to assign on import (admin only)
 *   initialStage — initial pipeline stage (default: NOT_CONTACTED)
 *
 * Returns:
 *   importedCount — number of new records created
 *   skippedCount  — number skipped due to duplicates
 *   importedIds   — DB ids of newly created restaurants
 *   skipped       — details on each skipped record + reason
 */

import { type NextRequest } from "next/server"
import { getAuthContext, can } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { rateLimit } from "@/lib/rateLimit"
import { db } from "@/lib/db"
import { logActivity } from "@/lib/services/activity.service"
import { checkNameCityDuplicate } from "@/lib/restaurants/deduplicate"
import { matchTerritory, type TerritoryStub } from "@/lib/territories/autoAssign"
import { z } from "zod"
import type { PipelineStage, RestaurantType, Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

const importItemSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1).max(200),
  formattedAddress: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string().max(3),
  zip: z.string().max(12),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  primaryType: z.string().nullable(),
  cuisineType: z.string().nullable(),
  rating: z.number().nullable(),
  googleMapsUrl: z.string().nullable(),
})

const PIPELINE_STAGES = [
  "NOT_CONTACTED", "NEEDS_VISIT", "VISITED", "SPOKE_TO_BUYER",
  "SAMPLES_REQUESTED", "PRICING_SENT", "FOLLOW_UP_NEEDED",
  "INTERESTED", "CUSTOMER", "LOST_LEAD",
] as const

const importSchema = z.object({
  restaurants: z
    .array(importItemSchema)
    .min(1, "Select at least one restaurant to import")
    .max(50, "Max 50 restaurants per import batch"),
  repId: z.string().cuid().optional(),
  initialStage: z.enum(PIPELINE_STAGES).default("NOT_CONTACTED"),
})

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

// 5 import batches per hour — each batch can create up to 50 records
const IMPORT_LIMIT = 5
const IMPORT_WINDOW_MS = 60 * 60_000

export async function POST(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()

    if (!can.createRestaurant(user.role)) {
      return ApiResponse.forbidden("Only admins and reps can import restaurants.")
    }

    const rl = rateLimit(`${user.id}:import`, IMPORT_LIMIT, IMPORT_WINDOW_MS)
    if (rl.limited) return ApiResponse.tooManyRequests(rl.retryAfterSecs)

    const body = await req.json()
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) return ApiResponse.validationError(parsed.error)

    const { restaurants: toImport, repId, initialStage } = parsed.data

    // Reps are always assigned their own imports; admins can specify a rep
    const assignedRepId =
      user.role === "SALES_REP" ? user.id : (repId ?? undefined)

    // Load territories once for auto-assignment
    const territories: TerritoryStub[] = await db.territory.findMany({
      select: { id: true, cities: true, zipCodes: true },
    })

    const imported: string[] = []
    const skipped: {
      placeId: string
      name: string
      reason: string
      existingId?: string
    }[] = []

    // Process sequentially to avoid race conditions on dedup checks
    for (const item of toImport) {
      // ── Guard 1: sourcePlaceId (most reliable) ──────────────
      const existingByPlaceId = await db.restaurant.findFirst({
        where: { sourcePlaceId: item.placeId },
        select: { id: true },
      })
      if (existingByPlaceId) {
        skipped.push({
          placeId: item.placeId,
          name: item.name,
          reason: "place_id",
          existingId: existingByPlaceId.id,
        })
        continue
      }

      // ── Guard 2: phone match (scoped to same city+zip) ────────
      // Chain locations can share a corporate phone — only treat as a
      // duplicate if the phone AND location (city+zip) both match.
      if (item.phone && item.city && item.zip) {
        const existingByPhone = await db.restaurant.findFirst({
          where: {
            phone: item.phone,
            city: { equals: item.city, mode: "insensitive" },
            zip: item.zip,
          },
          select: { id: true },
        })
        if (existingByPhone) {
          skipped.push({
            placeId: item.placeId,
            name: item.name,
            reason: "phone",
            existingId: existingByPhone.id,
          })
          continue
        }
      }

      // ── Guard 3: normalized name + address + city + zip ──────
      if (item.city && item.zip) {
        const existingByName = await checkNameCityDuplicate(
          item.name,
          item.city,
          item.zip,
          item.address,
        )
        if (existingByName) {
          skipped.push({
            placeId: item.placeId,
            name: item.name,
            reason: "name_address",
            existingId: existingByName,
          })
          continue
        }
      }

      // ── Create the restaurant record ────────────────────────
      const autoTerritoryId = matchTerritory(item.city, item.zip, territories)

      const restaurantData: Prisma.RestaurantCreateInput = {
        name: item.name,
        address: item.address,
        city: item.city,
        state: item.state,
        zip: item.zip,
        phone: item.phone ?? undefined,
        website: item.website ?? undefined,
        googleMapsUrl: item.googleMapsUrl ?? undefined,
        lat: item.lat ?? undefined,
        lng: item.lng ?? undefined,
        cuisineType: item.cuisineType ?? undefined,
        restaurantType: (item.primaryType as RestaurantType) ?? undefined,
        source: "GOOGLE_PLACES",
        sourcePlaceId: item.placeId,
        googleRating: item.rating ?? undefined,
        importedAt: new Date(),
        pipelineStage: initialStage as PipelineStage,
        ...(assignedRepId && { rep: { connect: { id: assignedRepId } } }),
        ...(autoTerritoryId && { territory: { connect: { id: autoTerritoryId } } }),
      }

      const restaurant = await db.restaurant.create({ data: restaurantData })

      // Log stage history entry and activity — in parallel
      await Promise.all([
        db.stageHistory.create({
          data: {
            restaurantId: restaurant.id,
            changedById: user.id,
            fromStage: null,
            toStage: initialStage as PipelineStage,
            notes: "Imported from Google Places",
          },
        }),
        logActivity({
          userId: user.id,
          restaurantId: restaurant.id,
          action: "RESTAURANT_IMPORTED",
          description: `${user.name} imported ${restaurant.name} from Google Places`,
          metadata: {
            source: "GOOGLE_PLACES",
            placeId: item.placeId,
            city: item.city,
            state: item.state,
          } as Prisma.InputJsonValue,
        }),
      ])

      imported.push(restaurant.id)
    }

    return ApiResponse.created({
      importedCount: imported.length,
      skippedCount: skipped.length,
      importedIds: imported,
      skipped,
    })
  })
}
