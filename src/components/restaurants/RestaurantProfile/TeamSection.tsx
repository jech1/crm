"use client"

/**
 * TeamSection — shows the restaurant's primary rep, supporting reps,
 * and credit attribution percentages.
 *
 * canManageTeam is true for ADMIN and the primary rep. When true:
 *   - "Add supporting rep" form is shown (uses availableReps dropdown)
 *   - Remove (×) button appears on each supporting rep row
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Crown, Star, Percent, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface RepUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

interface SupportingRep {
  id: string
  userId: string
  addedAt: Date | string
  user: RepUser
}

interface CreditAttribution {
  id: string
  userId: string
  percentage: number
  note: string | null
  user: { id: string; name: string; avatarUrl: string | null }
}

interface AvailableRep {
  id: string
  name: string
}

interface TeamSectionProps {
  restaurantId: string
  primaryRep: RepUser | null
  supportingReps: SupportingRep[]
  creditAttributions: CreditAttribution[]
  /** True for ADMIN and the primary rep — can add and remove supporting reps */
  canManageTeam: boolean
  /** Active users who are not already on this restaurant's team */
  availableReps: AvailableRep[]
}

function Avatar({ user }: { user: { name: string; avatarUrl: string | null } }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="h-7 w-7 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-200">
      {user.name.charAt(0).toUpperCase()}
    </div>
  )
}

export function TeamSection({
  restaurantId,
  primaryRep,
  supportingReps,
  creditAttributions,
  canManageTeam,
  availableReps,
}: TeamSectionProps) {
  const router = useRouter()

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleRemoveSupportingRep(repUserId: string) {
    if (!confirm("Remove this supporting rep?")) return
    setRemovingId(repUserId)
    setRemoveError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: repUserId }),
      })
      if (res.ok || res.status === 204) {
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setRemoveError(data.error ?? "Failed to remove rep. Please try again.")
      }
    } catch {
      setRemoveError("Network error. Please try again.")
    } finally {
      setRemovingId(null)
    }
  }

  async function handleAddSupportingRep() {
    if (!selectedUserId) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      })
      if (res.ok) {
        setShowAddForm(false)
        setSelectedUserId("")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setAddError(data.error ?? "Failed to add rep. Please try again.")
      }
    } catch {
      setAddError("Network error. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  const hasCreditData = creditAttributions.length > 0

  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          Team
        </h2>
        {canManageTeam && !showAddForm && availableReps.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add rep
          </button>
        )}
      </div>

      {removeError && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2 mb-3">
          {removeError}
        </p>
      )}

      <div className="space-y-3">
        {/* Primary rep */}
        {primaryRep ? (
          <div className="flex items-center gap-2.5">
            <Avatar user={primaryRep} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{primaryRep.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{primaryRep.email}</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
              <Crown className="h-2.5 w-2.5" />
              Owner
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No primary rep assigned</p>
        )}

        {/* Supporting reps */}
        {supportingReps.length > 0 && (
          <div className="border-t dark:border-slate-700 pt-3">
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Supporting
            </p>
            <div className="space-y-2">
              {supportingReps.map((sr) => (
                <div key={sr.id} className="flex items-center gap-2.5 group">
                  <Avatar user={sr.user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{sr.user.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{sr.user.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200">
                    <Star className="h-2.5 w-2.5" />
                    Support
                  </span>
                  {canManageTeam && (
                    <button
                      onClick={() => handleRemoveSupportingRep(sr.userId)}
                      disabled={removingId === sr.userId}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-5 w-5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ml-1"
                      title="Remove supporting rep"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add supporting rep form */}
        {canManageTeam && showAddForm && (
          <div className="border-t dark:border-slate-700 pt-3">
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Add supporting rep
            </p>
            {addError && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md px-2 py-1.5 mb-2">
                {addError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={cn(
                  "flex-1 text-xs rounded-md border border-slate-200 dark:border-slate-600",
                  "bg-white dark:bg-slate-700 text-slate-900 dark:text-white",
                  "px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500",
                )}
              >
                <option value="">Select a rep…</option>
                {availableReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddSupportingRep}
                disabled={!selectedUserId || adding}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
                  "bg-green-600 text-white hover:bg-green-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {adding ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setSelectedUserId(""); setAddError(null) }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {supportingReps.length === 0 && !hasCreditData && !showAddForm && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-1">
            No supporting reps
          </p>
        )}

        {/* Credit attribution */}
        {hasCreditData && (
          <div className="border-t dark:border-slate-700 pt-3">
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Percent className="h-2.5 w-2.5" />
              Credit Split
            </p>
            <div className="space-y-1.5">
              {creditAttributions.map((ca) => (
                <div key={ca.id} className="flex items-center gap-2">
                  <Avatar user={ca.user} />
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{ca.user.name}</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">{ca.percentage}%</span>
                </div>
              ))}
            </div>
            {/* Visual bar */}
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
              {creditAttributions.map((ca, i) => (
                <div
                  key={ca.id}
                  style={{ width: `${ca.percentage}%` }}
                  className={cn(
                    "h-full",
                    i === 0 ? "bg-amber-400" : i === 1 ? "bg-blue-400" : "bg-slate-400"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
