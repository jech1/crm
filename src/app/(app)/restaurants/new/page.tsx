/**
 * New restaurant page — server component.
 * Fetches the current user's role and, for admins, the list of reps
 * to populate the owner assignment dropdown.
 * Passes data to the NewRestaurantForm client component.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { NewRestaurantForm } from "@/components/restaurants/NewRestaurantForm"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Add Restaurant" }

export default async function NewRestaurantPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true, name: true },
  })
  if (!user) redirect("/api/auth/sync")

  // Only REPs and ADMINs can create restaurants
  if (user.role === "CONNECTOR") redirect("/restaurants")

  // Admins get the full rep list for the ownership dropdown
  const reps =
    user.role === "ADMIN"
      ? await db.user.findMany({
          where: { status: "ACTIVE", role: { in: ["ADMIN", "SALES_REP"] } },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        })
      : []

  return (
    <NewRestaurantForm
      isAdmin={user.role === "ADMIN"}
      currentUserId={user.id}
      currentUserName={user.name}
      reps={reps}
    />
  )
}
