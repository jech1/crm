"use client"

/**
 * RestaurantTaskSection — tasks panel on the restaurant profile.
 *
 * Shows open tasks with complete button, recently completed tasks with outcome badges,
 * and an "Add Task" button (visible when canLog is true).
 *
 * Task completion behavior is unchanged — still uses CompleteTaskModal.
 * Task creation uses the new CreateTaskModal with pre-filled restaurantId.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CompleteTaskModal } from "./CompleteTaskModal"
import { CreateTaskModal } from "./CreateTaskModal"
import { cn, formatDueDate, formatDate } from "@/lib/utils"
import { TASK_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/constants"
import { Circle, CheckCircle2, ClipboardList, Plus } from "lucide-react"
import { isPast, isToday } from "date-fns"
import type { Task, TaskOutcome } from "@prisma/client"

type TaskWithRep = Task & {
  assignedTo: { id: string; name: string; email: string; avatarUrl: string | null }
}

const OUTCOME_LABELS: Record<TaskOutcome, string> = {
  SPOKE_TO_OWNER: "Spoke to owner",
  SPOKE_TO_MANAGER: "Spoke to manager",
  SPOKE_TO_BUYER: "Spoke to buyer",
  LEFT_VOICEMAIL: "Left voicemail",
  NO_ANSWER: "No answer",
  MEETING_SCHEDULED: "Meeting scheduled",
  SAMPLE_REQUESTED: "Sample requested",
  PRICING_SENT: "Pricing sent",
  REVISITED: "Revisited",
  NOTE_UPDATED: "Note updated",
  OTHER: "Other",
}

const OUTCOME_COLORS: Record<TaskOutcome, string> = {
  SPOKE_TO_OWNER: "bg-green-100 text-green-700",
  SPOKE_TO_MANAGER: "bg-green-100 text-green-700",
  SPOKE_TO_BUYER: "bg-emerald-100 text-emerald-700",
  LEFT_VOICEMAIL: "bg-yellow-100 text-yellow-700",
  NO_ANSWER: "bg-slate-100 text-slate-500",
  MEETING_SCHEDULED: "bg-blue-100 text-blue-700",
  SAMPLE_REQUESTED: "bg-indigo-100 text-indigo-700",
  PRICING_SENT: "bg-violet-100 text-violet-700",
  REVISITED: "bg-orange-100 text-orange-700",
  NOTE_UPDATED: "bg-slate-100 text-slate-600",
  OTHER: "bg-slate-100 text-slate-500",
}

interface RestaurantTaskSectionProps {
  tasks: TaskWithRep[]
  restaurantId: string
  restaurantName: string
  canLog: boolean
}

export function RestaurantTaskSection({
  tasks,
  restaurantId,
  restaurantName,
  canLog,
}: RestaurantTaskSectionProps) {
  const [completeTask, setCompleteTask] = useState<TaskWithRep | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const open = tasks.filter((t) => !t.isCompleted)
  const completed = tasks.filter((t) => t.isCompleted).slice(0, 10)

  // Always render when canLog (so the Add Task button is visible even with no tasks)
  if (tasks.length === 0 && !canLog) return null

  return (
    <>
      {completeTask && (
        <CompleteTaskModal
          task={{ ...completeTask, restaurant: null }}
          open={true}
          onClose={() => setCompleteTask(null)}
        />
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
      />

      <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Tasks
            {open.length > 0 && (
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                ({open.length} open{completed.length > 0 ? `, ${completed.length} done` : ""})
              </span>
            )}
          </h2>
          {canLog && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 px-2 py-1 rounded-md transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Task
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
            No tasks yet. Add one to start tracking follow-ups.
          </p>
        ) : (
          <div className="space-y-0 divide-y dark:divide-slate-700">
            {/* Open tasks */}
            {open.map((task) => {
              const isOverdue =
                task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
              const isToday_ = task.dueDate && isToday(new Date(task.dueDate))
              return (
                <div key={task.id} className="flex items-start gap-2.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => setCompleteTask(task)}
                    className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600 hover:text-green-500 transition-colors"
                    title="Mark complete"
                  >
                    <Circle className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-800 dark:text-slate-200">{task.title}</p>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                          PRIORITY_COLORS[task.priority],
                        )}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{TASK_TYPE_LABELS[task.taskType]}</span>
                      {task.dueDate && (
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            isOverdue
                              ? "text-red-500"
                              : isToday_
                                ? "text-yellow-600"
                                : "text-slate-400",
                          )}
                        >
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">· {task.assignedTo.name}</span>
                    </div>
                    {task.notes && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">{task.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Completed tasks */}
            {completed.map((task) => (
              <div key={task.id} className="flex items-start gap-2.5 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-400 dark:text-slate-500 line-through">{task.title}</p>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 shrink-0">
                      {task.completedAt ? formatDate(task.completedAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">{TASK_TYPE_LABELS[task.taskType]}</span>
                    {task.outcomeType && (
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          OUTCOME_COLORS[task.outcomeType],
                        )}
                      >
                        {OUTCOME_LABELS[task.outcomeType]}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-300">· {task.assignedTo.name}</span>
                  </div>
                  {task.completionNotes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-0.5">
                      {task.completionNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
