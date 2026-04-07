"use client"

/**
 * MeetingsSection — shows upcoming + recent completed meetings on the restaurant profile.
 * "Schedule Meeting" links to /meetings/new?restaurantId=...
 * "Done" button opens CompleteMeetingModal to capture outcome and next step.
 */

import Link from "next/link"
import { CalendarDays, CheckCircle2, Clock, Plus, MapPin } from "lucide-react"
import { cn, formatDateTime, formatDate } from "@/lib/utils"
import { MEETING_TYPE_LABELS } from "@/lib/constants"
import { CompleteMeetingModal } from "@/components/meetings/CompleteMeetingModal"
import type { MeetingType } from "@prisma/client"

type MeetingRow = {
  id: string
  title: string
  meetingType: MeetingType
  scheduledAt: Date | string
  durationMins: number | null
  location: string | null
  notes: string | null
  outcome: string | null
  nextStep: string | null
  isCompleted: boolean
  completedAt: Date | string | null
  owner: { id: string; name: string; email: string; avatarUrl: string | null }
}

interface Props {
  meetings: MeetingRow[]
  restaurantId: string
  restaurantName: string
  canLog: boolean
}

export function MeetingsSection({ meetings, restaurantId, restaurantName, canLog }: Props) {
  const upcoming = meetings.filter((m) => !m.isCompleted)
  const past = meetings.filter((m) => m.isCompleted)

  if (meetings.length === 0 && !canLog) return null

  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          Meetings
          {upcoming.length > 0 && (
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
              ({upcoming.length} upcoming)
            </span>
          )}
        </h2>
        {canLog && (
          <Link
            href={`/meetings/new?restaurantId=${restaurantId}`}
            className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 px-2 py-1 rounded-md transition-colors"
          >
            <Plus className="h-3 w-3" />
            Schedule
          </Link>
        )}
      </div>

      {meetings.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
          No meetings yet. Schedule one to get started.
        </p>
      ) : (
        <div className="space-y-0 divide-y dark:divide-slate-700">
          {/* Upcoming */}
          {upcoming.map((meeting) => (
            <div key={meeting.id} className="py-2.5 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{meeting.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {MEETING_TYPE_LABELS[meeting.meetingType]} · {formatDateTime(meeting.scheduledAt)}
                      {meeting.durationMins ? ` · ${meeting.durationMins} min` : ""}
                    </p>
                    {meeting.location && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {meeting.location}
                      </p>
                    )}
                    {meeting.notes && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{meeting.notes}</p>
                    )}
                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">{meeting.owner.name}</p>
                  </div>
                  {canLog && (
                    <CompleteMeetingModal
                      meetingId={meeting.id}
                      meetingTitle={meeting.title}
                      restaurantName={restaurantName}
                      trigger={
                        <button
                          type="button"
                          className={cn(
                            "shrink-0 text-xs px-2 py-1 rounded-md border transition-colors",
                            "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20",
                          )}
                        >
                          Done
                        </button>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Past / completed */}
          {past.map((meeting) => (
            <div key={meeting.id} className="py-2.5 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-400 dark:text-slate-500 line-through">{meeting.title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {MEETING_TYPE_LABELS[meeting.meetingType]}
                  {meeting.completedAt ? ` · ${formatDate(meeting.completedAt)}` : ""}
                </p>
                {meeting.outcome && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-1">
                    {meeting.outcome}
                  </p>
                )}
                {meeting.nextStep && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">→ {meeting.nextStep}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
