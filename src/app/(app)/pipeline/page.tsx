/**
 * Pipeline / Kanban page — server component.
 * Shows restaurants grouped by stage in a scrollable horizontal layout.
 * Phase 2+ will add drag-to-stage functionality via a client component.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { StageBadge } from "@/components/restaurants/StageBadge"
import { PIPELINE_STAGES_ORDERED, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS } from "@/lib/constants"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) redirect("/api/auth/sync")

  const restaurants = await db.restaurant.findMany({
    where: {
      isArchived: false,
      ...(user.role === "SALES_REP" && { repId: user.id }),
    },
    select: {
      id: true,
      name: true,
      city: true,
      pipelineStage: true,
      opportunityScore: true,
      rep: { select: { id: true, name: true } },
      _count: { select: { visits: true } },
    },
    orderBy: { opportunityScore: "desc" },
  })

  // Group by stage
  const byStage = PIPELINE_STAGES_ORDERED.reduce(
    (acc, stage) => {
      acc[stage] = restaurants.filter((r) => r.pipelineStage === stage)
      return acc
    },
    {} as Record<string, typeof restaurants>,
  )

  return (
    <div>
      <PageHeader title="Pipeline" description="Restaurants by sales stage" />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES_ORDERED.map((stage) => {
          const stageRestaurants = byStage[stage]
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${PIPELINE_STAGE_COLORS[stage]}`}>
                  {PIPELINE_STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-slate-400">{stageRestaurants.length}</span>
              </div>

              <div className="space-y-2">
                {stageRestaurants.map((r) => (
                  <Link
                    key={r.id}
                    href={`/restaurants/${r.id}`}
                    className="block rounded-lg border bg-white p-3 hover:shadow-sm transition-shadow"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.city}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{r._count.visits} visit{r._count.visits !== 1 ? "s" : ""}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${r.opportunityScore}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{r.opportunityScore}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {stageRestaurants.length === 0 && (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-400">No restaurants</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
