/**
 * Reports — pipeline health and sales activity overview.
 * KPI counts are real DB data. Chart bars are illustrative scaffolds
 * (Phase 9 will wire Recharts with real time-series data).
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGES_ORDERED, LOSS_REASON_LABELS } from "@/lib/constants"
import { cn, initials } from "@/lib/utils"
import { startOfMonth, startOfWeek, subWeeks, endOfWeek } from "date-fns"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const repFilter = user.role === "SALES_REP" ? { repId: user.id } : {}
  const repVisitFilter = user.role === "SALES_REP" ? { repId: user.id } : {}
  const repMeetingFilter = user.role === "SALES_REP" ? { ownerId: user.id } : {}
  const repTaskFilter = user.role === "SALES_REP" ? { assignedToId: user.id } : {}

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  const [
    totalRestaurants,
    customers,
    activeLeads,
    visitsThisWeek,
    visitsThisMonth,
    meetingsThisMonth,
    overdueTasks,
    openTasks,
    activeWarmLeads,
    stageCounts,
    wonThisMonthRaw,
    lostThisMonthRaw,
    // Visit counts per week for sparkline (last 8 weeks)
    ...weeklyVisitCounts
  ] = await Promise.all([
    db.restaurant.count({ where: { ...repFilter, isArchived: false } }),
    db.restaurant.count({ where: { ...repFilter, isArchived: false, pipelineStage: "CUSTOMER" } }),
    db.restaurant.count({
      where: {
        ...repFilter,
        isArchived: false,
        pipelineStage: { notIn: ["CUSTOMER", "LOST_LEAD", "NOT_CONTACTED"] },
      },
    }),
    db.visit.count({ where: { ...repVisitFilter, visitDate: { gte: weekStart } } }),
    db.visit.count({ where: { ...repVisitFilter, visitDate: { gte: monthStart } } }),
    db.meeting.count({ where: { ...repMeetingFilter, scheduledAt: { gte: monthStart } } }),
    db.task.count({ where: { ...repTaskFilter, isCompleted: false, dueDate: { lt: now } } }),
    db.task.count({ where: { ...repTaskFilter, isCompleted: false } }),
    db.warmIntro.count({
      where: { isActive: true, ...(user.role === "SALES_REP" ? { restaurant: { repId: user.id } } : {}) },
    }),
    db.restaurant.groupBy({
      by: ["pipelineStage"],
      where: { ...repFilter, isArchived: false },
      _count: { _all: true },
    }),
    db.stageHistory.count({
      where: {
        toStage: "CUSTOMER",
        changedAt: { gte: monthStart },
        ...(user.role === "SALES_REP" ? { restaurant: { repId: user.id } } : {}),
      },
    }),
    db.stageHistory.count({
      where: {
        toStage: "LOST_LEAD",
        changedAt: { gte: monthStart },
        ...(user.role === "SALES_REP" ? { restaurant: { repId: user.id } } : {}),
      },
    }),
    // Weekly visit buckets — last 8 weeks
    ...Array.from({ length: 8 }, (_, i) => {
      const start = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 })
      const end = endOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 })
      return db.visit.count({ where: { ...repVisitFilter, visitDate: { gte: start, lte: end } } })
    }),
  ])

  const wonThisMonth = wonThisMonthRaw
  const lostThisMonth = lostThisMonthRaw

  // ── Admin-only: rep performance + loss reason breakdown ──────────────────
  let repPerformanceRows: {
    id: string
    name: string
    email: string
    restaurants: number
    visitsThisMonth: number
    meetingsCompleted: number
    tasksCompleted: number
    wins: number
    losses: number
    overdueTasks: number
  }[] = []

  let lossReasonBreakdown: { reason: string; count: number }[] = []

  if (user.role === "ADMIN") {
    const [
      reps,
      visitsByRep,
      meetingsByRep,
      tasksByRep,
      overdueByRep,
      recentWins,
      recentLosses,
      lossReasons,
    ] = await Promise.all([
      db.user.findMany({
        where: { role: { in: ["ADMIN", "SALES_REP"] }, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { assignedRestaurants: true } },
        },
        orderBy: { name: "asc" },
      }),
      db.visit.groupBy({
        by: ["repId"],
        where: { visitDate: { gte: monthStart } },
        _count: { _all: true },
      }),
      db.meeting.groupBy({
        by: ["ownerId"],
        where: { isCompleted: true, completedAt: { gte: monthStart } },
        _count: { _all: true },
      }),
      db.task.groupBy({
        by: ["assignedToId"],
        where: { isCompleted: true, completedAt: { gte: monthStart } },
        _count: { _all: true },
      }),
      db.task.groupBy({
        by: ["assignedToId"],
        where: { isCompleted: false, dueDate: { lt: now } },
        _count: { _all: true },
      }),
      // Wins/losses this month — query stageHistory + join to rep via restaurant
      db.stageHistory.findMany({
        where: { toStage: "CUSTOMER", changedAt: { gte: monthStart } },
        select: { restaurant: { select: { repId: true } } },
      }),
      db.stageHistory.findMany({
        where: { toStage: "LOST_LEAD", changedAt: { gte: monthStart } },
        select: { restaurant: { select: { repId: true } } },
      }),
      db.lossRecord.groupBy({
        by: ["reason"],
        _count: { _all: true },
        orderBy: { _count: { reason: "desc" } },
      }),
    ])

    // Build lookup maps
    const visitMap = Object.fromEntries(visitsByRep.map((r) => [r.repId, r._count._all]))
    const meetingMap = Object.fromEntries(meetingsByRep.map((r) => [r.ownerId, r._count._all]))
    const taskMap = Object.fromEntries(tasksByRep.map((r) => [r.assignedToId, r._count._all]))
    const overdueMap = Object.fromEntries(overdueByRep.map((r) => [r.assignedToId, r._count._all]))

    const winsByRepId: Record<string, number> = {}
    for (const w of recentWins) {
      const rid = w.restaurant.repId
      if (rid) winsByRepId[rid] = (winsByRepId[rid] ?? 0) + 1
    }
    const lossesByRepId: Record<string, number> = {}
    for (const l of recentLosses) {
      const rid = l.restaurant.repId
      if (rid) lossesByRepId[rid] = (lossesByRepId[rid] ?? 0) + 1
    }

    repPerformanceRows = reps.map((rep) => ({
      id: rep.id,
      name: rep.name,
      email: rep.email,
      restaurants: rep._count.assignedRestaurants,
      visitsThisMonth: visitMap[rep.id] ?? 0,
      meetingsCompleted: meetingMap[rep.id] ?? 0,
      tasksCompleted: taskMap[rep.id] ?? 0,
      wins: winsByRepId[rep.id] ?? 0,
      losses: lossesByRepId[rep.id] ?? 0,
      overdueTasks: overdueMap[rep.id] ?? 0,
    }))

    lossReasonBreakdown = lossReasons.map((r) => ({
      reason: LOSS_REASON_LABELS[r.reason] ?? r.reason,
      count: r._count._all,
    }))
  }

  const stageMap = Object.fromEntries(stageCounts.map((s) => [s.pipelineStage, s._count._all]))
  const maxStageCount = Math.max(...stageCounts.map((s) => s._count._all), 1)

  const weekLabels = Array.from({ length: 8 }, (_, i) => {
    const d = subWeeks(now, 7 - i)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })

  const STAGE_BAR_COLORS: Record<string, string> = {
    NOT_CONTACTED: "bg-slate-300",
    NEEDS_VISIT: "bg-blue-300",
    VISITED: "bg-indigo-400",
    SPOKE_TO_BUYER: "bg-violet-400",
    SAMPLES_REQUESTED: "bg-yellow-400",
    PRICING_SENT: "bg-orange-400",
    FOLLOW_UP_NEEDED: "bg-red-400",
    INTERESTED: "bg-emerald-400",
    CUSTOMER: "bg-green-500",
    LOST_LEAD: "bg-slate-200",
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description={
          user.role === "ADMIN"
            ? "Pipeline health and team activity overview"
            : "Your pipeline and field activity"
        }
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Total Restaurants",
            value: totalRestaurants,
            sub: "in pipeline",
            color: "text-slate-900",
          },
          {
            label: "Active Customers",
            value: customers,
            sub: "converted accounts",
            color: "text-green-600",
          },
          {
            label: "Active Leads",
            value: activeLeads,
            sub: "in progress",
            color: "text-indigo-600",
          },
          {
            label: "Visits This Week",
            value: visitsThisWeek,
            sub: `${visitsThisMonth} this month`,
            color: "text-slate-900",
          },
          {
            label: "Meetings This Month",
            value: meetingsThisMonth,
            sub: "scheduled or completed",
            color: "text-slate-900",
          },
          {
            label: "Overdue Follow-Ups",
            value: overdueTasks,
            sub: `${openTasks} total open`,
            color: overdueTasks > 0 ? "text-red-600" : "text-slate-900",
            urgent: overdueTasks > 0,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              "rounded-xl border bg-white p-5",
              kpi.urgent && "border-red-200 bg-red-50",
            )}
          >
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className={cn("text-3xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown */}
      <div className="rounded-xl border bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Pipeline Breakdown</h2>
        <div className="space-y-2.5">
          {PIPELINE_STAGES_ORDERED.map((stage) => {
            const count = stageMap[stage] ?? 0
            const pct = Math.round((count / maxStageCount) * 100)
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-40 shrink-0">
                  {PIPELINE_STAGE_LABELS[stage]}
                </span>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                  {count > 0 && (
                    <div
                      className={cn("h-full rounded transition-all", STAGE_BAR_COLORS[stage])}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700 w-6 text-right shrink-0">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Win / Loss + Warm Leads */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs text-slate-500">Won This Month</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{wonThisMonth}</p>
          <p className="text-xs text-slate-400 mt-0.5">New customers converted</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs text-slate-500">Lost This Month</p>
          <p className="text-3xl font-bold text-slate-400 mt-1">{lostThisMonth}</p>
          <p className="text-xs text-slate-400 mt-0.5">Leads marked lost</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs text-slate-500">Active Warm Leads</p>
          <p className="text-3xl font-bold text-pink-600 mt-1">{activeWarmLeads}</p>
          <p className="text-xs text-slate-400 mt-0.5">Open introductions</p>
        </div>
      </div>

      {/* Loss reason breakdown — admin only */}
      {user.role === "ADMIN" && lossReasonBreakdown.length > 0 && (
        <div className="rounded-xl border bg-white p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Why We Lose Deals</h2>
          <div className="space-y-2.5">
            {(() => {
              const maxCount = Math.max(...lossReasonBreakdown.map((r) => r.count), 1)
              return lossReasonBreakdown.map((r) => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-44 shrink-0">{r.reason}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-red-300 rounded transition-all"
                      style={{ width: `${Math.max(Math.round((r.count / maxCount) * 100), 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-6 text-right shrink-0">
                    {r.count}
                  </span>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Visit volume sparkline */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Visit Volume — Last 8 Weeks</h2>
          </div>
          <span className="text-xs text-slate-400">{visitsThisWeek} this week</span>
        </div>
        <div className="flex items-end gap-2 h-28">
          {weeklyVisitCounts.map((count, i) => {
            const maxCount = Math.max(...(weeklyVisitCounts as number[]), 1)
            const heightPct = Math.max(Math.round(((count as number) / maxCount) * 100), 6)
            const isCurrentWeek = i === 7
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-400 font-medium">{count as number}</span>
                <div
                  className={cn(
                    "w-full rounded-t",
                    isCurrentWeek ? "bg-green-500" : "bg-slate-200",
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={`${weekLabels[i]}: ${count} visits`}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 px-0.5">
          {weekLabels.map((l, i) => (
            <span
              key={i}
              className={cn(
                "text-[9px]",
                i === 7 ? "text-green-600 font-semibold" : "text-slate-400",
              )}
              style={{ width: "12.5%", textAlign: "center" }}
            >
              {i === 7 ? "Now" : l.split(" ")[1]}
            </span>
          ))}
        </div>
      </div>
      {/* Rep performance table — admin only */}
      {user.role === "ADMIN" && repPerformanceRows.length > 0 && (
        <div className="rounded-xl border bg-white p-5 mt-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Team Performance</h2>
          <p className="text-xs text-slate-400 mb-4">Current month · Active sales team members</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-4">Rep</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 px-3">Accounts</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 px-3">Visits</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 px-3">Meetings</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 px-3">Tasks Done</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 px-3 text-green-600">Wins</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 px-3">Losses</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2 pl-3 text-red-500">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {repPerformanceRows
                  .sort((a, b) => b.visitsThisMonth - a.visitsThisMonth)
                  .map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-green-700">
                              {initials(rep.name)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{rep.name}</p>
                            <p className="text-[10px] text-slate-400">{rep.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">{rep.restaurants}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={cn(
                          "font-semibold",
                          rep.visitsThisMonth >= 10 ? "text-green-600" :
                          rep.visitsThisMonth >= 5 ? "text-slate-700" :
                          rep.visitsThisMonth === 0 ? "text-slate-300" : "text-slate-700"
                        )}>
                          {rep.visitsThisMonth}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">{rep.meetingsCompleted}</td>
                      <td className="py-3 px-3 text-right text-slate-700">{rep.tasksCompleted}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={cn(
                          "font-semibold",
                          rep.wins > 0 ? "text-green-600" : "text-slate-300"
                        )}>
                          {rep.wins}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">{rep.losses}</td>
                      <td className="py-3 pl-3 text-right">
                        <span className={cn(
                          "font-semibold",
                          rep.overdueTasks > 5 ? "text-red-600" :
                          rep.overdueTasks > 0 ? "text-orange-500" : "text-slate-300"
                        )}>
                          {rep.overdueTasks}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {repPerformanceRows.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No active team members found.</p>
          )}
        </div>
      )}
    </div>
  )
}
