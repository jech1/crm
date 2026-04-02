"use client"

/**
 * CreateTaskModal — reusable task creation modal.
 *
 * Two modes:
 *   1. Restaurant-context (restaurantId + restaurantName provided)
 *      → restaurant field is locked/pre-filled, opens from restaurant profile
 *   2. Global (no restaurantId)
 *      → fetches accessible restaurants and shows a select dropdown
 *
 * On success: calls router.refresh() so the parent server component re-fetches.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, ClipboardList } from "lucide-react"

const TASK_TYPE_OPTIONS = [
  { value: "CALL",            label: "Call Owner / Buyer" },
  { value: "REVISIT",         label: "Revisit Restaurant" },
  { value: "SEND_PRICING",    label: "Send Pricing Sheet" },
  { value: "BRING_SAMPLE",    label: "Drop Off Samples" },
  { value: "ASK_FOR_BUYER",   label: "Ask for Buyer / Decision Maker" },
  { value: "CONFIRM_MEETING", label: "Confirm Meeting" },
  { value: "UPDATE_NOTE",     label: "Update Account Notes" },
  { value: "OTHER",           label: "Other Follow-Up" },
]

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH",   label: "High" },
  { value: "URGENT", label: "Urgent" },
]

interface Props {
  open: boolean
  onClose: () => void
  /** If provided, restaurant is pre-filled and locked */
  restaurantId?: string
  restaurantName?: string
}

export function CreateTaskModal({ open, onClose, restaurantId, restaurantName }: Props) {
  const router = useRouter()

  const [restaurants, setRestaurants] = useState<{ id: string; name: string; city: string }[]>([])
  const [title, setTitle] = useState("")
  const [taskType, setTaskType] = useState("CALL")
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(restaurantId ?? "")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch accessible restaurants when opening in global mode (no pre-filled restaurant)
  useEffect(() => {
    if (!open || restaurantId) return
    fetch("/api/restaurants?limit=200")
      .then((r) => r.json())
      .then((json) => {
        // Response shape: { data: { data: Restaurant[], total, ... } }
        const list = json?.data?.data ?? []
        setRestaurants(list)
      })
      .catch(() => {})
  }, [open, restaurantId])

  // Reset form every time the modal opens
  useEffect(() => {
    if (!open) return
    setTitle("")
    setTaskType("CALL")
    setSelectedRestaurantId(restaurantId ?? "")
    setDueDate(new Date().toISOString().split("T")[0])
    setPriority("MEDIUM")
    setNotes("")
    setError(null)
  }, [open, restaurantId])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError("Task title is required"); return }
    if (!dueDate) { setError("Due date is required"); return }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          taskType,
          dueDate,
          priority,
          notes: notes.trim() || undefined,
          restaurantId: restaurantId || selectedRestaurantId || undefined,
        }),
      })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(json.error ?? "Failed to create task")
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-semibold text-slate-900">New Task</h2>
            {restaurantName && (
              <span className="text-xs text-slate-400 truncate max-w-[140px]">
                — {restaurantName}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Task *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call owner about avocado pricing"
              autoFocus
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Task type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Type *</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {TASK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Restaurant — locked if pre-filled, select otherwise */}
          {restaurantId ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Restaurant</label>
              <div className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600">
                {restaurantName}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Restaurant</label>
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— No restaurant (standalone task) —</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} · {r.city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Due date + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ask for Maria — spoke to her last time about herb pricing"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
