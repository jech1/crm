"use client"

/**
 * TasksPageClient — client wrapper for the /tasks page.
 *
 * Holds modal state for task creation and the admin rep filter.
 * TaskList and CompleteTaskModal are kept entirely unchanged.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { TaskList } from "./TaskList"
import { CreateTaskModal } from "./CreateTaskModal"
import type { Task, TaskOutcome } from "@prisma/client"

type TaskRow = Task & {
  restaurant: { id: string; name: string; city: string } | null
  assignedTo: { id: string; name: string }
}

interface Props {
  overdue: TaskRow[]
  dueToday: TaskRow[]
  upcoming: TaskRow[]
  recentlyCompleted: TaskRow[]
  isAdmin: boolean
  reps: { id: string; name: string }[]
  currentRepId?: string
}

export function TasksPageClient({
  overdue,
  dueToday,
  upcoming,
  recentlyCompleted,
  isAdmin,
  reps,
  currentRepId,
}: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <div className="flex items-center justify-between mb-5">
        {/* Admin rep filter */}
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">Filter by rep:</label>
            <select
              value={currentRepId ?? ""}
              onChange={(e) => {
                const v = e.target.value
                router.push(v ? `/tasks?repId=${v}` : "/tasks")
              }}
              className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All reps</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div />
        )}

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      <TaskList
        overdue={overdue}
        dueToday={dueToday}
        upcoming={upcoming}
        recentlyCompleted={recentlyCompleted}
      />
    </>
  )
}
