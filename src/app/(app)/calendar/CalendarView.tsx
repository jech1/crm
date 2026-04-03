"use client"

/**
 * CalendarView — FullCalendar-powered visual calendar for meetings.
 *
 * Features:
 *   - Month view (default) and week view toggle
 *   - Green events = upcoming, grey = completed, red = overdue
 *   - Click an event to see details + mark as done
 *   - Admins see all meetings; reps see their own
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, EventInput } from "@fullcalendar/core"
import { addMinutes, isPast } from "date-fns"
import { CalendarDays, MapPin, Clock, ExternalLink, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CompleteMeetingModal } from "@/components/meetings/CompleteMeetingModal"
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal"
import { MEETING_TYPE_LABELS } from "@/lib/constants"
import { formatDateTime } from "@/lib/utils"
import type { MeetingType } from "@prisma/client"

// ── Meeting type passed from the server page ─────────────────────────

export interface CalendarMeeting {
  id: string
  title: string
  meetingType: MeetingType
  scheduledAt: Date
  durationMins?: number | null
  location?: string | null
  notes?: string | null
  outcome?: string | null
  isCompleted: boolean
  restaurant: { id: string; name: string; city: string }
  owner: { id: string; name: string }
  googleEventId?: string | null
}

interface CalendarViewProps {
  meetings: CalendarMeeting[]
  isAdmin: boolean
  currentUserId: string
}

// ── Colour helpers ────────────────────────────────────────────────────

function eventColor(m: CalendarMeeting): string {
  if (m.isCompleted) return "#94a3b8"                                      // grey
  if (!m.isCompleted && isPast(new Date(m.scheduledAt))) return "#dc2626"  // red — overdue
  return "#16a34a"                                                          // green — upcoming
}

// ── Convert meeting array to FullCalendar EventInput ─────────────────

function toFCEvents(meetings: CalendarMeeting[]): EventInput[] {
  return meetings.map((m) => {
    // scheduledAt arrives as a string when serialised across the
    // server→client boundary — coerce to Date so date-fns and
    // FullCalendar always receive a proper Date object.
    const start = new Date(m.scheduledAt)
    const end = addMinutes(start, m.durationMins ?? 45)
    return {
      id: m.id,
      title: m.title,
      start,
      end,
      backgroundColor: eventColor(m),
      borderColor: eventColor(m),
      textColor: "#ffffff",
      extendedProps: { meeting: m },
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────

export function CalendarView({ meetings, isAdmin, currentUserId }: CalendarViewProps) {
  const router = useRouter()
  const [detailMeeting, setDetailMeeting] = useState<CalendarMeeting | null>(null)
  const [deleting, setDeleting] = useState(false)

  const events = toFCEvents(meetings)

  async function handleDelete(meetingId: string) {
    if (!confirm("Cancel this meeting? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" })
      if (res.ok) {
        setDetailMeeting(null)
        router.refresh()
      }
    } finally {
      setDeleting(false)
    }
  }

  function handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault()
    const m = info.event.extendedProps.meeting as CalendarMeeting
    setDetailMeeting(m)
  }

  return (
    <>
      {/* FullCalendar */}
      <div className="rounded-xl border bg-white p-4 fc-wrapper">
        <style>{`
          .fc-wrapper .fc-toolbar-title { font-size: 1rem; font-weight: 600; }
          .fc-wrapper .fc-button { font-size: 0.75rem; padding: 4px 10px; }
          .fc-wrapper .fc-button-primary { background-color: #16a34a; border-color: #16a34a; }
          .fc-wrapper .fc-button-primary:hover { background-color: #15803d; border-color: #15803d; }
          .fc-wrapper .fc-button-primary:not(:disabled):active,
          .fc-wrapper .fc-button-primary:not(:disabled).fc-button-active {
            background-color: #166534; border-color: #166534;
          }
          .fc-wrapper .fc-daygrid-event { border-radius: 4px; font-size: 0.7rem; }
          .fc-wrapper .fc-event-title { font-weight: 500; }
          .fc-wrapper .fc-col-header-cell-cushion,
          .fc-wrapper .fc-daygrid-day-number { color: #475569; font-size: 0.75rem; }
          .fc-wrapper .fc-day-today { background-color: #f0fdf4 !important; }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          buttonText={{ today: "Today", month: "Month", week: "Week" }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={3}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-600 shrink-0" />
          Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-600 shrink-0" />
          Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 shrink-0" />
          Completed
        </span>
      </div>

      {/* Event detail dialog */}
      {detailMeeting && (
        <Dialog open={!!detailMeeting} onOpenChange={(open) => !open && setDetailMeeting(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{detailMeeting.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              {/* Meeting type + restaurant */}
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {MEETING_TYPE_LABELS[detailMeeting.meetingType]} ·{" "}
                  <button
                    onClick={() => {
                      router.push(`/restaurants/${detailMeeting.restaurant.id}`)
                      setDetailMeeting(null)
                    }}
                    className="text-green-700 hover:underline font-medium"
                  >
                    {detailMeeting.restaurant.name}
                  </button>
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {formatDateTime(detailMeeting.scheduledAt)}
                  {detailMeeting.durationMins && ` · ${detailMeeting.durationMins} min`}
                </span>
              </div>

              {/* Location */}
              {detailMeeting.location && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  {detailMeeting.location}
                </div>
              )}

              {/* Rep (admin view) */}
              {isAdmin && (
                <p className="text-xs text-slate-400">
                  Owned by {detailMeeting.owner.name}
                </p>
              )}

              {/* Notes */}
              {detailMeeting.notes && (
                <p className="text-xs text-slate-500 italic bg-slate-50 rounded px-2 py-1.5">
                  {detailMeeting.notes}
                </p>
              )}

              {/* Outcome (if completed) */}
              {detailMeeting.isCompleted && detailMeeting.outcome && (
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1.5">
                  ✓ {detailMeeting.outcome}
                </p>
              )}
            </div>

            {/* Google Calendar sync status */}
            <div className="flex items-center gap-1.5 text-xs">
              {detailMeeting.googleEventId ? (
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  Synced to Google Calendar
                </span>
              ) : (
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-200" />
                  Not synced to Google Calendar
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  router.push(`/restaurants/${detailMeeting.restaurant.id}`)
                  setDetailMeeting(null)
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Restaurant
              </Button>

              <div className="flex items-center gap-2">
                {/* Edit — owner or admin, not yet completed */}
                {!detailMeeting.isCompleted &&
                  (isAdmin || detailMeeting.owner.id === currentUserId) && (
                    <EditMeetingModal
                      meeting={detailMeeting}
                      onSuccess={() => setDetailMeeting(null)}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      }
                    />
                  )}

                {/* Mark Done */}
                {!detailMeeting.isCompleted && (
                  <CompleteMeetingModal
                    meetingId={detailMeeting.id}
                    meetingTitle={detailMeeting.title}
                    restaurantName={detailMeeting.restaurant.name}
                    trigger={
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Mark Done
                      </Button>
                    }
                  />
                )}

                {/* Cancel — owner or admin */}
                {(isAdmin || detailMeeting.owner.id === currentUserId) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={deleting}
                    onClick={() => handleDelete(detailMeeting.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {deleting ? "…" : "Cancel"}
                  </Button>
                )}

                {detailMeeting.isCompleted && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    ✓ Completed
                  </span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
