/**
 * Follow-up queue widget.
 * Shows tasks that are overdue or due within 3 days.
 * Color coded: red = overdue, yellow = due today, slate = upcoming.
 */

import Link from "next/link"
import { isPast, isToday } from "date-fns"
import { formatDueDate } from "@/lib/utils"
import { TASK_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Task, Restaurant } from "@prisma/client"
import type { RepSummary, RestaurantSummary } from "@/types"

interface FollowUpQueueProps {
  tasks: (Task & {
    restaurant: RestaurantSummary | null
    assignedTo: RepSummary
  })[]
}

export function FollowUpQueue({ tasks }: FollowUpQueueProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Follow-Up Queue</h2>
        <Link href="/tasks" className="text-xs text-green-600 dark:text-green-400 hover:underline">
          View all
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No follow-ups due. Good work.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const due = new Date(task.dueDate)
            const isOverdue = isPast(due) && !isToday(due)
            const isDueToday = isToday(due)

            return (
              <li key={task.id} className="flex items-start gap-3">
                {/* Status dot */}
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    isOverdue ? "bg-red-500" : isDueToday ? "bg-yellow-400" : "bg-slate-300",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-900 dark:text-white truncate">
                      {task.restaurant ? (
                        <Link
                          href={`/restaurants/${task.restaurant.id}`}
                          className="hover:text-green-700"
                        >
                          {task.restaurant.name}
                        </Link>
                      ) : (
                        task.title
                      )}
                    </p>
                    <span
                      className={cn(
                        "text-xs shrink-0",
                        isOverdue ? "text-red-500 font-medium" : isDueToday ? "text-yellow-600" : "text-slate-400",
                      )}
                    >
                      {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {TASK_TYPE_LABELS[task.taskType]}
                    {task.restaurant && ` — ${task.title}`}
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
