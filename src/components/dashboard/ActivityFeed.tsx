/**
 * Recent activity feed.
 * Chronological log of team actions — visits, notes, stage changes, etc.
 */

import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"
import type { ActivityLog } from "@prisma/client"
import type { RepSummary, RestaurantSummary } from "@/types"
import {
  MapPin,
  FileText,
  TrendingUp,
  Heart,
  CheckSquare,
  Plus,
  Package,
} from "lucide-react"

interface ActivityFeedProps {
  activities: (ActivityLog & {
    user: RepSummary
    restaurant: RestaurantSummary | null
  })[]
}

const ACTIVITY_ICONS = {
  RESTAURANT_CREATED: Plus,
  RESTAURANT_IMPORTED: Plus,
  VISIT_LOGGED: MapPin,
  NOTE_ADDED: FileText,
  MEETING_SCHEDULED: CheckSquare,
  MEETING_COMPLETED: CheckSquare,
  STAGE_CHANGED: TrendingUp,
  OWNERSHIP_ASSIGNED: Plus,
  WARM_INTRO_ADDED: Heart,
  SAMPLE_LOGGED: Package,
  TASK_CREATED: CheckSquare,
  TASK_COMPLETED: CheckSquare,
  LEAD_WON: TrendingUp,
  LEAD_LOST: TrendingUp,
  FILE_UPLOADED: FileText,
  CONTACT_ADDED: Plus,
  MEETING_CANCELLED: FileText,
} as const

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h2>

      {activities.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.action] ?? Plus

            return (
              <li key={activity.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                    {activity.restaurant ? (
                      <>
                        {activity.description.split(activity.restaurant.name)[0]}
                        <Link
                          href={`/restaurants/${activity.restaurant.id}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-green-700 dark:hover:text-green-400"
                        >
                          {activity.restaurant.name}
                        </Link>
                        {activity.description.split(activity.restaurant.name)[1]}
                      </>
                    ) : (
                      activity.description
                    )}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
