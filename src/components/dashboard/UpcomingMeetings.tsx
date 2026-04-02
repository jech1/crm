/**
 * Upcoming meetings widget.
 * Shows the next 5 scheduled meetings with restaurant name, type, time, and rep.
 */

import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import { MEETING_TYPE_LABELS } from "@/lib/constants"
import { CalendarDays } from "lucide-react"
import type { Meeting } from "@prisma/client"
import type { RepSummary, RestaurantSummary } from "@/types"

interface UpcomingMeetingsProps {
  meetings: (Meeting & {
    restaurant: RestaurantSummary
    owner: RepSummary
  })[]
}

export function UpcomingMeetings({ meetings }: UpcomingMeetingsProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Meetings</h2>
        <Link href="/calendar" className="text-xs text-green-600 dark:text-green-400 hover:underline">
          View calendar
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No meetings scheduled this week.</p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/restaurants/${meeting.restaurant.id}`}
                  className="text-sm font-medium text-slate-900 dark:text-white hover:text-green-700 dark:hover:text-green-400 truncate block"
                >
                  {meeting.restaurant.name}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {MEETING_TYPE_LABELS[meeting.meetingType]}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDateTime(meeting.scheduledAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
