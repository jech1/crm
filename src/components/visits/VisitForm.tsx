"use client"

/**
 * Visit log form.
 *
 * The most-used form in the app — optimized to be completeable in under 60 seconds.
 * Field order is: visit type → who → outcome → products → objections → next action → follow-up date.
 *
 * On submit, POSTs to /api/restaurants/[id]/visits and redirects to the restaurant profile.
 */

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createVisitSchema, type CreateVisitInput } from "@/lib/validations/visit"
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
import { VISIT_TYPE_LABELS, PRODUCT_PRESETS } from "@/lib/constants"
import { useState } from "react"
import { format } from "date-fns"

interface VisitFormProps {
  restaurantId: string
  restaurantName: string
}

export function VisitForm({ restaurantId, restaurantName }: VisitFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateVisitInput>({
    resolver: zodResolver(createVisitSchema),
    defaultValues: {
      restaurantId,
      visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      visitType: "WALK_IN",
      productsDiscussed: [],
    },
  })

  const selectedProducts = watch("productsDiscussed") ?? []

  function toggleProduct(product: string) {
    const current = selectedProducts
    setValue(
      "productsDiscussed",
      current.includes(product) ? current.filter((p) => p !== product) : [...current, product],
    )
  }

  async function onSubmit(data: CreateVisitInput) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? "Failed to save visit")
      }
      router.push(`/restaurants/${restaurantId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Restaurant (read-only) */}
      <div>
        <Label>Restaurant</Label>
        <p className="mt-1 text-sm font-medium text-slate-900">{restaurantName}</p>
        <input type="hidden" {...register("restaurantId")} />
      </div>

      {/* Visit date + type — most important fields, first */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="visitDate">Visit Date & Time *</Label>
          <Input
            id="visitDate"
            type="datetime-local"
            {...register("visitDate")}
          />
          {errors.visitDate && (
            <p className="text-xs text-red-500">{errors.visitDate.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Visit Type *</Label>
          <Select
            defaultValue="WALK_IN"
            onValueChange={(val) => setValue("visitType", val as CreateVisitInput["visitType"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Who was spoken to */}
      <div className="space-y-1.5">
        <Label htmlFor="contactedPerson">Person Spoken To</Label>
        <Input
          id="contactedPerson"
          placeholder="e.g. Marco (Chef)"
          {...register("contactedPerson")}
        />
      </div>

      {/* Outcome — the most important field */}
      <div className="space-y-1.5">
        <Label htmlFor="outcome">Outcome / Summary</Label>
        <Textarea
          id="outcome"
          placeholder="What happened? What did they say? What's the status?"
          rows={3}
          {...register("outcome")}
        />
      </div>

      {/* Products discussed */}
      <div className="space-y-1.5">
        <Label>Products Discussed</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCT_PRESETS.map((product) => (
            <button
              key={product}
              type="button"
              onClick={() => toggleProduct(product)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedProducts.includes(product)
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {product}
            </button>
          ))}
        </div>
      </div>

      {/* Objections */}
      <div className="space-y-1.5">
        <Label htmlFor="objections">Objections / Concerns</Label>
        <Textarea
          id="objections"
          placeholder="What pushback did you get?"
          rows={2}
          {...register("objections")}
        />
      </div>

      {/* Internal notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Internal Notes</Label>
        <Textarea
          id="notes"
          placeholder="Anything else the team should know…"
          rows={2}
          {...register("notes")}
        />
      </div>

      {/* Next action + follow-up date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nextAction">Next Action</Label>
          <Input
            id="nextAction"
            placeholder="e.g. Send pricing sheet"
            {...register("nextAction")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="followUpDate">Follow-Up Date</Label>
          <Input id="followUpDate" type="date" {...register("followUpDate")} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Log Visit"}
        </Button>
      </div>
    </form>
  )
}
