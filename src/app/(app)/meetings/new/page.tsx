/**
 * Schedule Meeting page.
 *
 * Server component fetches accessible restaurants, then renders the client form.
 * Accepts ?restaurantId=... to pre-select and lock the restaurant.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Suspense } from "react"
import { NewMeetingForm } from "./NewMeetingForm"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Schedule Meeting" }

export default async function NewMeetingPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  // Fetch restaurants the rep has access to
  const restaurants = await db.restaurant.findMany({
    where: {
      isArchived: false,
      ...(user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { repId: user.id },
              { supportingReps: { some: { userId: user.id } } },
            ],
          }),
    },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
    take: 200,
  })

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading…</div>}>
      <NewMeetingForm restaurants={restaurants} />
    </Suspense>
  )
}
