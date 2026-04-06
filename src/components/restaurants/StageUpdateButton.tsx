"use client"

/**
 * StageUpdateButton — inline stage picker for the restaurant profile header.
 *
 * Renders the current stage badge as a clickable trigger. Opens a dialog
 * listing all intermediate pipeline stages. Selecting one fires
 * PATCH /api/restaurants/[id]/stage and refreshes the page.
 *
 * CUSTOMER and LOST_LEAD are intentionally excluded — those go through
 * WinLossButtons which collect extra required context.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StageBadge } from "./StageBadge"
import { PIPELINE_STAGES_ORDERED, PIPELINE_STAGE_LABELS } from "@/lib/constants"
import type { PipelineStage } from "@prisma/client"

const EXCLUDED: PipelineStage[] = ["CUSTOMER", "LOST_LEAD"]

interface Props {
  restaurantId: string
  currentStage: PipelineStage
}

export function StageUpdateButton({ restaurantId, currentStage }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stages = PIPELINE_STAGES_ORDERED.filter((s) => !EXCLUDED.includes(s))

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedStage(null)
      setNote("")
      setError(null)
    }
    setOpen(next)
  }

  async function handleSave() {
    if (!selectedStage || selectedStage === currentStage) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: selectedStage,
          notes: note.trim() || undefined,
        }),
      })
      if (res.ok) {
        handleOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to update stage.")
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
        <button
          className="inline-flex items-center gap-0.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 hover:opacity-80 transition-opacity"
          aria-label="Update pipeline stage"
        >
          <StageBadge stage={currentStage} />
          <ChevronDown className="h-3 w-3 text-slate-400 -ml-0.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Stage</DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          {stages.map((stage) => {
            const isCurrent = stage === currentStage
            const isSelected = stage === selectedStage
            return (
              <button
                key={stage}
                type="button"
                onClick={() => !isCurrent && setSelectedStage(isSelected ? null : stage)}
                disabled={isCurrent}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  isCurrent
                    ? "bg-slate-50 cursor-default"
                    : isSelected
                    ? "bg-slate-100 ring-1 ring-slate-300"
                    : "hover:bg-slate-50 cursor-pointer"
                }`}
              >
                <StageBadge stage={stage} />
                {isCurrent && (
                  <span className="text-xs text-slate-400">current</span>
                )}
                {isSelected && !isCurrent && (
                  <Check className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {selectedStage && selectedStage !== currentStage && (
          <div className="space-y-1.5 pt-1 border-t">
            <Label htmlFor="stageNote">
              Note{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="stageNote"
              placeholder={`Why moving to "${PIPELINE_STAGE_LABELS[selectedStage]}"…`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedStage || selectedStage === currentStage || submitting}
            onClick={handleSave}
          >
            {submitting ? "Saving…" : "Update Stage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
