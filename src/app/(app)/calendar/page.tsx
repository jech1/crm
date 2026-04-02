/**
 * Calendar / Meetings page.
 *
 * Layout:
 *   1. Visual FullCalendar grid (month + week toggle)
 *   2. Upcoming meetings list (next 30 days) with "Mark Done" actions
 *   3. Recently completed meetings (last 30 days)
 *
 * Access: admins see all meetings; reps see owned + supported restaurants.
 * Date range: 60 days past → 90 days future (sufficient for calendar nav).
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatDate } from "@/lib/utils"
import { MEETING_TYPE_LABELS } from "@/lib/constants"
import { Plus, CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react"
import { subDays, addDays } from "date-fns"
import { CalendarCompleteButton } from "./CalendarCompleteButton"
import { CalendarClient } from "./CalendarClient"
import { GoogleCalendarBanner } from "./GoogleCalendarBanner"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Calendar" }

export default async function CalendarPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true, googleCalendarSync: true },
  })
  if (!user) redirect("/api/auth/sync")

  const isAdmin = user.role === "ADMIN"

  const accessFilter = isAdmin
    ? {}
    : {
        OR: [
          { ownerId: user.id },
          { restaurant: { supportingReps: { some: { userId: user.id } } } },
        ],
      }

  const now = new Date()

  // Wider range for the calendar grid
  const allMeetings = await db.meeting.findMany({
    where: {
      ...accessFilter,
      scheduledAt: { gte: subDays(now, 60), lte: addDays(now, 90) },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      restaurant: { select: { id: true, name: true, city: true } },
      owner: { select: { id: true, name: true } },
    },
  })

  // Subsets used by the list sections below
  const upcoming = allMeetings.filter((m) => !m.isCompleted && m.scheduledAt >= now)
  const recentlyCompleted = allMeetings
    .filter((m) => m.isCompleted && m.scheduledAt >= subDays(now, 30))
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 20)

  const description = `${upcoming.length} upcoming · ${recentlyCompleted.length} completed (last 30 days)`

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={description}
        actions={
          <Button asChild size="sm">
            <Link href="/meetings/new">
              <Plus className="h-4 w-4" />
              Schedule Meeting
            </Link>
          </Button>
        }
      />

      {/* ── Google Calendar banner ────────────────────────────────── */}
      {(isAdmin || user.role === "SALES_REP") && (
        <Suspense fallback={null}>
          <GoogleCalendarBanner isConnected={user.googleCalendarSync ?? false} />
        </Suspense>
      )}

      {/* ── Visual calendar ───────────────────────────────────────── */}
      <div className="mb-6">
        <CalendarClient meetings={allMeetings} isAdmin={isAdmin} currentUserId={user.id} />
      </div>

      {/* ── Upcoming list ─────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border bg-white px-5 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No upcoming meetings scheduled.</p>
            <Link
              href="/meetings/new"
              className="mt-3 inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule your first meeting
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border bg-white divide-y">
            {upcoming.map((meeting) => (
              <div key={meeting.id} className="flex items-start gap-4 px-5 py-4">
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateTime(meeting.scheduledAt)}
                  </p>
                  {meeting.durationMins && (
                    <p className="text-xs text-slate-400">{meeting.durationMins} min</p>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{meeting.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Link
                      href={`/restaurants/${meeting.restaurant.id}`}
                      className="text-xs text-green-700 hover:text-green-800 font-medium"
                    >
                      {meeting.restaurant.name}
                    </Link>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">
                      {MEETING_TYPE_LABELS[meeting.meetingType]}
                    </span>
                    {isAdmin && (
                      <>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">{meeting.owner.name}</span>
                      </>
                    )}
                  </div>
                  {meeting.location && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {meeting.location}
                    </p>
                  )}
                  {meeting.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">{meeting.notes}</p>
                  )}
                </div>

                <CalendarCompleteButton
                  meetingId={meeting.id}
                  meetingTitle={meeting.title}
                  restaurantName={meeting.restaurant.name}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recently completed ────────────────────────────────────── */}
      {recentlyCompleted.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed (last 30 days)
          </h2>
          <div className="rounded-xl border bg-white divide-y">
            {recentlyCompleted.map((meeting) => (
              <div key={meeting.id} className="flex items-start gap-4 px-5 py-4 opacity-70">
                <div className="w-36 shrink-0">
                  <p className="text-sm text-slate-500">
                    {meeting.completedAt ? formatDate(meeting.completedAt) : "—"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 line-through">{meeting.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Link
                      href={`/restaurants/${meeting.restaurant.id}`}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      {meeting.restaurant.name}
                    </Link>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {MEETING_TYPE_LABELS[meeting.meetingType]}
                    </span>
                    {isAdmin && (
                      <>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{meeting.owner.name}</span>
                      </>
                    )}
                  </div>
                  {meeting.outcome && (
                    <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded px-1.5 py-1">
                      {meeting.outcome}
                    </p>
                  )}
                  {meeting.nextStep && (
                    <p className="text-xs text-green-700 mt-0.5">→ {meeting.nextStep}</p>
                  )}
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
