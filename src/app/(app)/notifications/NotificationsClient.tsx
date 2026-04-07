"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: Date | string
}

interface Props {
  notifications: Notification[]
}

export function NotificationsClient({ notifications: initial }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initial)
  const [markingAll, setMarkingAll] = useState(false)

  const unread = notifications.filter((n) => !n.isRead)

  async function markAllRead() {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok || res.status === 204) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        router.refresh()
      }
    } finally {
      setMarkingAll(false)
    }
  }

  async function markRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null)
    // Revert if request failed so state stays consistent with server
    if (!res || (!res.ok && res.status !== 204)) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      )
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 px-5 py-12 text-center">
        <Bell className="h-8 w-8 text-slate-200 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet.</p>
      </div>
    )
  }

  return (
    <div>
      {unread.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 divide-y dark:divide-slate-700">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-4 px-5 py-4 transition-colors",
              !n.isRead && "bg-blue-50/40 dark:bg-blue-900/10",
            )}
            onClick={() => { if (!n.isRead) markRead(n.id) }}
          >
            <div
              className={cn(
                "mt-0.5 shrink-0 w-2 h-2 rounded-full",
                n.isRead ? "bg-transparent" : "bg-blue-500",
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white">{n.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatRelativeTime(n.createdAt)}</p>
            </div>
            {n.link && (
              <Link
                href={n.link}
                className="shrink-0 text-slate-400 hover:text-green-600"
                title="View"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
