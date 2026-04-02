/**
 * Admin — Territory Management (Phase 9).
 * Server component: fetches data and passes to TerritoriesClient for full CRUD.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { TerritoriesClient } from "@/components/admin/territories/TerritoriesClient"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Territories" }

export default async function TerritoriesPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const me = await db.user.findUnique({ where: { clerkId }, select: { role: true } })
  if (!me || me.role !== "ADMIN") redirect("/dashboard")

  const [territories, reps, unassignedCount, totalRestaurants] = await Promise.all([
    db.territory.findMany({
      include: {
        rep: { select: { id: true, name: true, email: true } },
        _count: { select: { restaurants: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: "SALES_REP", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.restaurant.count({ where: { isArchived: false, territoryId: null } }),
    db.restaurant.count({ where: { isArchived: false } }),
  ])

  const coveragePct =
    totalRestaurants > 0
      ? Math.round(((totalRestaurants - unassignedCount) / totalRestaurants) * 100)
      : 0

  return (
    <div>
      <PageHeader
        title="Territories"
        description={`${territories.length} territor${territories.length !== 1 ? "ies" : "y"} · ${coveragePct}% of restaurants assigned`}
      />
      <TerritoriesClient
        territories={territories}
        reps={reps}
        totalRestaurants={totalRestaurants}
        unassignedCount={unassignedCount}
      />
    </div>
  )
}
