/**
 * Dashboard page — server component.
 *
 * Fetches all dashboard data from the API route (which handles role-scoping),
 * then passes it to each widget. No client-side data fetching on this page.
 *
 * Layout:
 *   1. Greeting + date
 *   2. 6 KPI cards
 *   3. Pipeline overview bar (full width)
 *   4. Two columns: Upcoming Meetings | Follow-Up Queue
 *   5. Two columns: Warm Leads | Opportunity Highlights
 *   6. Two columns: Activity Feed | (Territory Snapshot placeholder)
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { PipelineBar } from "@/components/dashboard/PipelineBar"
import { FollowUpQueue } from "@/components/dashboard/FollowUpQueue"
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings"
import { WarmLeadsWidget } from "@/components/dashboard/WarmLeadsWidget"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import {
  Store,
  AlertCircle,
  CalendarDays,
  Heart,
  TrendingUp,
  PlusCircle,
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }


export default async function DashboardPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  // Fetch directly from service layer to avoid HTTP overhead in server components
  const { startOfWeek, endOfWeek, startOfMonth, addDays } = await import("date-fns")
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const isAdmin = user.role === "ADMIN"

  const repFilter = isAdmin ? { isArchived: false } : { repId: user.id, isArchived: false }

  const [
    totalRestaurants, addedThisWeek, followUpsDue, meetingsThisWeek,
    warmLeads, customersWonThisMonth, lostThisMonth, visitsThisWeek,
    pipelineGroupBy, upcomingMeetings, followUpQueue, topWarmLeads,
    recentActivity, opportunityHighlights,
  ] = await Promise.all([
    db.restaurant.count({ where: repFilter }),
    db.restaurant.count({ where: { ...repFilter, createdAt: { gte: weekStart } } }),
    db.task.count({ where: { assignedToId: isAdmin ? undefined : user.id, isCompleted: false, dueDate: { lte: now } } }),
    db.meeting.count({ where: { ownerId: isAdmin ? undefined : user.id, scheduledAt: { gte: weekStart, lte: weekEnd }, isCompleted: false } }),
    db.warmIntro.count({ where: { isActive: true, restaurant: repFilter } }),
    db.stageHistory.count({
      where: {
        toStage: "CUSTOMER",
        changedAt: { gte: monthStart },
        ...(isAdmin ? {} : { restaurant: { repId: user.id } }),
      },
    }),
    db.lossRecord.count({ where: { lostAt: { gte: monthStart } } }),
    db.visit.count({ where: { repId: isAdmin ? undefined : user.id, visitDate: { gte: weekStart, lte: weekEnd } } }),
    db.restaurant.groupBy({ by: ["pipelineStage"], where: repFilter, _count: { _all: true } }),
    db.meeting.findMany({
      where: { ownerId: isAdmin ? undefined : user.id, scheduledAt: { gte: now, lte: addDays(now, 7) }, isCompleted: false },
      orderBy: { scheduledAt: "asc" }, take: 5,
      include: { restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } }, owner: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
    db.task.findMany({
      where: { assignedToId: isAdmin ? undefined : user.id, isCompleted: false, dueDate: { lte: addDays(now, 3) } },
      orderBy: { dueDate: "asc" }, take: 10,
      include: { restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } }, assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
    db.warmIntro.findMany({
      where: { isActive: true, restaurant: repFilter },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 5,
      include: { restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } }, addedBy: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
    db.activityLog.findMany({
      where: isAdmin ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" }, take: 10,
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } }, restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } } },
    }),
    db.restaurant.findMany({
      where: { ...repFilter, isCustomer: false },
      orderBy: { opportunityScore: "desc" }, take: 5,
      select: { id: true, name: true, opportunityScore: true, pipelineStage: true },
    }),
  ])

  const pipelineCounts: Record<string, number> = {}
  for (const row of pipelineGroupBy) {
    pipelineCounts[row.pipelineStage] = row._count._all
  }

  const firstName = user.name.split(" ")[0]
  const greeting = `Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, ${firstName}.`

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{greeting}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{format(now, "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* KPI Cards — 2 cols on phones, 3 on tablet, 6 on wide desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <KpiCard label="Restaurants" value={totalRestaurants} icon={Store} />
        <KpiCard label="Added This Week" value={addedThisWeek} icon={PlusCircle} />
        <KpiCard label="Follow-Ups Due" value={followUpsDue} icon={AlertCircle} urgent />
        <KpiCard label="Meetings This Week" value={meetingsThisWeek} icon={CalendarDays} />
        <KpiCard label="Warm Leads" value={warmLeads} icon={Heart} />
        <KpiCard label="Won This Month" value={customersWonThisMonth} icon={TrendingUp} />
      </div>

      {/* Pipeline Bar */}
      <PipelineBar counts={pipelineCounts} />

      {/* Row 2: Upcoming Meetings + Follow-Up Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingMeetings meetings={upcomingMeetings} />
        <FollowUpQueue tasks={followUpQueue} />
      </div>

      {/* Row 3: Warm Leads + Opportunity Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WarmLeadsWidget warmLeads={topWarmLeads} />

        {/* Opportunity Highlights */}
        <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Opportunity Highlights</h2>
          {opportunityHighlights.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No scored opportunities yet.</p>
          ) : (
            <ul className="space-y-3">
              {opportunityHighlights.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      <a href={`/restaurants/${r.id}`} className="hover:text-green-700 dark:hover:text-green-400">{r.name}</a>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${r.opportunityScore}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-6 text-right">{r.opportunityScore}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Row 4: Activity Feed */}
      <ActivityFeed activities={recentActivity} />
    </div>
  )
}
