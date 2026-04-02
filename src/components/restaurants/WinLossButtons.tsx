"use client"

/**
 * WinLossButtons — "Mark as Won" / "Mark as Lost" actions on the restaurant profile.
 *
 * Each button opens a small Dialog that captures the reason/context before
 * submitting a PATCH /api/restaurants/[id]/stage request. The stage service
 * will write to WinRecord or LossRecord automatically.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LOSS_REASON_LABELS } from "@/lib/constants"
import type { PipelineStage } from "@prisma/client"

interface WinLossButtonsProps {
  restaurantId: string
  restaurantName: string
  currentStage: PipelineStage
}

export function WinLossButtons({
  restaurantId,
  restaurantName,
  currentStage,
}: WinLossButtonsProps) {
  const alreadyWon = currentStage === "CUSTOMER"
  const alreadyLost = currentStage === "LOST_LEAD"

  // Don't render if the account is in both terminal states (impossible) or neither needs showing
  if (alreadyWon && alreadyLost) return null

  return (
    <div className="flex flex-wrap gap-2">
      {!alreadyWon && (
        <MarkWonDialog restaurantId={restaurantId} restaurantName={restaurantName} />
      )}
      {!alreadyLost && (
        <MarkLostDialog restaurantId={restaurantId} restaurantName={restaurantName} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Mark as Won
// ─────────────────────────────────────────────────────────────

function MarkWonDialog({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string
  restaurantName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstProduct, setFirstProduct] = useState("")
  const [leadSource, setLeadSource] = useState("")
  const [warmIntroUsed, setWarmIntroUsed] = useState(false)
  const [notes, setNotes] = useState("")

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFirstProduct("")
      setLeadSource("")
      setWarmIntroUsed(false)
      setNotes("")
      setError(null)
    }
    setOpen(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "CUSTOMER",
          firstProduct: firstProduct.trim() || undefined,
          leadSource: leadSource.trim() || undefined,
          warmIntroUsed,
          winNotes: notes.trim() || undefined,
        }),
      })
      if (res.ok) {
        handleOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to mark as won.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300">
          <Trophy className="h-3.5 w-3.5 mr-1.5" />
          Mark Won
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Customer</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2 mb-2">
          Record how you won <span className="font-medium text-slate-700">{restaurantName}</span>.
          This will move them to the Customer stage.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="firstProduct">First product they&apos;re buying</Label>
            <Input
              id="firstProduct"
              placeholder="e.g. Heirloom tomatoes, herbs"
              value={firstProduct}
              onChange={(e) => setFirstProduct(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leadSource">How did we get them?</Label>
            <Input
              id="leadSource"
              placeholder="e.g. Cold walk-in, referral from Joe's"
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={warmIntroUsed}
              onClick={() => setWarmIntroUsed((v) => !v)}
              className={`w-4 h-4 rounded border transition-colors shrink-0 ${
                warmIntroUsed
                  ? "bg-green-600 border-green-600"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            />
            <Label className="cursor-pointer font-normal" onClick={() => setWarmIntroUsed((v) => !v)}>
              A warm intro helped close this account
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="winNotes">Notes</Label>
            <Textarea
              id="winNotes"
              placeholder="Any context worth remembering about how this deal happened…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-green-600 hover:bg-green-700">
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              {submitting ? "Saving…" : "Mark as Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// Mark as Lost
// ─────────────────────────────────────────────────────────────

function MarkLostDialog({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string
  restaurantName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lossReason, setLossReason] = useState<string>("")
  const [notes, setNotes] = useState("")

  function handleOpenChange(next: boolean) {
    if (!next) {
      setLossReason("")
      setNotes("")
      setError(null)
    }
    setOpen(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lossReason) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "LOST_LEAD",
          lossReason,
          lossNotes: notes.trim() || undefined,
        }),
      })
      if (res.ok) {
        handleOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to mark as lost.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50">
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Mark Lost
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Lost Lead</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2 mb-2">
          Why are we losing <span className="font-medium text-slate-700">{restaurantName}</span>?
          This helps the team learn and improve.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={lossReason} onValueChange={setLossReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOSS_REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lossNotes">Notes</Label>
            <Textarea
              id="lossNotes"
              placeholder="Any context that might help the team revisit this account later…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !lossReason}
              variant="destructive"
            >
              {submitting ? "Saving…" : "Mark as Lost"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
