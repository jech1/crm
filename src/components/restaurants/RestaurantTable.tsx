"use client"

/**
 * Restaurant list table.
 *
 * When `isAdmin` is true a checkbox column and floating bulk-action
 * toolbar are shown (admin-only bulk operations: assign rep, change
 * stage, archive).  For non-admin users the table behaves exactly
 * as before.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"
import { StageBadge } from "./StageBadge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGES_ORDERED } from "@/lib/constants"
import type { RestaurantListItem } from "@/types"

interface Rep {
  id: string
  name: string
}

interface RestaurantTableProps {
  restaurants: RestaurantListItem[]
  isAdmin?: boolean
  reps?: Rep[]
}

export function RestaurantTable({
  restaurants,
  isAdmin = false,
  reps = [],
}: RestaurantTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (restaurants.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-500">
        No restaurants found. Try adjusting your filters.
      </div>
    )
  }

  // ── Selection helpers ─────────────────────────────────────────────

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === restaurants.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(restaurants.map((r) => r.id)))
    }
  }

  const allSelected = selected.size === restaurants.length && restaurants.length > 0
  const someSelected = selected.size > 0 && !allSelected

  // ── Bulk action helper ────────────────────────────────────────────

  async function applyBulk(payload: {
    action: "assign" | "stage" | "archive"
    repId?: string
    stage?: string
  }) {
    if (selected.size === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/restaurants/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], ...payload }),
      })
      if (res.ok) {
        setSelected(new Set())
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Bulk action failed.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* ── Bulk toolbar ──────────────────────────────────────────── */}
      {isAdmin && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50 border rounded-lg text-sm">
          <span className="font-medium text-slate-700 shrink-0">
            {selected.size} selected
          </span>

          {error && (
            <span className="text-xs text-red-600 shrink-0">{error}</span>
          )}

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Assign rep */}
            <Select
              disabled={submitting}
              onValueChange={(repId) => applyBulk({ action: "assign", repId })}
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Assign rep…" />
              </SelectTrigger>
              <SelectContent>
                {reps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Change stage */}
            <Select
              disabled={submitting}
              onValueChange={(stage) => applyBulk({ action: "stage", stage })}
            >
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder="Change stage…" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES_ORDERED.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PIPELINE_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Archive */}
            <Button
              size="sm"
              variant="destructive"
              disabled={submitting}
              className="h-8 text-xs"
              onClick={() => {
                if (confirm(`Archive ${selected.size} restaurant${selected.size > 1 ? "s" : ""}? They will no longer appear in the list.`)) {
                  applyBulk({ action: "archive" })
                }
              }}
            >
              Archive
            </Button>

            {/* Clear */}
            <Button
              size="sm"
              variant="ghost"
              disabled={submitting}
              className="h-8 text-xs"
              onClick={() => setSelected(new Set())}
            >
              ✕ Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              {isAdmin && (
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    // indeterminate state not natively supported in shadcn Checkbox
                    // but visually fine for MVP
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-slate-600">Restaurant</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Stage</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">City</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Assigned Rep</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Score</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Visits</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {restaurants.map((r) => (
              <tr
                key={r.id}
                className={`hover:bg-slate-50 transition-colors ${
                  isAdmin && selected.has(r.id) ? "bg-green-50" : ""
                }`}
              >
                {isAdmin && (
                  <td
                    className="px-4 py-3 w-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label={`Select ${r.name}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/restaurants/${r.id}`}
                    className="font-medium text-slate-900 hover:text-green-700"
                  >
                    {r.name}
                  </Link>
                  {r.phone && <p className="text-xs text-slate-400 mt-0.5">{r.phone}</p>}
                </td>
                <td className="px-4 py-3">
                  <StageBadge stage={r.pipelineStage} />
                </td>
                <td className="px-4 py-3 text-slate-600">{r.city}</td>
                <td className="px-4 py-3">
                  {r.rep ? (
                    <span className="text-slate-700">{r.rep.name}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${r.opportunityScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{r.opportunityScore}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r._count.visits}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {formatRelativeTime(r.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
