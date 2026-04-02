/**
 * Duplicate detection for restaurant import.
 *
 * Priority (most → least reliable):
 *   1. sourcePlaceId exact match  — 100% certain
 *   2. Phone number exact match   — very reliable if phone exists
 *   3. Normalized name + city     — fuzzy, catches typos / case differences
 *
 * checkForDuplicates() is called at PREVIEW time (during search) to flag
 * results before the user selects them. It batches DB lookups for efficiency.
 *
 * checkNameCityDuplicate() is called at IMPORT time as a final guard before
 * each record is inserted. The name+city check is intentionally not done
 * at preview time because it requires one DB query per result — too slow
 * for a batch preview of 20 results.
 */

import { db } from "@/lib/db"
import type { ImportSearchResult } from "@/lib/services/google-places"

export type DuplicateReason = "place_id" | "phone" | "name_address"

export interface DuplicateCheckResult {
  result: ImportSearchResult
  isDuplicate: boolean
  existingId: string | null
  duplicateReason: DuplicateReason | null
}

// ─────────────────────────────────────────────────────────────
// Name normalization for fuzzy matching
// ─────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(the|a|an|&|and)\b/g, "")  // remove common filler words
    .replace(/[^a-z0-9]/g, "")             // strip punctuation/spaces
    .trim()
}

// ─────────────────────────────────────────────────────────────
// Batch duplicate check — used during search preview
// Checks placeId and phone in two batch queries (fast).
// ─────────────────────────────────────────────────────────────

export async function checkForDuplicates(
  results: ImportSearchResult[],
): Promise<DuplicateCheckResult[]> {
  if (results.length === 0) return []

  const placeIds = results.map((r) => r.placeId)
  const phones = results.map((r) => r.phone).filter((p): p is string => !!p)

  // Two queries, run in parallel
  const [existingByPlaceId, existingByPhone] = await Promise.all([
    db.restaurant.findMany({
      where: { sourcePlaceId: { in: placeIds } },
      select: { id: true, sourcePlaceId: true },
    }),
    phones.length > 0
      ? db.restaurant.findMany({
          where: { phone: { in: phones } },
          select: { id: true, phone: true },
        })
      : Promise.resolve([]),
  ])

  const placeIdToDbId = new Map(
    existingByPlaceId.map((r) => [r.sourcePlaceId!, r.id]),
  )
  const phoneToDbId = new Map(
    existingByPhone.map((r) => [r.phone!, r.id]),
  )

  return results.map((result): DuplicateCheckResult => {
    // Priority 1: Place ID
    if (placeIdToDbId.has(result.placeId)) {
      return {
        result,
        isDuplicate: true,
        existingId: placeIdToDbId.get(result.placeId)!,
        duplicateReason: "place_id",
      }
    }

    // Priority 2: Phone
    if (result.phone && phoneToDbId.has(result.phone)) {
      return {
        result,
        isDuplicate: true,
        existingId: phoneToDbId.get(result.phone)!,
        duplicateReason: "phone",
      }
    }

    return { result, isDuplicate: false, existingId: null, duplicateReason: null }
  })
}

// ─────────────────────────────────────────────────────────────
// Name + city check — used as final guard during import
// One DB query per restaurant, so called sequentially during import loop.
// ─────────────────────────────────────────────────────────────

export async function checkNameCityDuplicate(
  name: string,
  city: string,
  zip: string,
): Promise<string | null> {
  const normalizedInput = normalizeName(name)

  // Fetch all restaurants in the same city/zip (usually a small set)
  const candidates = await db.restaurant.findMany({
    where: { city: { equals: city, mode: "insensitive" }, zip },
    select: { id: true, name: true },
  })

  for (const candidate of candidates) {
    if (normalizeName(candidate.name) === normalizedInput) {
      return candidate.id
    }
  }

  return null
}
