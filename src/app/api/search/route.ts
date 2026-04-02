/**
 * GET /api/search?q=<query>
 *
 * Global cross-entity search. Returns grouped results across:
 *   - Restaurants (name, city, phone)
 *   - Contacts (name, email, phone)
 *   - Notes (content snippet)
 *
 * Access rules mirror the restaurant list:
 *   ADMIN     — sees all records
 *   SALES_REP — sees only records from restaurants they own or support
 *   CONNECTOR — same scope as SALES_REP
 *
 * Hard limits: 5 restaurants, 5 contacts, 4 notes per query.
 * Minimum query length: 2 characters.
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? ""

    if (q.length < 2) {
      return ApiResponse.ok({ restaurants: [], contacts: [], notes: [] })
    }

    // Access filter — restrict non-admins to their own restaurants
    const restaurantAccessFilter: Prisma.RestaurantWhereInput =
      user.role === "ADMIN"
        ? { isArchived: false }
        : {
            isArchived: false,
            OR: [
              { repId: user.id },
              { supportingReps: { some: { userId: user.id } } },
            ],
          }

    const [restaurants, contacts, notes] = await Promise.all([
      // ── Restaurants ─────────────────────────────────────────────
      db.restaurant.findMany({
        where: {
          ...restaurantAccessFilter,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          pipelineStage: true,
          rep: { select: { name: true } },
        },
        orderBy: { opportunityScore: "desc" },
        take: 5,
      }),

      // ── Contacts ─────────────────────────────────────────────────
      db.contact.findMany({
        where: {
          restaurant: restaurantAccessFilter,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          restaurantId: true,
          restaurant: { select: { name: true } },
        },
        take: 5,
      }),

      // ── Notes ────────────────────────────────────────────────────
      db.note.findMany({
        where: {
          restaurant: restaurantAccessFilter,
          body: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          restaurantId: true,
          restaurant: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ])

    return ApiResponse.ok({
      restaurants,
      contacts,
      notes: notes.map((n) => ({
        ...n,
        // Return a trimmed snippet so large notes don't bloat the payload
        body: n.body.length > 140 ? n.body.slice(0, 140) + "…" : n.body,
      })),
    })
  })
}
