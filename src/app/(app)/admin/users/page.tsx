/**
 * Admin — User Management.
 *
 * Shows pending users first (awaiting approval), then all active/disabled users.
 * Admins can approve, disable, re-activate, and promote users.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { formatDate, cn, initials } from "@/lib/utils"
import { UserCog, Clock, CheckCircle2, Ban, Shield, User } from "lucide-react"
import type { Metadata } from "next"
import { UserActionsClient } from "@/components/admin/UserActionsClient"

export const metadata: Metadata = { title: "Users" }

export default async function UsersPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const me = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!me || me.role !== "ADMIN") redirect("/dashboard")

  const users = await db.user.findMany({
    orderBy: [{ status: "asc" }, { role: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          assignedRestaurants: true,
          visits: true,
          meetings: true,
        },
      },
    },
  })

  const pending = users.filter((u) => u.status === "PENDING")
  const active = users.filter((u) => u.status === "ACTIVE")
  const disabled = users.filter((u) => u.status === "DISABLED")

  const activeAdminCount = active.filter((u) => u.role === "ADMIN").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`${users.length} total · ${pending.length} pending · ${active.length} active`}
      />

      {/* Pending approval */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Pending Approval ({pending.length})
            </h2>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden divide-y divide-amber-100">
            {pending.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={me.id}
                activeAdminCount={activeAdminCount}
                highlight
              />
            ))}
          </div>
        </section>
      )}

      {/* Active users */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Active ({active.length})
          </h2>
        </div>
        <div className="rounded-xl border bg-white overflow-hidden divide-y">
          {active.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No active users</p>
          ) : (
            active.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={me.id}
                activeAdminCount={activeAdminCount}
              />
            ))
          )}
        </div>
      </section>

      {/* Disabled users */}
      {disabled.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Ban className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-500">
              Disabled ({disabled.length})
            </h2>
          </div>
          <div className="rounded-xl border bg-white overflow-hidden divide-y opacity-60">
            {disabled.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={me.id}
                activeAdminCount={activeAdminCount}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// UserRow — one row per user with inline action buttons
// ─────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  SALES_REP: "bg-green-100 text-green-700",
  CONNECTOR: "bg-blue-100 text-blue-700",
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SALES_REP: "Sales Rep",
  CONNECTOR: "Connector",
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  DISABLED: "bg-slate-100 text-slate-500",
}

function UserRow({
  user,
  currentUserId,
  activeAdminCount,
  highlight = false,
}: {
  user: {
    id: string
    name: string
    email: string
    role: string
    status: string
    createdAt: Date
    _count: { assignedRestaurants: number; visits: number; meetings: number }
  }
  currentUserId: string
  activeAdminCount: number
  highlight?: boolean
}) {
  const isMe = user.id === currentUserId
  const isLastAdmin = user.role === "ADMIN" && activeAdminCount <= 1

  return (
    <div className={cn("px-5 py-4 flex items-center gap-4", highlight && "bg-amber-50/50")}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
        {initials(user.name)}
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          {isMe && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              you
            </span>
          )}
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", ROLE_STYLES[user.role])}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", STATUS_STYLES[user.status])}>
            {user.status.toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
        <p className="text-[10px] text-slate-300 mt-0.5">Joined {formatDate(user.createdAt)}</p>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-center">
        <div>
          <p className="text-sm font-semibold text-slate-900">{user._count.assignedRestaurants}</p>
          <p className="text-[10px] text-slate-400">accounts</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{user._count.visits}</p>
          <p className="text-[10px] text-slate-400">visits</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{user._count.meetings}</p>
          <p className="text-[10px] text-slate-400">meetings</p>
        </div>
      </div>

      {/* Actions (client component) */}
      {!isMe && (
        <UserActionsClient
          userId={user.id}
          currentStatus={user.status as "PENDING" | "ACTIVE" | "DISABLED"}
          currentRole={user.role as "ADMIN" | "SALES_REP" | "CONNECTOR"}
          isLastAdmin={isLastAdmin}
        />
      )}
    </div>
  )
}
