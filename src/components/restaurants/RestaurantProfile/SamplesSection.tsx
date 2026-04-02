"use client"

/**
 * SamplesSection — log and view produce samples dropped at a restaurant.
 *
 * Shows chronological list of samples with an "Add Sample" button that opens
 * a Dialog form. On success the dialog closes and the page data refreshes.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FlaskConical, CheckCircle2 } from "lucide-react"
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
import { formatDate } from "@/lib/utils"
import { PRODUCT_PRESETS } from "@/lib/constants"

type SampleRow = {
  id: string
  sampleDate: Date | string
  product: string
  quantity: string | null
  receivedBy: string | null
  notes: string | null
  followUpResult: string | null
  ledToInterest: boolean | null
}

interface SamplesSectionProps {
  restaurantId: string
  samples: SampleRow[]
  canLog: boolean
}

export function SamplesSection({ restaurantId, samples, canLog }: SamplesSectionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [product, setProduct] = useState("")
  const [sampleDate, setSampleDate] = useState(() => new Date().toISOString().split("T")[0])
  const [quantity, setQuantity] = useState("")
  const [receivedBy, setReceivedBy] = useState("")
  const [notes, setNotes] = useState("")
  const [followUpResult, setFollowUpResult] = useState("")
  const [ledToInterest, setLedToInterest] = useState<boolean | null>(null)

  function resetForm() {
    setProduct("")
    setSampleDate(new Date().toISOString().split("T")[0])
    setQuantity("")
    setReceivedBy("")
    setNotes("")
    setFollowUpResult("")
    setLedToInterest(null)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm()
    setOpen(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product.trim() || !sampleDate) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: product.trim(),
          sampleDate,
          quantity: quantity.trim() || undefined,
          receivedBy: receivedBy.trim() || undefined,
          notes: notes.trim() || undefined,
          followUpResult: followUpResult.trim() || undefined,
          ledToInterest: ledToInterest ?? undefined,
        }),
      })
      if (res.ok) {
        handleOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to log sample.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (samples.length === 0 && !canLog) return null

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-slate-400" />
          Samples ({samples.length})
        </h2>
        {canLog && (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Log Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Sample</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-1">
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Product — quick-select presets + free-text */}
                <div className="space-y-2">
                  <Label>
                    Product <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRODUCT_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProduct(p)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          product === p
                            ? "bg-green-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type a product name…"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sampleDate">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sampleDate"
                      type="date"
                      value={sampleDate}
                      onChange={(e) => setSampleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      placeholder="e.g. 1 case, 5 lbs"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receivedBy">Received by</Label>
                  <Input
                    id="receivedBy"
                    placeholder="e.g. Chef Marco"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any notes about the drop-off…"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Follow-up result — only relevant after the fact */}
                <div className="space-y-1.5">
                  <Label htmlFor="followUpResult">Follow-up feedback</Label>
                  <Input
                    id="followUpResult"
                    placeholder="e.g. Chef loved it, wants to order next week"
                    value={followUpResult}
                    onChange={(e) => setFollowUpResult(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Led to interest?</Label>
                  <div className="flex gap-3">
                    {(["yes", "no", "unknown"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setLedToInterest(val === "yes" ? true : val === "no" ? false : null)
                        }
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border ${
                          (val === "yes" && ledToInterest === true) ||
                          (val === "no" && ledToInterest === false) ||
                          (val === "unknown" && ledToInterest === null)
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {val === "yes" ? "Yes" : val === "no" ? "No" : "Unknown"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting || !product.trim()}>
                    {submitting ? "Saving…" : "Log Sample"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {samples.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-3">
          {canLog ? "No samples logged yet. Log one above." : "No samples logged yet."}
        </p>
      ) : (
        <ul className="space-y-3 divide-y">
          {samples.map((s) => (
            <li key={s.id} className="text-sm pt-3 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{s.product}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(s.sampleDate)}
                    {s.quantity ? ` · ${s.quantity}` : ""}
                    {s.receivedBy ? ` · Received by ${s.receivedBy}` : ""}
                  </p>
                </div>
                {s.ledToInterest === true && (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    Interest
                  </span>
                )}
              </div>
              {s.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{s.notes}</p>}
              {s.followUpResult && (
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded px-1.5 py-1">
                  {s.followUpResult}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
