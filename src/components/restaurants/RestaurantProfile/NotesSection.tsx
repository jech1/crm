"use client"

/**
 * Notes section on the restaurant profile.
 * Displays notes with author + timestamp, and an inline add-note form.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatRelativeTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText } from "lucide-react"
import type { Note } from "@prisma/client"
import type { RepSummary } from "@/types"

interface NotesSectionProps {
  notes: (Note & { author: RepSummary })[]
  restaurantId: string
}

export function NotesSection({ notes, restaurantId }: NotesSectionProps) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        setBody("")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to save note. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Notes ({notes.length})</h2>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="mb-5">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2 mb-2">{error}</p>
        )}
        <Textarea
          placeholder="Add a note about this restaurant…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <div className="flex justify-end mt-2">
          <Button type="submit" size="sm" disabled={!body.trim() || saving}>
            {saving ? "Saving…" : "Add Note"}
          </Button>
        </div>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="h-7 w-7 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No notes yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">{note.author.name}</span>
                <span className="text-xs text-slate-400">{formatRelativeTime(note.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
