/**
 * Edit Restaurant form — client component.
 * Pre-filled with existing data. Submits PATCH to /api/restaurants/[id].
 * Delete button soft-archives via DELETE /api/restaurants/[id].
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, AlertTriangle } from "lucide-react"
import { ContactsManager } from "./ContactsManager"
import type {
  RestaurantType,
  VolumeEstimate,
  PipelineStage,
  ContactRole,
} from "@prisma/client"
import { PIPELINE_STAGE_LABELS } from "@/lib/constants"

const RESTAURANT_TYPE_LABELS: Record<RestaurantType, string> = {
  FINE_DINING: "Fine Dining",
  CASUAL: "Casual",
  FAST_CASUAL: "Fast Casual",
  BAR: "Bar",
  CAFE: "Cafe",
  FOOD_TRUCK: "Food Truck",
  OTHER: "Other",
}

const VOLUME_LABELS: Record<VolumeEstimate, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
}

type ContactData = {
  id: string
  name: string
  role: ContactRole
  phone: string | null
  email: string | null
  notes: string | null
  isPrimary: boolean
}

type RestaurantData = {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string | null
  email: string | null
  website: string | null
  googleMapsUrl: string | null
  cuisineType: string | null
  restaurantType: RestaurantType | null
  estimatedVolume: VolumeEstimate | null
  repId: string | null
  territoryId: string | null
  pipelineStage: PipelineStage
  // Operational
  deliveriesPerWeek: number | null
  desiredDeliveryTime: string | null
  deliveryLocation: string | null
  paymentMethod: string | null
  billingTerms: string | null
  yearsInBusiness: number | null
  isReferral: boolean
  referredBy: string | null
  additionalNotes: string | null
  followUpNotes: string | null
  nearbyProspectsVisited: string | null
  creditAppSent: boolean
  contacts: ContactData[]
}

interface EditRestaurantFormProps {
  restaurant: RestaurantData
  reps: { id: string; name: string }[]
  canDelete: boolean
  isAdmin: boolean
}

export function EditRestaurantForm({
  restaurant,
  reps,
  canDelete,
  isAdmin,
}: EditRestaurantFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Controlled selects
  const [restaurantType, setRestaurantType] = useState<string>(
    restaurant.restaurantType ?? "",
  )
  const [estimatedVolume, setEstimatedVolume] = useState<string>(
    restaurant.estimatedVolume ?? "",
  )
  const [repId, setRepId] = useState<string>(restaurant.repId ?? "")
  const [pipelineStage, setPipelineStage] = useState<string>(restaurant.pipelineStage)
  const [isReferral, setIsReferral] = useState(restaurant.isReferral)
  const [creditAppSent, setCreditAppSent] = useState(restaurant.creditAppSent)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const deliveriesRaw = formData.get("deliveriesPerWeek") as string
    const yearsRaw = formData.get("yearsInBusiness") as string

    const body: Record<string, unknown> = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip: formData.get("zip") as string,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      googleMapsUrl: (formData.get("googleMapsUrl") as string) || undefined,
      cuisineType: (formData.get("cuisineType") as string) || undefined,
      restaurantType: restaurantType || undefined,
      estimatedVolume: estimatedVolume || undefined,
      repId: repId || undefined,
      // Operational
      deliveriesPerWeek: deliveriesRaw ? parseInt(deliveriesRaw, 10) : null,
      desiredDeliveryTime: (formData.get("desiredDeliveryTime") as string) || undefined,
      deliveryLocation: (formData.get("deliveryLocation") as string) || undefined,
      paymentMethod: (formData.get("paymentMethod") as string) || undefined,
      billingTerms: (formData.get("billingTerms") as string) || undefined,
      yearsInBusiness: yearsRaw ? parseInt(yearsRaw, 10) : null,
      isReferral,
      referredBy: (formData.get("referredBy") as string) || undefined,
      additionalNotes: (formData.get("additionalNotes") as string) || undefined,
      followUpNotes: (formData.get("followUpNotes") as string) || undefined,
      nearbyProspectsVisited: (formData.get("nearbyProspectsVisited") as string) || undefined,
      creditAppSent,
    }

    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        // If stage changed, update via the stage endpoint
        if (pipelineStage !== restaurant.pipelineStage) {
          await fetch(`/api/restaurants/${restaurant.id}/stage`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: pipelineStage }),
          })
        }
        router.push(`/restaurants/${restaurant.id}`)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to save changes. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/restaurants")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to archive. Please try again.")
        setConfirmDelete(false)
      }
    } catch {
      setError("Network error. Please try again.")
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Edit ${restaurant.name}`}
        description="Update restaurant details, stage, or assigned rep"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/restaurants/${restaurant.id}`)}
          >
            Cancel
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Contacts — managed independently from the main form */}
      <div className="rounded-xl border bg-white p-5 mb-6">
        <ContactsManager
          restaurantId={restaurant.id}
          contacts={restaurant.contacts}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core info */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Restaurant Info</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">Restaurant Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={restaurant.name}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              name="address"
              required
              defaultValue={restaurant.address}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" required defaultValue={restaurant.city} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                name="state"
                required
                maxLength={2}
                defaultValue={restaurant.state}
                placeholder="CA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">Zip *</Label>
              <Input id="zip" name="zip" required defaultValue={restaurant.zip} />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Contact Info</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={restaurant.phone ?? ""}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={restaurant.email ?? ""}
                placeholder="info@restaurant.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                defaultValue={restaurant.website ?? ""}
                placeholder="https://"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
              <Input
                id="googleMapsUrl"
                name="googleMapsUrl"
                type="url"
                defaultValue={restaurant.googleMapsUrl ?? ""}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Classification</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cuisineType">Cuisine Type</Label>
              <Input
                id="cuisineType"
                name="cuisineType"
                defaultValue={restaurant.cuisineType ?? ""}
                placeholder="e.g. Italian, Mexican, American…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Restaurant Type</Label>
              <Select value={restaurantType} onValueChange={setRestaurantType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(Object.keys(RESTAURANT_TYPE_LABELS) as RestaurantType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {RESTAURANT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estimated Volume</Label>
            <Select value={estimatedVolume} onValueChange={setEstimatedVolume}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select volume…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(Object.keys(VOLUME_LABELS) as VolumeEstimate[]).map((v) => (
                  <SelectItem key={v} value={v}>
                    {VOLUME_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Operational Info */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Operational Info</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deliveriesPerWeek">Deliveries / Week</Label>
              <Input
                id="deliveriesPerWeek"
                name="deliveriesPerWeek"
                type="number"
                min={0}
                defaultValue={restaurant.deliveriesPerWeek ?? ""}
                placeholder="e.g. 3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desiredDeliveryTime">Preferred Delivery Time</Label>
              <Input
                id="desiredDeliveryTime"
                name="desiredDeliveryTime"
                defaultValue={restaurant.desiredDeliveryTime ?? ""}
                placeholder="e.g. Mornings before 10am"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliveryLocation">Delivery Location / Instructions</Label>
            <Input
              id="deliveryLocation"
              name="deliveryLocation"
              defaultValue={restaurant.deliveryLocation ?? ""}
              placeholder="e.g. Back door on Oak St, ring bell"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Input
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={restaurant.paymentMethod ?? ""}
                placeholder="e.g. Check, ACH, Credit Card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billingTerms">Billing Terms</Label>
              <Input
                id="billingTerms"
                name="billingTerms"
                defaultValue={restaurant.billingTerms ?? ""}
                placeholder="e.g. Net 30, COD"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="yearsInBusiness">Years in Business</Label>
              <Input
                id="yearsInBusiness"
                name="yearsInBusiness"
                type="number"
                min={0}
                defaultValue={restaurant.yearsInBusiness ?? ""}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isReferral}
                onChange={(e) => setIsReferral(e.target.checked)}
                className="rounded"
              />
              <span>This is a referral</span>
            </label>
            {isReferral && (
              <div className="space-y-1.5 ml-6">
                <Label htmlFor="referredBy">Referred By</Label>
                <Input
                  id="referredBy"
                  name="referredBy"
                  defaultValue={restaurant.referredBy ?? ""}
                  placeholder="Name or business"
                />
              </div>
            )}
            {!isReferral && <input type="hidden" name="referredBy" value="" />}
          </div>
        </div>

        {/* Notes & Intelligence */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Notes & Intelligence</h2>

          <div className="space-y-1.5">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <textarea
              id="additionalNotes"
              name="additionalNotes"
              rows={3}
              defaultValue={restaurant.additionalNotes ?? ""}
              placeholder="Any other info about this account…"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="followUpNotes">Follow-Up Notes</Label>
            <textarea
              id="followUpNotes"
              name="followUpNotes"
              rows={2}
              defaultValue={restaurant.followUpNotes ?? ""}
              placeholder="What to cover on next visit or call…"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nearbyProspectsVisited">Nearby Prospects Visited</Label>
            <Input
              id="nearbyProspectsVisited"
              name="nearbyProspectsVisited"
              defaultValue={restaurant.nearbyProspectsVisited ?? ""}
              placeholder="e.g. Taco Loco next door, Blue Fig across street"
            />
          </div>
        </div>

        {/* Sales Process */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Sales Process</h2>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={creditAppSent}
              onChange={(e) => setCreditAppSent(e.target.checked)}
              className="rounded"
            />
            <span>Credit application sent</span>
          </label>
        </div>

        {/* Pipeline + Assignment (admin only for rep) */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Pipeline & Assignment</h2>

          <div className="space-y-1.5">
            <Label>Pipeline Stage</Label>
            <Select value={pipelineStage} onValueChange={setPipelineStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PIPELINE_STAGE_LABELS) as PipelineStage[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {PIPELINE_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAdmin && reps.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assigned Rep</Label>
              <Select value={repId} onValueChange={setRepId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">— Unassigned —</SelectItem>
                  {reps.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="submit" disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>

          {canDelete && (
            <div className="flex items-center gap-2">
              {confirmDelete && (
                <p className="text-xs text-red-600 font-medium">
                  This will archive the restaurant. Confirm?
                </p>
              )}
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={handleDelete}
                disabled={deleting || saving}
                className={confirmDelete ? "" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {deleting ? "Archiving…" : confirmDelete ? "Yes, Archive" : "Archive Restaurant"}
              </Button>
              {confirmDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
