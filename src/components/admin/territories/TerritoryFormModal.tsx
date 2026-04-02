"use client"

/**
 * TerritoryFormModal — handles both create and edit modes.
 * Cities and ZIP codes are entered as comma/newline-separated text.
 */

import { useState, useEffect } from "react"
import { X, MapPin } from "lucide-react"
import { parseListInput } from "@/lib/territories/autoAssign"

type Rep = { id: string; name: string }

type TerritoryFormData = {
  name: string
  repId: string
  citiesRaw: string  // raw textarea value
  zipCodesRaw: string
}

interface Props {
  mode: "create" | "edit"
  initial?: {
    id: string
    name: string
    repId: string | null
    cities: string[]
    zipCodes: string[]
  }
  reps: Rep[]
  onSave: (data: { name: string; repId: string | null; cities: string[]; zipCodes: string[] }) => Promise<void>
  onClose: () => void
}

export function TerritoryFormModal({ mode, initial, reps, onSave, onClose }: Props) {
  const [form, setForm] = useState<TerritoryFormData>({
    name: initial?.name ?? "",
    repId: initial?.repId ?? "",
    citiesRaw: initial?.cities.join(", ") ?? "",
    zipCodesRaw: initial?.zipCodes.join(", ") ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reset when re-opened for different territory
    setForm({
      name: initial?.name ?? "",
      repId: initial?.repId ?? "",
      citiesRaw: initial?.cities.join(", ") ?? "",
      zipCodesRaw: initial?.zipCodes.join(", ") ?? "",
    })
    setError(null)
  }, [initial?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Territory name is required"); return }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: form.name.trim(),
        repId: form.repId || null,
        cities: parseListInput(form.citiesRaw),
        zipCodes: parseListInput(form.zipCodesRaw),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              {mode === "create" ? "New Territory" : `Edit — ${initial?.name}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Territory Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Downtown LA, East Side, Midtown"
              autoFocus
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Assigned Rep</label>
            <select
              value={form.repId}
              onChange={(e) => setForm((f) => ({ ...f, repId: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— Unassigned —</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Cities / Towns
              <span className="font-normal text-slate-400 ml-1">(comma-separated)</span>
            </label>
            <textarea
              value={form.citiesRaw}
              onChange={(e) => setForm((f) => ({ ...f, citiesRaw: e.target.value }))}
              placeholder="e.g. Los Angeles, Santa Monica, Culver City"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <p className="text-[11px] text-slate-400">
              Restaurants matching these cities will auto-map to this territory.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              ZIP Codes
              <span className="font-normal text-slate-400 ml-1">(comma-separated, takes priority over city)</span>
            </label>
            <textarea
              value={form.zipCodesRaw}
              onChange={(e) => setForm((f) => ({ ...f, zipCodesRaw: e.target.value }))}
              placeholder="e.g. 90001, 90002, 90210"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : mode === "create" ? "Create Territory" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
