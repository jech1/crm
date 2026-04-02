/**
 * Restaurant edit page.
 * Server component fetches the restaurant and passes it to a client form.
 * Supports full field editing (PATCH) and soft-delete/archive (DELETE).
 */

import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { can } from "@/lib/auth"
import { EditRestaurantForm } from "@/components/restaurants/EditRestaurantForm"
import type { Metadata } from "next"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const r = await db.restaurant.findUnique({ where: { id }, select: { name: true } })
  return { title: r ? `Edit ${r.name}` : "Edit Restaurant" }
}

export default async function EditRestaurantPage({ params }: Props) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      email: true,
      website: true,
      googleMapsUrl: true,
      cuisineType: true,
      restaurantType: true,
      estimatedVolume: true,
      repId: true,
      territoryId: true,
      pipelineStage: true,
      isArchived: true,
      // Operational fields
      deliveriesPerWeek: true,
      desiredDeliveryTime: true,
      deliveryLocation: true,
      paymentMethod: true,
      billingTerms: true,
      yearsInBusiness: true,
      isReferral: true,
      referredBy: true,
      additionalNotes: true,
      followUpNotes: true,
      nearbyProspectsVisited: true,
      creditAppSent: true,
      creditAppSentAt: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          notes: true,
          isPrimary: true,
        },
      },
    },
  })

  if (!restaurant || restaurant.isArchived) notFound()

  if (!can.editRestaurant(user.role, restaurant.repId, user.id)) {
    redirect(`/restaurants/${id}`)
  }

  // Fetch reps for the rep assignment dropdown (admin only)
  const reps =
    user.role === "ADMIN"
      ? await db.user.findMany({
          where: { status: "ACTIVE", role: { in: ["ADMIN", "SALES_REP"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : []

  const canDelete = can.deleteRestaurant(user.role, restaurant.repId, user.id)

  return (
    <EditRestaurantForm
      restaurant={restaurant}
      reps={reps}
      canDelete={canDelete}
      isAdmin={user.role === "ADMIN"}
    />
  )
}
