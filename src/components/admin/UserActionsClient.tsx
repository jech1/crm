"use client"

/**
 * Inline action buttons for a user row on the admin Users page.
 * Calls PATCH /api/admin/users/[id] to update status or role.
 * Refreshes the page on success so the server component re-fetches.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Ban, ShieldCheck, UserCheck, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "PENDING" | "ACTIVE" | "DISABLED"
type Role = "ADMIN" | "SALES_REP" | "CONNECTOR"

interface Props {
  userId: string
  currentStatus: Status
  currentRole: Role
  isLastAdmin: boolean
}

export function UserActionsClient({ userId, currentStatus, currentRole, isLastAdmin }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patch(payload: { status?: Status; role?: Role }, label: string) {
    setLoading(label)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {error && (
        <span className="text-xs text-red-500 mr-1">{error}</span>
      )}

      {/* Approve (PENDING → ACTIVE) */}
      {currentStatus === "PENDING" && (
        <ActionButton
          onClick={() => patch({ status: "ACTIVE" }, "approve")}
          loading={loading === "approve"}
          variant="success"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Approve"
        />
      )}

      {/* Re-activate (DISABLED → ACTIVE) */}
      {currentStatus === "DISABLED" && (
        <ActionButton
          onClick={() => patch({ status: "ACTIVE" }, "activate")}
          loading={loading === "activate"}
          variant="success"
          icon={<UserCheck className="h-3.5 w-3.5" />}
          label="Re-activate"
        />
      )}

      {/* Disable (ACTIVE / PENDING → DISABLED) */}
      {currentStatus !== "DISABLED" && (
        <ActionButton
          onClick={() => patch({ status: "DISABLED" }, "disable")}
          loading={loading === "disable"}
          disabled={isLastAdmin}
          title={isLastAdmin ? "Cannot disable the last active admin" : undefined}
          variant="danger"
          icon={<Ban className="h-3.5 w-3.5" />}
          label="Disable"
        />
      )}

      {/* Promote to Admin */}
      {currentRole !== "ADMIN" && currentStatus === "ACTIVE" && (
        <ActionButton
          onClick={() => patch({ role: "ADMIN" }, "promote")}
          loading={loading === "promote"}
          variant="ghost"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="Make Admin"
        />
      )}

      {/* Demote to Sales Rep */}
      {currentRole === "ADMIN" && (
        <ActionButton
          onClick={() => patch({ role: "SALES_REP" }, "demote")}
          loading={loading === "demote"}
          disabled={isLastAdmin}
          title={isLastAdmin ? "Cannot demote the last active admin" : undefined}
          variant="ghost"
          icon={<ChevronDown className="h-3.5 w-3.5" />}
          label="Remove Admin"
        />
      )}
    </div>
  )
}

function ActionButton({
  onClick,
  loading,
  disabled,
  title,
  variant,
  icon,
  label,
}: {
  onClick: () => void
  loading: boolean
  disabled?: boolean
  title?: string
  variant: "success" | "danger" | "ghost"
  icon: React.ReactNode
  label: string
}) {
  const base = "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  const styles = {
    success: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
    danger: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={cn(base, styles[variant])}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  )
}
