"use client"

/**
 * Warm intros section for the restaurant profile sidebar.
 *
 * Renders the list of active warm intros plus an "Add Warm Intro" button
 * that opens a Dialog containing WarmIntroForm. The restaurant is
 * pre-selected; on success the dialog closes and the page data refreshes.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { WarmIntroForm } from "@/components/warm-leads/WarmIntroForm"
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { WarmIntro } from "@prisma/client"

interface RepSummary {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

type WarmIntroWithRep = WarmIntro & { addedBy: RepSummary }

interface WarmIntrosSectionProps {
  restaurantId: string
  restaurantName: string
  warmIntros: WarmIntroWithRep[]
  canAddWarmIntro: boolean
}

export function WarmIntrosSection({
  restaurantId,
  restaurantName,
  warmIntros,
  canAddWarmIntro,
}: WarmIntrosSectionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Warm Intros ({warmIntros.length})
        </h2>
        {canAddWarmIntro && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Warm Intro</DialogTitle>
              </DialogHeader>
              <WarmIntroForm
                restaurantId={restaurantId}
                restaurantName={restaurantName}
                onSuccess={handleSuccess}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {warmIntros.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-3">
          {canAddWarmIntro ? "No warm intros yet. Add one above." : "No warm intros yet."}
        </p>
      ) : (
        <ul className="space-y-4">
          {warmIntros.map((intro) => (
            <li key={intro.id} className="text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">Via {intro.introducedBy}</p>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    PRIORITY_COLORS[intro.priority],
                  )}
                >
                  {PRIORITY_LABELS[intro.priority]}
                </span>
              </div>
              {intro.contactName && (
                <p className="text-slate-500 mt-0.5">
                  Ask for: {intro.contactName}
                  {intro.contactRole ? ` (${intro.contactRole})` : ""}
                </p>
              )}
              {intro.whatToPitch && (
                <p className="text-slate-500 mt-1">Pitch: {intro.whatToPitch}</p>
              )}
              {intro.bestTimeToVisit && (
                <p className="text-xs text-slate-400 mt-1">Best time: {intro.bestTimeToVisit}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">Added by {intro.addedBy.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
