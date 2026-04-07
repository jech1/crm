/**
 * Activity — full chronological team activity feed.
 * REPs see their own activity. ADMINs see the whole team.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { formatRelativeTime, initials, cn } from "@/lib/utils"
import { Activity } from "lucide-react"
import type { Metadata } from "next"
import type { ActivityType } from "@prisma/client"

export const metadata: Metadata = { title: "Activity" }

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  RESTAURANT_CREATED: "added a restaurant",
  RESTAURANT_IMPORTED: "imported a restaurant",
  VISIT_LOGGED: "logged a visit",
  NOTE_ADDED: "added a note",
  MEETING_SCHEDULED: "scheduled a meeting",
  MEETING_COMPLETED: "completed a meeting",
  STAGE_CHANGED: "updated the pipeline stage",
  OWNERSHIP_ASSIGNED: "assigned a restaurant",
  WARM_INTRO_ADDED: "added a warm intro",
  SAMPLE_LOGGED: "logged a sample",
  TASK_CREATED: "created a task",
  TASK_COMPLETED: "completed a task",
  LEAD_WON: "converted a restaurant to customer",
  LEAD_LOST: "marked a lead as lost",
  FILE_UPLOADED: "uploaded a file",
  CONTACT_ADDED: "added a contact",
  MEETING_CANCELLED: "cancelled a meeting",
}

const ACTIVITY_COLORS: Partial<Record<ActivityType, string>> = {
  VISIT_LOGGED: "bg-blue-100 text-blue-700",
  STAGE_CHANGED: "bg-violet-100 text-violet-700",
  WARM_INTRO_ADDED: "bg-pink-100 text-pink-700",
  LEAD_WON: "bg-green-100 text-green-700",
  LEAD_LOST: "bg-slate-100 text-slate-500",
  MEETING_SCHEDULED: "bg-indigo-100 text-indigo-700",
  MEETING_COMPLETED: "bg-emerald-100 text-emerald-700",
  TASK_COMPLETED: "bg-emerald-100 text-emerald-700",
  SAMPLE_LOGGED: "bg-yellow-100 text-yellow-700",
}

export default async function ActivityPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const activities = await db.activityLog.findMany({
    where: user.role === "SALES_REP" ? { userId: user.id } : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      restaurant: { select: { id: true, name: true } },
    },
  })

  // Group by date label
  const grouped: Record<string, typeof activities> = {}
  for (const a of activities) {
    const date = new Date(a.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) label = "Today"
    else if (date.toDateString() === yesterday.toDateString()) label = "Yesterday"
    else {
      label = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    }

    if (!grouped[label]) grouped[label] = []
    grouped[label].push(a)
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        description={
          user.role === "ADMIN"
            ? "All team activity across the CRM"
            : "Your recent activity"
        }
      />

      {activities.length === 0 ? (
        <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-12">
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Actions like visit logs, stage changes, and notes will appear here as your team uses the CRM."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                {dateLabel}
              </h2>
              <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 divide-y dark:divide-slate-700">
                {items.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                      {initials(activity.user.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-medium text-slate-900 dark:text-white">{activity.user.name}</span>
                          {" "}
                          {ACTIVITY_LABELS[activity.action] ??
                            activity.action.toLowerCase().replace(/_/g, " ")}
                          {activity.restaurant && (
                            <>
                              {" — "}
                              <Link
                                href={`/restaurants/${activity.restaurant.id}`}
                                className="text-green-700 hover:underline font-medium"
                              >
                                {activity.restaurant.name}
                              </Link>
                            </>
                          )}
                        </p>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activity.description}</p>
                      )}

                      {/* Action type badge */}
                      <span
                        className={cn(
                          "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-1.5",
                          ACTIVITY_COLORS[activity.action] ?? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
                        )}
                      >
                        {activity.action.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
