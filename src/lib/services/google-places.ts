/**
 * Google Places API (New) — v1 client.
 *
 * Uses the Text Search endpoint, which accepts a natural language query
 * ("restaurants in Phoenix AZ") and handles geocoding internally.
 * No separate Geocoding API call is needed for city/ZIP searches.
 *
 * Billing note: Text Search charges per field mask. We request only the
 * fields we actually store, which keeps this in the Basic tier for most
 * fields. `rating` and `websiteUri` are Basic Data fields.
 *
 * Enable in Google Cloud Console:
 *   - Places API (New)   ← required
 *   - NOT the legacy Places API
 */

const PLACES_BASE_URL = "https://places.googleapis.com/v1/places:searchText"

// Only request fields we actually use — reduces billing cost
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",")

// ─────────────────────────────────────────────────────────────
// Google API response types
// ─────────────────────────────────────────────────────────────

interface GoogleAddressComponent {
  longText: string
  shortText: string
  types: string[]
  languageCode: string
}

export interface GooglePlaceResult {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress: string
  addressComponents?: GoogleAddressComponent[]
  location: { latitude: number; longitude: number }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  primaryType?: string
  types?: string[]
  rating?: number
  googleMapsUri?: string
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY"
}

interface TextSearchResponse {
  places?: GooglePlaceResult[]
  nextPageToken?: string
}

// ─────────────────────────────────────────────────────────────
// Normalized shape used throughout our app
// ─────────────────────────────────────────────────────────────

export interface ImportSearchResult {
  placeId: string
  name: string
  formattedAddress: string   // original Google string, shown in UI
  address: string            // street address only
  city: string
  state: string
  zip: string
  phone: string | null
  website: string | null
  lat: number
  lng: number
  primaryType: string | null // maps to our RestaurantType enum
  cuisineType: string | null // extracted from Google types array
  rating: number | null
  googleMapsUrl: string | null
  // Set after checking our DB during preview
  isDuplicate?: boolean
  existingId?: string | null
  duplicateReason?: "place_id" | "phone" | "name_address" | null
}

export interface PlacesSearchParams {
  query: string          // city, ZIP, or free-text area description
  keyword?: string       // e.g., "sushi", "fine dining", "farm to table"
  radiusMiles?: number   // location bias radius (soft constraint, not hard filter)
  maxResults?: number    // 1–20 (Google hard limit per call is 20)
  pageToken?: string     // pagination token from previous response
}

export interface PlacesSearchResponse {
  results: ImportSearchResult[]
  nextPageToken?: string
}

// ─────────────────────────────────────────────────────────────
// Address component parsing
// ─────────────────────────────────────────────────────────────

function parseAddressComponents(components: GoogleAddressComponent[]): {
  address: string
  city: string
  state: string
  zip: string
} {
  let streetNumber = ""
  let route = ""
  let city = ""
  let state = ""
  let zip = ""

  for (const c of components) {
    if (c.types.includes("street_number")) streetNumber = c.longText
    else if (c.types.includes("route")) route = c.longText
    else if (c.types.includes("locality")) city = c.longText
    else if (c.types.includes("administrative_area_level_1")) state = c.shortText
    else if (c.types.includes("postal_code")) zip = c.longText
  }

  const address = [streetNumber, route].filter(Boolean).join(" ") || "Unknown Address"
  return { address, city, state, zip }
}

// Fallback: parse from the formatted address string when addressComponents is absent
function parseFormattedAddressFallback(formatted: string): {
  address: string
  city: string
  state: string
  zip: string
} {
  // Expected shape: "123 Main St, Phoenix, AZ 85001, USA"
  const parts = formatted
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "USA" && s !== "United States")

  const address = parts[0] ?? ""
  const city = parts[1] ?? ""
  const stateZip = parts[2] ?? ""
  const match = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/)

  return {
    address,
    city,
    state: match?.[1] ?? stateZip,
    zip: match?.[2] ?? "",
  }
}

// ─────────────────────────────────────────────────────────────
// Type mapping
// ─────────────────────────────────────────────────────────────

// Maps Google's primaryType to our RestaurantType enum values
const PRIMARY_TYPE_MAP: Record<string, string> = {
  restaurant: "OTHER",
  fine_dining_restaurant: "FINE_DINING",
  casual_dining_restaurant: "CASUAL",
  fast_food_restaurant: "FAST_CASUAL",
  fast_casual_restaurant: "FAST_CASUAL",
  bar: "BAR",
  pub: "BAR",
  coffee_shop: "CAFE",
  cafe: "CAFE",
  bakery: "CAFE",
  food_truck: "FOOD_TRUCK",
}

// Google type values that indicate cuisine type (stripped of `_restaurant` suffix)
const CUISINE_TYPE_KEYWORDS = new Set([
  "japanese_restaurant",
  "chinese_restaurant",
  "italian_restaurant",
  "mexican_restaurant",
  "thai_restaurant",
  "indian_restaurant",
  "mediterranean_restaurant",
  "american_restaurant",
  "french_restaurant",
  "korean_restaurant",
  "vietnamese_restaurant",
  "greek_restaurant",
  "sushi_restaurant",
  "pizza_restaurant",
  "seafood_restaurant",
  "steak_house",
  "burger_restaurant",
  "sandwich_shop",
  "ramen_restaurant",
  "noodle_restaurant",
  "middle_eastern_restaurant",
  "latin_american_restaurant",
  "spanish_restaurant",
  "bbq_restaurant",
  "brunch_restaurant",
])

function extractCuisineType(types: string[]): string | null {
  for (const type of types) {
    if (CUISINE_TYPE_KEYWORDS.has(type)) {
      return type
        .replace(/_restaurant$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) // Title Case
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Normalization
// ─────────────────────────────────────────────────────────────

export function normalizePlaceResult(place: GooglePlaceResult): ImportSearchResult {
  const parsed = place.addressComponents?.length
    ? parseAddressComponents(place.addressComponents)
    : parseFormattedAddressFallback(place.formattedAddress)

  // Prefer national (US-format) phone over international
  const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null

  const primaryType = place.primaryType
    ? (PRIMARY_TYPE_MAP[place.primaryType] ?? "OTHER")
    : null

  const cuisineType = place.types ? extractCuisineType(place.types) : null

  return {
    placeId: place.id,
    name: place.displayName.text,
    formattedAddress: place.formattedAddress,
    ...parsed,
    phone,
    website: place.websiteUri ?? null,
    lat: place.location.latitude,
    lng: place.location.longitude,
    primaryType,
    cuisineType,
    rating: place.rating ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
  }
}

// ─────────────────────────────────────────────────────────────
// Main search function
// ─────────────────────────────────────────────────────────────

export async function searchRestaurantsByArea(
  params: PlacesSearchParams,
): Promise<PlacesSearchResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set. Add it to .env.local.")
  }

  const { query, keyword, maxResults = 20, pageToken } = params

  // Build a natural language query. Google Text Search handles geocoding.
  // "restaurants in Phoenix AZ" or "sushi restaurants near 85254"
  const textQuery = keyword
    ? `${keyword} restaurants in ${query}`
    : `restaurants in ${query}`

  const requestBody: Record<string, unknown> = {
    textQuery,
    includedType: "restaurant",
    maxResultCount: Math.min(maxResults, 20), // Google's hard limit
  }

  if (pageToken) {
    requestBody.pageToken = pageToken
  }

  const response = await fetch(PLACES_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(requestBody),
    // Don't cache — search results should always be fresh
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Google Places API error ${response.status}: ${errorText}`,
    )
  }

  const data: TextSearchResponse = await response.json()
  const places = data.places ?? []

  // Filter out permanently closed businesses
  const openPlaces = places.filter(
    (p) => p.businessStatus !== "CLOSED_PERMANENTLY",
  )

  return {
    results: openPlaces.map(normalizePlaceResult),
    nextPageToken: data.nextPageToken,
  }
}
