"use client"

/**
 * TerritoriesClient — handles all interactive territory management:
 * create, edit, delete, and bulk recalculate.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, RefreshCw, MapPin } from "lucide-react"
import { TerritoryFormModal } from "./TerritoryFormModal"
import { cn } from "@/lib/utils"

type Rep = { id: string; name: string }

type Territory = {
  id: string
  name: string
  repId: string | null
  cities: string[]
  zipCodes: string[]
  rep: { id: string; name: string; email: string } | null
  _count: { restaurants: number }
}

interface Props {
  territories: Territory[]
  reps: Rep[]
  totalRestaurants: number
  unassignedCount: number
}

export function TerritoriesClient({
  territories: initialTerritories,
  reps,
  totalRestaurants,
  unassignedCount: initialUnassigned,
}: Props) {
  const router = useRouter()
  const [territories, setTerritories] = useState(initialTerritories)
  const [unassigned, setUnassigned] = useState(initialUnassigned)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const assigned = totalRestaurants - unassigned
  const coveragePct = totalRestaurants > 0
    ? Math.round((assigned / totalRestaurants) * 100)
    : 0

  async function handleCreate(data: { name: string; repId: string | null; cities: string[]; zipCodes: string[] }) {
    const res = await fetch("/api/admin/territories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const text = await res.text()
    const json = text ? JSON.parse(text) : {}
    if (!res.ok) throw new Error(json.error ?? "Failed to create territory")
    setTerritories((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
    router.refresh()
  }

  async function handleEdit(data: { name: string; repId: string | null; cities: string[]; zipCodes: string[] }) {
    if (!editingTerritory) return
    const res = await fetch(`/api/admin/territories/${editingTerritory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const text = await res.text()
    const json = text ? JSON.parse(text) : {}
    if (!res.ok) throw new Error(json.error ?? "Failed to update territory")
    setTerritories((prev) =>
      prev.map((t) => (t.id === editingTerritory.id ? json.data : t))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this territory? Restaurants assigned to it will become unassigned.")) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/territories/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? "Failed to delete")
        return
      }
      const removed = territories.find((t) => t.id === id)
      setTerritories((prev) => prev.filter((t) => t.id !== id))
      if (removed) setUnassigned((n) => n + removed._count.restaurants)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRecalculate() {
    setRecalculating(true)
    setRecalcMsg(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/territories/recalculate", { method: "POST" })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(json.error ?? "Recalculate failed")
      setRecalcMsg(json.data?.message ?? "Done.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalculate failed")
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <>
      {createOpen && (
        <TerritoryFormModal
          mode="create"
          reps={reps}
          onSave={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editingTerritory && (
        <TerritoryFormModal
          mode="edit"
          initial={editingTerritory}
          reps={reps}
          onSave={handleEdit}
          onClose={() => setEditingTerritory(null)}
        />
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating || territories.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", recalculating && "animate-spin")} />
            {recalculating ? "Recalculating…" : "Recalculate All"}
          </button>
          {recalcMsg && <span className="text-xs text-green-600 font-medium">{recalcMsg}</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Territory
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{territories.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Territories</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{assigned}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Restaurants assigned ({coveragePct}%)
          </p>
        </div>
        <div className={cn(
          "rounded-xl border p-4 text-center",
          unassigned > 0 ? "border-yellow-200 bg-yellow-50" : "bg-white",
        )}>
          <p className={cn("text-2xl font-bold", unassigned > 0 ? "text-yellow-600" : "text-slate-900")}>
            {unassigned}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Unassigned</p>
        </div>
      </div>

      {/* Territory cards */}
      {territories.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">No territories yet</p>
          <p className="text-xs text-slate-400 mb-4">
            Create territories to organize your market by geography and assign reps to coverage areas.
            Restaurants will auto-map to the correct territory when added.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create first territory
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map((t) => (
            <TerritoryCard
              key={t.id}
              territory={t}
              totalRestaurants={totalRestaurants}
              deleting={deletingId === t.id}
              onEdit={() => setEditingTerritory(t)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function TerritoryCard({
  territory: t,
  totalRestaurants,
  deleting,
  onEdit,
  onDelete,
}: {
  territory: Territory
  totalRestaurants: number
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const coveragePct = totalRestaurants > 0
    ? Math.round((t._count.restaurants / totalRestaurants) * 100)
    : 0

  return (
    <div className="rounded-xl border bg-white p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{t.name}</h3>
          {t.rep ? (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{t.rep.name}</p>
          ) : (
            <p className="text-xs text-slate-400 italic mt-0.5">No rep assigned</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <div className="text-right mr-2">
            <p className="text-xl font-bold text-slate-900">{t._count.restaurants}</p>
            <p className="text-[10px] text-slate-400 leading-none">restaurants</p>
          </div>
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cities */}
      {t.cities.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Cities</p>
          <div className="flex flex-wrap gap-1">
            {t.cities.slice(0, 8).map((c) => (
              <span key={c} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                {c}
              </span>
            ))}
            {t.cities.length > 8 && (
              <span className="text-[10px] text-slate-400">+{t.cities.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* ZIP codes */}
      {t.zipCodes.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">ZIP Codes</p>
          <p className="text-xs text-slate-600">
            {t.zipCodes.slice(0, 8).join(", ")}
            {t.zipCodes.length > 8 && (
              <span className="text-slate-400"> +{t.zipCodes.length - 8} more</span>
            )}
          </p>
        </div>
      )}

      {/* Coverage bar */}
      {totalRestaurants > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] text-slate-400">Coverage</p>
            <p className="text-[10px] text-slate-500 font-medium">{coveragePct}%</p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Auto-map hint if no rules defined */}
      {t.cities.length === 0 && t.zipCodes.length === 0 && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">
          No cities or ZIPs defined — restaurants won&apos;t auto-map here.
        </p>
      )}
    </div>
  )
}
