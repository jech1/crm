"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"
import type { TaskOutcome } from "@prisma/client"

// Outcome options tailored to produce sales CRM field work
const OUTCOME_OPTIONS: { value: TaskOutcome; label: string; description: string }[] = [
  { value: "SPOKE_TO_OWNER", label: "Spoke to Owner", description: "Connected with the owner directly" },
  { value: "SPOKE_TO_MANAGER", label: "Spoke to Manager", description: "Reached the GM or kitchen manager" },
  { value: "SPOKE_TO_BUYER", label: "Spoke to Buyer", description: "Spoke with the purchasing decision-maker" },
  { value: "LEFT_VOICEMAIL", label: "Left Voicemail", description: "Called, left a message" },
  { value: "NO_ANSWER", label: "No Answer", description: "Called or visited, no contact made" },
  { value: "MEETING_SCHEDULED", label: "Meeting Scheduled", description: "Set up a follow-up meeting" },
  { value: "SAMPLE_REQUESTED", label: "Sample Requested", description: "They asked to try our product" },
  { value: "PRICING_SENT", label: "Pricing Sent", description: "Sent pricing sheet or quote" },
  { value: "REVISITED", label: "Revisited", description: "Dropped by in person" },
  { value: "NOTE_UPDATED", label: "Note Updated", description: "Updated account info or notes" },
  { value: "OTHER", label: "Other", description: "Something else happened" },
]

interface CompleteTaskModalProps {
  task: {
    id: string
    title: string
    taskType: string
    restaurant?: { name: string } | null
  }
  open: boolean
  onClose: () => void
}

export function CompleteTaskModal({ task, open, onClose }: CompleteTaskModalProps) {
  const router = useRouter()
  const [outcomeType, setOutcomeType] = useState<TaskOutcome | "">("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleComplete() {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeType: outcomeType || undefined,
          completionNotes: completionNotes.trim() || undefined,
        }),
      })

      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to complete task. Try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (!submitting) {
      setOutcomeType("")
      setCompletionNotes("")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Complete Task
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-slate-700">{task.title}</span>
            {task.restaurant && (
              <span className="text-slate-400"> · {task.restaurant.name}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Outcome type — quick-select grid */}
          <div className="space-y-2">
            <Label>What happened? <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div className="grid grid-cols-2 gap-1.5">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcomeType(outcomeType === opt.value ? "" : opt.value)}
                  className={cn(
                    "text-left rounded-lg border px-3 py-2 text-sm transition-colors",
                    outcomeType === opt.value
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <p className="font-medium leading-tight">{opt.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Outcome notes */}
          <div className="space-y-1.5">
            <Label htmlFor="completionNotes">
              Outcome notes <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="completionNotes"
              placeholder={
                outcomeType === "SPOKE_TO_OWNER"
                  ? "e.g. Owner interested in tomato pricing, wants a follow-up next Tuesday…"
                  : outcomeType === "LEFT_VOICEMAIL"
                    ? "e.g. Left message asking to call back about our spring produce pricing…"
                    : outcomeType === "SAMPLE_REQUESTED"
                      ? "e.g. Chef asked for heirloom tomato and herb samples by Thursday…"
                      : "What happened? Any useful context for next time…"
              }
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleComplete}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? "Saving…" : "Mark Complete"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
