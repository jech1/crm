/**
 * New warm intro page.
 * Reads ?restaurantId from URL. If not provided, shows a restaurant picker.
 */

import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WarmIntroForm } from "@/components/warm-leads/WarmIntroForm"
import { PageHeader } from "@/components/layout/PageHeader"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Add Warm Intro" }

export default async function NewWarmIntroPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const params = await searchParams
  const restaurantId = params.restaurantId

  if (!restaurantId) redirect("/restaurants")

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true },
  })

  if (!restaurant) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Warm Intro"
        description={`Adding a warm introduction for ${restaurant.name}`}
      />
      <div className="rounded-xl border bg-white p-6">
        <WarmIntroForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
      </div>
    </div>
  )
}
