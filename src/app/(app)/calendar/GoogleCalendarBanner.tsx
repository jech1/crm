"use client"

/**
 * GoogleCalendarBanner — Google Calendar sync status on the calendar page.
 *
 * Renders one of four states:
 *   connected      — sync is active, green
 *   expired        — tokens revoked/expired, amber reconnect prompt
 *   disconnected   — never connected or cleanly disconnected, gray
 *   not-configured — GOOGLE_* env vars missing (dev/staging only), muted warning
 *
 * State is derived from DB on the server (isConnected, isExpired props) and
 * kept in local React state so Connect/Disconnect actions update instantly
 * without a full server round-trip.
 *
 * OAuth callback results are surfaced via ?google=<result> query params:
 *   connected | denied | error | not-configured
 */

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CalendarCheck, CalendarX, AlertTriangle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

type SyncState = "connected" | "expired" | "disconnected" | "not-configured"

interface GoogleCalendarBannerProps {
  isConnected: boolean
  isExpired: boolean
}

export function GoogleCalendarBanner({ isConnected, isExpired }: GoogleCalendarBannerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [syncState, setSyncState] = useState<SyncState>(() => {
    if (isConnected) return "connected"
    if (isExpired) return "expired"
    return "disconnected"
  })
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Surface OAuth callback results from the ?google= query param
  useEffect(() => {
    const result = searchParams.get("google")
    if (!result) return

    if (result === "connected") {
      setSyncState("connected")
      setToast("Google Calendar connected. New meetings you schedule will be added to your primary calendar.")
    } else if (result === "denied") {
      setToast("Google Calendar access was not granted. You can connect any time from this page.")
    } else if (result === "not-configured") {
      setSyncState("not-configured")
      setToast("Google Calendar isn't set up for this environment. Contact your admin.")
    } else if (result === "error") {
      setToast("Could not connect to Google Calendar. Please try again.")
    }

    // Clean up the query param without re-rendering the server component
    router.replace("/calendar", { scroll: false })
  }, [searchParams, router])

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Your existing CRM meetings won't be affected, but future meetings won't sync until you reconnect.")) return
    setDisconnecting(true)
    try {
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" })
      if (res.ok) {
        setSyncState("disconnected")
        setToast("Google Calendar disconnected.")
      } else {
        setToast("Disconnect failed. Please try again.")
      }
    } catch {
      setToast("Network error. Please try again.")
    } finally {
      setDisconnecting(false)
    }
  }

  function handleConnect() {
    window.location.href = "/api/auth/google/connect"
  }

  return (
    <div className="mb-4 space-y-2">
      {/* Toast */}
      {toast && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* State banner */}
      {syncState === "connected" && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-green-800 font-medium">
            <CalendarCheck className="h-4 w-4 shrink-0" />
            Google Calendar sync is active — meetings you create from now on will appear in your primary Google Calendar
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-4 shrink-0 text-green-700 hover:text-green-900 hover:bg-green-100 h-7 text-xs"
            disabled={disconnecting}
            onClick={handleDisconnect}
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      )}

      {syncState === "expired" && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-amber-800 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Your Google Calendar connection has expired — reconnect to resume syncing new meetings
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-4 shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 h-7 text-xs"
            onClick={handleConnect}
          >
            Reconnect
          </Button>
        </div>
      )}

      {syncState === "disconnected" && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <CalendarX className="h-4 w-4 shrink-0 text-slate-400" />
            Connect Google Calendar to automatically add new meetings to your primary calendar
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-4 shrink-0 h-7 text-xs"
            onClick={handleConnect}
          >
            Connect Google Calendar
          </Button>
        </div>
      )}

      {syncState === "not-configured" && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-400">
          <Settings className="h-3.5 w-3.5 shrink-0" />
          Google Calendar integration is not configured for this environment.
        </div>
      )}
    </div>
  )
}
