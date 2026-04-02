/**
 * Auth helpers.
 *
 * Wraps Clerk's server-side auth and adds our database user lookup.
 * Every protected API route calls `getAuthContext()` to get the
 * typed user with role attached.
 */

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import type { Role, User } from "@prisma/client"
import { ApiError } from "@/lib/api/errors"

// ─────────────────────────────────────────────────────────────
// Restaurant access levels
// ─────────────────────────────────────────────────────────────

export type RestaurantAccess =
  | "none"       // no access
  | "supporting" // can view + contribute (visits, notes, tasks, meetings)
  | "primary"    // can edit + change stage
  | "admin"      // full access + team management

/**
 * Returns the access level a user has for a given restaurant.
 * Makes a single DB query to check supporting rep membership.
 */
export async function getRestaurantAccess(
  restaurantId: string,
  userId: string,
  userRole: Role,
  restaurantRepId: string | null,
): Promise<RestaurantAccess> {
  if (userRole === "ADMIN") return "admin"
  if (restaurantRepId === userId) return "primary"

  const isSupportingRep = await db.restaurantRep.findUnique({
    where: { restaurantId_userId: { restaurantId, userId } },
    select: { id: true },
  })
  if (isSupportingRep) return "supporting"

  return "none"
}

export type AuthContext = {
  user: Pick<User, "id" | "clerkId" | "role" | "name" | "email">
}

export async function getAuthContext(): Promise<AuthContext> {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    throw new ApiError(401, "Not authenticated")
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, role: true, name: true, email: true, status: true },
  })

  if (!user) {
    throw new ApiError(401, "User not found. Please complete sign-up.")
  }

  if (user.status === "PENDING") {
    throw new ApiError(403, "Your account is pending approval.")
  }

  if (user.status === "DISABLED") {
    throw new ApiError(403, "Your account has been disabled. Contact your admin.")
  }

  return { user }
}

// ─────────────────────────────────────────────────────────────
// Permission helpers
// Each function answers a specific "can this user do X?" question.
// Keep these pure (no DB calls) — pass the data they need.
// ─────────────────────────────────────────────────────────────

export const can = {
  createRestaurant: (role: Role) => role === "ADMIN" || role === "SALES_REP",

  editRestaurant: (role: Role, restaurantRepId: string | null, userId: string) =>
    role === "ADMIN" || (role === "SALES_REP" && restaurantRepId === userId),

  deleteRestaurant: (role: Role, restaurantRepId?: string | null, userId?: string) =>
    role === "ADMIN" || (role === "SALES_REP" && restaurantRepId != null && restaurantRepId === userId),

  assignRestaurant: (role: Role) => role === "ADMIN",

  logVisit: (role: Role) => role === "ADMIN" || role === "SALES_REP",

  addWarmIntro: (_role: Role) => true,

  addNote: (_role: Role) => true,

  scheduleMeeting: (role: Role) => role === "ADMIN" || role === "SALES_REP",

  updateStage: (role: Role, restaurantRepId: string | null, userId: string) =>
    role === "ADMIN" || (role === "SALES_REP" && restaurantRepId === userId),

  viewAllAnalytics: (role: Role) => role === "ADMIN",

  manageUsers: (role: Role) => role === "ADMIN",

  bulkImport: (role: Role) => role === "ADMIN",

  manageTerritories: (role: Role) => role === "ADMIN",
}
