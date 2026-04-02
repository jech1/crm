/**
 * Restaurants list page — server component.
 *
 * Reads URL search params (stage, q, repId, city) and passes them to the
 * database query. Results are server-rendered — no client fetch needed.
 */

import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { RestaurantTable } from "@/components/restaurants/RestaurantTable"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Metadata } from "next"
import type { PipelineStage, Prisma } from "@prisma/client"
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGES_ORDERED } from "@/lib/constants"

export const metadata: Metadata = { title: "Restaurants" }

interface SearchParams {
  stage?: string
  q?: string
  repId?: string
  city?: string
  page?: string
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const limit = 50
  const skip = (page - 1) * limit

  const stage = params.stage as PipelineStage | undefined
  const q = params.q ?? ""
  const city = params.city

  const where: Prisma.RestaurantWhereInput = {
    isArchived: false,
    // Reps see restaurants they own OR are a supporting rep on
    ...(user.role === "SALES_REP" && {
      OR: [
        { repId: user.id },
        { supportingReps: { some: { userId: user.id } } },
      ],
    }),
    ...(stage && { pipelineStage: stage }),
    ...(city && { city }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    }),
  }

  const isAdmin = user.role === "ADMIN"

  const [restaurants, total, reps] = await Promise.all([
    db.restaurant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        rep: { select: { id: true, name: true, email: true, avatarUrl: true } },
        territory: { select: { id: true, name: true } },
        _count: { select: { visits: true, tasks: true, warmIntros: true } },
      },
    }),
    db.restaurant.count({ where }),
    // Fetch active reps for the bulk-assign dropdown (admin only)
    isAdmin
      ? db.user.findMany({
          where: { status: "ACTIVE", role: { in: ["ADMIN", "SALES_REP"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ])

  return (
    <div>
      <PageHeader
        title={user.role === "ADMIN" ? "All Restaurants" : "My Restaurants"}
        description={
          user.role === "ADMIN"
            ? `${total} restaurant${total !== 1 ? "s" : ""} across all reps`
            : `${total} restaurant${total !== 1 ? "s" : ""} in your accounts`
        }
        actions={
          user.role !== "CONNECTOR" ? (
            <Button asChild size="sm">
              <Link href="/restaurants/new">
                <Plus className="h-4 w-4" />
                Add Restaurant
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Stage filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        <Link
          href="/restaurants"
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            !stage ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </Link>
        {PIPELINE_STAGES_ORDERED.map((s) => (
          <Link
            key={s}
            href={`/restaurants?stage=${s}${q ? `&q=${q}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              stage === s ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
            }`}
          >
            {PIPELINE_STAGE_LABELS[s]}
          </Link>
        ))}
      </div>

      <RestaurantTable restaurants={restaurants} isAdmin={isAdmin} reps={reps} />

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            Showing {skip + 1}–{Math.min(skip + restaurants.length, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/restaurants?page=${page - 1}${stage ? `&stage=${stage}` : ""}${q ? `&q=${q}` : ""}`}
                className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            {skip + restaurants.length < total && (
              <Link
                href={`/restaurants?page=${page + 1}${stage ? `&stage=${stage}` : ""}${q ? `&q=${q}` : ""}`}
                className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
