/**
 * Territory auto-assignment logic.
 *
 * Matching priority:
 *   1. ZIP code match (first 5 digits, most specific)
 *   2. City name match (case-insensitive)
 *   3. null — leave unassigned
 *
 * `matchTerritory` is a pure function — pass in the territories list
 * so callers can load it once and reuse (e.g. bulk recalculate).
 */

export type TerritoryStub = {
  id: string
  cities: string[]
  zipCodes: string[]
}

/**
 * Returns the ID of the first matching territory, or null.
 */
export function matchTerritory(
  city: string | null | undefined,
  zip: string | null | undefined,
  territories: TerritoryStub[],
): string | null {
  const normalZip = zip?.trim().slice(0, 5) ?? ""
  const normalCity = city?.trim().toLowerCase() ?? ""

  // 1. ZIP match — most specific
  if (normalZip) {
    const match = territories.find((t) =>
      t.zipCodes.some((z) => z.trim().slice(0, 5) === normalZip),
    )
    if (match) return match.id
  }

  // 2. City match
  if (normalCity) {
    const match = territories.find((t) =>
      t.cities.some((c) => c.trim().toLowerCase() === normalCity),
    )
    if (match) return match.id
  }

  return null
}

/**
 * Splits a user-entered string (comma or newline separated) into a clean string array.
 * Used for parsing the cities / ZIP codes fields in the territory form.
 */
export function parseListInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
