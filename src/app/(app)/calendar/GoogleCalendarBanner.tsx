"use client"

/**
 * GoogleCalendarBanner — shows Google Calendar sync status on the calendar page.
 *
 * Connected state: confirmation + disconnect button
 * Disconnected state: connect prompt
 * Query param ?google=connected|error surfaces feedback after the OAuth redirect
 */

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CalendarCheck, CalendarX, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GoogleCalendarBannerProps {
  isConnected: boolean
}

export function GoogleCalendarBanner({ isConnected: initialConnected }: GoogleCalendarBannerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [connected, setConnected] = useState(initialConnected)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Surface OAuth callback result
  useEffect(() => {
    const google = searchParams.get("google")
    if (google === "connected") {
      setConnected(true)
      setToast("Google Calendar connected successfully.")
      router.replace("/calendar")
    } else if (google === "error") {
      setToast("Could not connect Google Calendar. Please try again.")
      router.replace("/calendar")
    }
  }, [searchParams, router])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" })
      setConnected(false)
      setToast("Google Calendar disconnected.")
    } catch {
      setToast("Failed to disconnect. Please try again.")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="mb-4">
      {toast && (
        <div className="mb-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 ml-4">
            ✕
          </button>
        </div>
      )}

      {connected ? (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-green-800 font-medium">
            <CalendarCheck className="h-4 w-4" />
            Google Calendar sync is on — new meetings will be added to your calendar
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-green-700 hover:text-green-900 hover:bg-green-100 h-7 text-xs"
            disabled={disconnecting}
            onClick={handleDisconnect}
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <CalendarX className="h-4 w-4 text-slate-400" />
            Connect Google Calendar to auto-sync meetings
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => (window.location.href = "/api/auth/google/connect")}
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Connect Google Calendar
          </Button>
        </div>
      )}
    </div>
  )
}
