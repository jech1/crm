"use client"

/**
 * CompleteMeetingModal — captures outcome and next step when marking a meeting done.
 *
 * Used by both CalendarCompleteButton (calendar page) and MeetingsSection
 * (restaurant profile). Wraps a Dialog around whatever trigger element is passed in.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
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

interface CompleteMeetingModalProps {
  meetingId: string
  meetingTitle: string
  restaurantName: string
  /** Rendered as the Dialog trigger — typically a "Done" button */
  trigger: React.ReactNode
}

export function CompleteMeetingModal({
  meetingId,
  meetingTitle,
  restaurantName,
  trigger,
}: CompleteMeetingModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState("")
  const [nextStep, setNextStep] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!outcome.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompleted: true,
          outcome: outcome.trim(),
          nextStep: nextStep.trim() || undefined,
        }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to complete meeting.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Reset form when dialog closes
  function handleOpenChange(next: boolean) {
    if (!next) {
      setOutcome("")
      setNextStep("")
      setError(null)
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Meeting</DialogTitle>
        </DialogHeader>

        {/* Context */}
        <div className="text-xs bg-slate-50 border border-slate-100 rounded-md px-3 py-2 -mt-1">
          <p className="font-medium text-slate-700">{meetingTitle}</p>
          <p className="text-slate-500">{restaurantName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="outcome">
              What happened? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="outcome"
              placeholder="e.g. Met the owner — interested in tomatoes and micro greens. Agreed to send a pricing sheet."
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nextStep">Next step</Label>
            <Input
              id="nextStep"
              placeholder="e.g. Send pricing by Friday and follow up Monday"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !outcome.trim()}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {submitting ? "Saving…" : "Mark Complete"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
