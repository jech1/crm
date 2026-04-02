/**
 * Log a new visit page.
 *
 * Reads ?restaurantId from the URL so this page can be linked from:
 *   - The restaurant profile "Log Visit" button
 *   - The dashboard follow-up queue
 *   - The sidebar new visit shortcut
 *
 * Fetches the restaurant name server-side so the form can display it.
 */

import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { VisitForm } from "@/components/visits/VisitForm"
import { PageHeader } from "@/components/layout/PageHeader"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Log Visit" }

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const params = await searchParams
  const restaurantId = params.restaurantId

  if (!restaurantId) {
    // No restaurant context — redirect to restaurants list to pick one
    redirect("/restaurants")
  }

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true },
  })

  if (!restaurant) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Log Visit"
        description={`Recording a visit to ${restaurant.name}`}
      />
      <div className="rounded-xl border bg-white p-6">
        <VisitForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
      </div>
    </div>
  )
}
