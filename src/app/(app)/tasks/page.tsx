/**
 * Tasks / follow-up queue.
 *
 * Reps: see their own open + recently completed tasks.
 * Admins: see all tasks across all reps, with optional rep filter via ?repId=
 *
 * Server component fetches data; TasksPageClient handles create modal + rep filter.
 * TaskList + CompleteTaskModal are unchanged.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { TasksPageClient } from "@/components/tasks/TasksPageClient"
import { isPast, isToday, subDays } from "date-fns"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Tasks" }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ repId?: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const { repId } = await searchParams
  const isAdmin = user.role === "ADMIN"

  // Admins see all tasks (optionally filtered by repId); reps see only their own
  const assignedToFilter = isAdmin ? (repId || undefined) : user.id

  const [openTasks, recentlyCompleted, reps] = await Promise.all([
    db.task.findMany({
      where: { assignedToId: assignedToFilter, isCompleted: false },
      orderBy: { dueDate: "asc" },
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    db.task.findMany({
      where: {
        assignedToId: assignedToFilter,
        isCompleted: true,
        completedAt: { gte: subDays(new Date(), isAdmin ? 30 : 14) },
      },
      orderBy: { completedAt: "desc" },
      take: isAdmin ? 100 : 30,
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    // Fetch active reps for admin filter dropdown
    isAdmin
      ? db.user.findMany({
          where: { role: "SALES_REP", status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ])

  const overdue = openTasks.filter(
    (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)),
  )
  const dueToday = openTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)))
  const upcoming = openTasks.filter(
    (t) => !t.dueDate || (!isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))),
  )

  const description = isAdmin
    ? `${openTasks.length} open · ${overdue.length > 0 ? `${overdue.length} overdue` : "none overdue"} · team-wide`
    : `${openTasks.length} open · ${overdue.length > 0 ? `${overdue.length} overdue` : "none overdue"}`

  return (
    <div>
      <PageHeader title="Tasks" description={description} />
      <TasksPageClient
        overdue={overdue}
        dueToday={dueToday}
        upcoming={upcoming}
        recentlyCompleted={recentlyCompleted}
        isAdmin={isAdmin}
        reps={reps}
        currentRepId={repId}
      />
    </div>
  )
}
