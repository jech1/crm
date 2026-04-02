"use client"

/**
 * Warm intro / lead creation form.
 *
 * Used by all three roles (Admin, Rep, Connector).
 * Connectors use this as their primary way to contribute to the system.
 *
 * Fields are ordered by urgency: who introduced → contact info → pitch → logistics.
 */

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createWarmIntroSchema, type CreateWarmIntroInput } from "@/lib/validations/warm-intro"
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
import { PRODUCT_PRESETS, PRIORITY_LABELS } from "@/lib/constants"
import { useState } from "react"

interface WarmIntroFormProps {
  restaurantId: string
  restaurantName: string
  /** Called on successful save. When provided, replaces the default router.push navigation. */
  onSuccess?: () => void
}

export function WarmIntroForm({ restaurantId, restaurantName, onSuccess }: WarmIntroFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateWarmIntroInput>({
    resolver: zodResolver(createWarmIntroSchema),
    defaultValues: {
      restaurantId,
      priority: "MEDIUM",
      productInterests: [],
    },
  })

  const selectedProducts = watch("productInterests") ?? []

  function toggleProduct(product: string) {
    const current = selectedProducts
    setValue(
      "productInterests",
      current.includes(product) ? current.filter((p) => p !== product) : [...current, product],
    )
  }

  async function onSubmit(data: CreateWarmIntroInput) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/warm-intros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? "Failed to save warm intro")
      }
      if (onSuccess) {
        onSuccess()
        router.refresh()
      } else {
        router.push(`/restaurants/${restaurantId}`)
        router.refresh()
      }
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

      <input type="hidden" {...register("restaurantId")} />

      <div>
        <Label>Restaurant</Label>
        <p className="mt-1 text-sm font-medium text-slate-900">{restaurantName}</p>
      </div>

      {/* Who made the intro — the core field */}
      <div className="space-y-1.5">
        <Label htmlFor="introducedBy">Introduced By *</Label>
        <Input
          id="introducedBy"
          placeholder="e.g. Robert Echeverry"
          {...register("introducedBy")}
        />
        {errors.introducedBy && (
          <p className="text-xs text-red-500">{errors.introducedBy.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="relationship">Their Relationship to the Restaurant</Label>
        <Input
          id="relationship"
          placeholder="e.g. Golf friend of the owner for 10+ years"
          {...register("relationship")}
        />
      </div>

      {/* Contact person */}
      <div className="rounded-lg bg-slate-50 p-4 space-y-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Contact Person to Ask For</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Name</Label>
            <Input id="contactName" placeholder="e.g. Layla Nasser" {...register("contactName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactRole">Role</Label>
            <Input id="contactRole" placeholder="e.g. Owner, Chef" {...register("contactRole")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" type="tel" placeholder="(602) 555-0000" {...register("contactPhone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" placeholder="name@restaurant.com" {...register("contactEmail")} />
          </div>
        </div>
      </div>

      {/* Notes about the intro */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes About This Connection</Label>
        <Textarea
          id="notes"
          placeholder="What do you know about the relationship? Any context that would help the rep?"
          rows={3}
          {...register("notes")}
        />
      </div>

      {/* What to pitch */}
      <div className="space-y-1.5">
        <Label htmlFor="whatToPitch">What to Pitch</Label>
        <Textarea
          id="whatToPitch"
          placeholder="What products should we lead with? Any specific angle?"
          rows={2}
          {...register("whatToPitch")}
        />
      </div>

      {/* Product interests */}
      <div className="space-y-1.5">
        <Label>Product Interests</Label>
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

      {/* Best time + priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bestTimeToVisit">Best Time to Visit</Label>
          <Input
            id="bestTimeToVisit"
            placeholder="e.g. Monday after 2pm"
            {...register("bestTimeToVisit")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select
            defaultValue="MEDIUM"
            onValueChange={(val) => setValue("priority", val as CreateWarmIntroInput["priority"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={() => onSuccess ? onSuccess() : router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add Warm Intro"}
        </Button>
      </div>
    </form>
  )
}
