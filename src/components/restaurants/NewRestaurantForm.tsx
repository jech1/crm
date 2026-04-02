"use client"

/**
 * New restaurant creation form.
 * - REPs: no ownership dropdown — the restaurant is automatically theirs.
 * - ADMINs: ownership dropdown to assign to themselves or a specific rep.
 */

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createRestaurantSchema, type CreateRestaurantInput } from "@/lib/validations/restaurant"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

const RESTAURANT_TYPES = [
  { value: "FINE_DINING", label: "Fine Dining" },
  { value: "CASUAL", label: "Casual" },
  { value: "FAST_CASUAL", label: "Fast Casual" },
  { value: "BAR", label: "Bar" },
  { value: "CAFE", label: "Cafe" },
  { value: "FOOD_TRUCK", label: "Food Truck" },
  { value: "OTHER", label: "Other" },
]

interface NewRestaurantFormProps {
  isAdmin: boolean
  currentUserId: string
  currentUserName: string
  reps: { id: string; name: string; role: string }[]
}

export function NewRestaurantForm({
  isAdmin,
  currentUserId,
  currentUserName,
  reps,
}: NewRestaurantFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepId, setSelectedRepId] = useState<string>(currentUserId)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateRestaurantInput>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: { state: "AZ" },
  })

  async function onSubmit(data: CreateRestaurantInput) {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...data,
        // Only include repId for admin — REP ownership is enforced server-side
        ...(isAdmin && selectedRepId ? { repId: selectedRepId } : {}),
      }
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create restaurant")
      router.push(`/restaurants/${json.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Restaurant"
        description={
          isAdmin
            ? "Add a new restaurant and assign it to a rep"
            : "Add a new restaurant to your accounts"
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-white p-6 space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Admin only: ownership assignment */}
        {isAdmin && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-2">
            <Label className="text-blue-800 font-medium">Assign Owner</Label>
            <p className="text-xs text-blue-600">
              This restaurant will be owned by the selected rep. They will see it in their account list.
            </p>
            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a rep…" />
              </SelectTrigger>
              <SelectContent>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.id === currentUserId && (
                      <span className="text-slate-400 ml-1">(you)</span>
                    )}
                    {r.role === "ADMIN" && r.id !== currentUserId && (
                      <span className="text-slate-400 ml-1">· Admin</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* REP: show a subtle "This will be added to your accounts" note */}
        {!isAdmin && (
          <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700">
            This restaurant will be added to <strong>your accounts</strong> — {currentUserName}.
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Restaurant Name *</Label>
          <Input id="name" placeholder="Bella Luna Trattoria" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="address">Street Address *</Label>
          <Input id="address" placeholder="412 N Main St" {...register("address")} />
          {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 space-y-1.5">
            <Label htmlFor="city">City *</Label>
            <Input id="city" placeholder="Scottsdale" {...register("city")} />
            {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State *</Label>
            <Input id="state" placeholder="AZ" maxLength={2} {...register("state")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP *</Label>
            <Input id="zip" placeholder="85251" {...register("zip")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="(480) 555-0123" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="info@restaurant.com" {...register("email")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cuisineType">Cuisine Type</Label>
            <Input id="cuisineType" placeholder="e.g. Italian, Mexican" {...register("cuisineType")} />
          </div>
          <div className="space-y-1.5">
            <Label>Restaurant Type</Label>
            <Select
              onValueChange={(val) =>
                setValue("restaurantType", val as CreateRestaurantInput["restaurantType"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {RESTAURANT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://restaurant.com"
            {...register("website")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
          <Input
            id="googleMapsUrl"
            type="url"
            placeholder="https://maps.google.com/…"
            {...register("googleMapsUrl")}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Add Restaurant"}
          </Button>
        </div>
      </form>
    </div>
  )
}
