"use client"

import { useState } from "react"
import Link from "next/link"
import { CompleteTaskModal } from "./CompleteTaskModal"
import { cn, formatDueDate, formatDate } from "@/lib/utils"
import { TASK_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/constants"
import { CheckCircle2, Circle, CheckCheck } from "lucide-react"
import type { Task, TaskOutcome } from "@prisma/client"

type TaskRow = Task & {
  restaurant: { id: string; name: string; city: string } | null
  assignedTo: { id: string; name: string }
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

interface TaskListProps {
  overdue: TaskRow[]
  dueToday: TaskRow[]
  upcoming: TaskRow[]
  recentlyCompleted: TaskRow[]
}

export function TaskList({ overdue, dueToday, upcoming, recentlyCompleted }: TaskListProps) {
  const [modalTask, setModalTask] = useState<TaskRow | null>(null)
  const total = overdue.length + dueToday.length + upcoming.length

  if (total === 0 && recentlyCompleted.length === 0) {
    return (
      <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-12 text-center">
        <CheckCheck className="h-10 w-10 text-green-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">No open tasks right now.</p>
      </div>
    )
  }

  return (
    <>
      {modalTask && (
        <CompleteTaskModal
          task={modalTask}
          open={true}
          onClose={() => setModalTask(null)}
        />
      )}

      <div className="space-y-6">
        {overdue.length > 0 && (
          <TaskGroup
            title={`Overdue (${overdue.length})`}
            tasks={overdue}
            variant="overdue"
            onComplete={setModalTask}
          />
        )}

        {dueToday.length > 0 && (
          <TaskGroup
            title={`Due Today (${dueToday.length})`}
            tasks={dueToday}
            variant="today"
            onComplete={setModalTask}
          />
        )}

        {upcoming.length > 0 && (
          <TaskGroup
            title={`Upcoming (${upcoming.length})`}
            tasks={upcoming}
            variant="default"
            onComplete={setModalTask}
          />
        )}

        {recentlyCompleted.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
              Completed — Last 14 Days ({recentlyCompleted.length})
            </h2>
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 divide-y dark:divide-slate-700">
              {recentlyCompleted.map((task) => (
                <CompletedTaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Open task group ────────────────────────────────────────────

function TaskGroup({
  title,
  tasks,
  variant,
  onComplete,
}: {
  title: string
  tasks: TaskRow[]
  variant: "overdue" | "today" | "default"
  onComplete: (task: TaskRow) => void
}) {
  return (
    <div>
      <h2
        className={cn(
          "text-xs font-semibold uppercase tracking-wide mb-3",
          variant === "overdue"
            ? "text-red-600"
            : variant === "today"
              ? "text-yellow-600"
              : "text-slate-500",
        )}
      >
        {title}
      </h2>
      <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 divide-y dark:divide-slate-700">
        {tasks.map((task) => (
          <OpenTaskRow key={task.id} task={task} variant={variant} onComplete={onComplete} />
        ))}
      </div>
    </div>
  )
}

// ─── Open task row ──────────────────────────────────────────────

function OpenTaskRow({
  task,
  variant,
  onComplete,
}: {
  task: TaskRow
  variant: "overdue" | "today" | "default"
  onComplete: (task: TaskRow) => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      {/* Complete button */}
      <button
        type="button"
        onClick={() => onComplete(task)}
        className="mt-0.5 shrink-0 text-slate-300 hover:text-green-500 transition-colors"
        title="Mark complete"
      >
        <Circle className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
            {task.restaurant && (
              <Link
                href={`/restaurants/${task.restaurant.id}`}
                className="text-xs text-green-700 hover:underline"
              >
                {task.restaurant.name}, {task.restaurant.city}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                PRIORITY_COLORS[task.priority],
              )}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span
              className={cn(
                "text-xs",
                variant === "overdue"
                  ? "text-red-500 font-medium"
                  : variant === "today"
                    ? "text-yellow-600 font-medium"
                    : "text-slate-400",
              )}
            >
              {task.dueDate ? formatDueDate(task.dueDate) : "No due date"}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{TASK_TYPE_LABELS[task.taskType]}</p>

        {task.notes && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{task.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─── Completed task row ─────────────────────────────────────────

function CompletedTaskRow({ task }: { task: TaskRow }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500 line-through">{task.title}</p>
            {task.restaurant && (
              <Link
                href={`/restaurants/${task.restaurant.id}`}
                className="text-xs text-green-700 hover:underline"
              >
                {task.restaurant.name}, {task.restaurant.city}
              </Link>
            )}
          </div>
          <span className="text-xs text-slate-400 shrink-0">
            {task.completedAt ? formatDate(task.completedAt) : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
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
        </div>

        {task.completionNotes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-700/50 rounded px-2 py-1">
            {task.completionNotes}
          </p>
        )}
      </div>
    </div>
  )
}
