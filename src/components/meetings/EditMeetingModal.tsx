"use client"

/**
 * EditMeetingModal — edit title, date/time, duration, location, and notes
 * for an existing meeting.
 *
 * Usage:
 *   <EditMeetingModal meeting={...} trigger={<Button>Edit</Button>} />
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export interface EditMeetingData {
  id: string
  title: string
  scheduledAt: Date | string
  durationMins?: number | null
  location?: string | null
  notes?: string | null
}

interface EditMeetingModalProps {
  meeting: EditMeetingData
  trigger: React.ReactNode
  onSuccess?: () => void
}

/** Format a Date (or ISO string) to a value accepted by <input type="datetime-local"> */
function toDatetimeLocal(value: Date | string): string {
  const d = new Date(value)
  // Pad to YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditMeetingModal({ meeting, trigger, onSuccess }: EditMeetingModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(meeting.title)
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(meeting.scheduledAt))
  const [durationMins, setDurationMins] = useState(String(meeting.durationMins ?? ""))
  const [location, setLocation] = useState(meeting.location ?? "")
  const [notes, setNotes] = useState(meeting.notes ?? "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMins: durationMins ? parseInt(durationMins, 10) : undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (res.ok) {
        setOpen(false)
        onSuccess?.()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to update meeting.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset to current values on close
      setTitle(meeting.title)
      setScheduledAt(toDatetimeLocal(meeting.scheduledAt))
      setDurationMins(String(meeting.durationMins ?? ""))
      setLocation(meeting.location ?? "")
      setNotes(meeting.notes ?? "")
      setError(null)
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-slate-400" />
            Edit Meeting
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="em-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="em-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="em-date">
                Date &amp; Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="em-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="em-duration">Duration (min)</Label>
              <Input
                id="em-duration"
                type="number"
                min={5}
                max={480}
                placeholder="45"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="em-location">Location</Label>
              <Input
                id="em-location"
                placeholder="e.g. Restaurant, Zoom"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="em-notes">Notes</Label>
            <Textarea
              id="em-notes"
              placeholder="Preparation notes or agenda…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !title.trim()}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
