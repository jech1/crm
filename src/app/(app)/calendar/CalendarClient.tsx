"use client"

/**
 * CalendarClient — thin client-side wrapper that lazy-loads CalendarView.
 *
 * `ssr: false` is only valid inside client components in Next.js App Router.
 * The server page (page.tsx) imports this component directly; the actual
 * FullCalendar grid is loaded lazily in the browser.
 */

import dynamic from "next/dynamic"
import type { CalendarMeeting } from "./CalendarView"

const CalendarView = dynamic(
  () => import("./CalendarView").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-white p-4 h-[500px] animate-pulse bg-slate-50" />
    ),
  },
)

interface CalendarClientProps {
  meetings: CalendarMeeting[]
  isAdmin: boolean
  currentUserId: string
}

export function CalendarClient({ meetings, isAdmin, currentUserId }: CalendarClientProps) {
  return <CalendarView meetings={meetings} isAdmin={isAdmin} currentUserId={currentUserId} />
}
