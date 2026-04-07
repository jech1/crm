/**
 * Visits — chronological log of all field visits.
 * REPs see their own visits. ADMINs see all.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { formatDate, cn } from "@/lib/utils"
import { VISIT_TYPE_LABELS } from "@/lib/constants"
import { Footprints, ArrowRight } from "lucide-react"
import { isThisWeek, isThisMonth } from "date-fns"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Visits" }

const VISIT_TYPE_COLORS: Record<string, string> = {
  WALK_IN: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-indigo-100 text-indigo-700",
  FOLLOW_UP: "bg-yellow-100 text-yellow-700",
  SAMPLE_DROP: "bg-green-100 text-green-700",
  PHONE_CALL: "bg-slate-100 text-slate-600",
}

export default async function VisitsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const visits = await db.visit.findMany({
    where: {
      ...(user.role === "SALES_REP" && { repId: user.id }),
    },
    orderBy: { visitDate: "desc" },
    take: 150,
    include: {
      restaurant: {
        select: { id: true, name: true, city: true, state: true, pipelineStage: true },
      },
      rep: { select: { id: true, name: true } },
    },
  })

  const thisWeek = visits.filter((v) => isThisWeek(new Date(v.visitDate), { weekStartsOn: 1 }))
  const thisMonth = visits.filter(
    (v) => isThisMonth(new Date(v.visitDate)) && !isThisWeek(new Date(v.visitDate), { weekStartsOn: 1 }),
  )
  const older = visits.filter((v) => !isThisMonth(new Date(v.visitDate)))

  return (
    <div>
      <PageHeader
        title="Visits"
        description={`${visits.length} visit${visits.length !== 1 ? "s" : ""} logged · ${thisWeek.length} this week`}
      />

      {/* Quick stats */}
      {visits.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{thisWeek.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This week</p>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{thisMonth.length + thisWeek.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This month</p>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{visits.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All time</p>
          </div>
        </div>
      )}

      {visits.length === 0 ? (
        <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-12">
          <EmptyState
            icon={Footprints}
            title="No visits logged yet"
            description="Log a visit from any restaurant's profile page. Visit logs track your field activity and auto-advance pipeline stages."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {thisWeek.length > 0 && (
            <VisitGroup
              title={`This Week (${thisWeek.length})`}
              visits={thisWeek}
              showRep={user.role === "ADMIN"}
            />
          )}
          {thisMonth.length > 0 && (
            <VisitGroup
              title={`Earlier This Month (${thisMonth.length})`}
              visits={thisMonth}
              showRep={user.role === "ADMIN"}
            />
          )}
          {older.length > 0 && (
            <VisitGroup
              title={`Older (${older.length})`}
              visits={older}
              showRep={user.role === "ADMIN"}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-component ──────────────────────────────────────────────

type VisitWithRelations = Awaited<ReturnType<typeof db.visit.findMany>>[number] & {
  restaurant: {
    id: string
    name: string
    city: string
    state: string
    pipelineStage: string
  }
  rep: { id: string; name: string }
}

function VisitGroup({
  title,
  visits,
  showRep,
}: {
  title: string
  visits: VisitWithRelations[]
  showRep: boolean
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">{title}</h2>
      <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 divide-y dark:divide-slate-700">
        {visits.map((visit) => (
          <div key={visit.id} className="flex items-start gap-4 px-5 py-4">
            {/* Date column */}
            <div className="w-24 shrink-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(visit.visitDate)}</p>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block",
                  VISIT_TYPE_COLORS[visit.visitType] ?? "bg-slate-100 text-slate-600",
                )}
              >
                {VISIT_TYPE_LABELS[visit.visitType]}
              </span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/restaurants/${visit.restaurant.id}`}
                className="text-sm font-semibold text-slate-900 dark:text-white hover:text-green-700 dark:hover:text-green-400"
              >
                {visit.restaurant.name}
              </Link>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {visit.restaurant.city}, {visit.restaurant.state}
              </p>

              {visit.contactedPerson && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Spoke with <span className="font-medium">{visit.contactedPerson}</span>
                </p>
              )}

              {visit.outcome && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-700/50 rounded px-2 py-1">
                  {visit.outcome}
                </p>
              )}

              {visit.nextAction && (
                <p className="flex items-center gap-1 text-xs text-green-700 mt-1 font-medium">
                  <ArrowRight className="h-3 w-3" />
                  {visit.nextAction}
                </p>
              )}

              {visit.productsDiscussed.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {visit.productsDiscussed.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {showRep && (
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{visit.rep.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
