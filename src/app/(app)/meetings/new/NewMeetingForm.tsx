"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MEETING_TYPE_LABELS } from "@/lib/constants"
import { AlertTriangle } from "lucide-react"
import type { MeetingType } from "@prisma/client"

interface Props {
  restaurants: { id: string; name: string; city: string }[]
}

export function NewMeetingForm({ restaurants }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledRestaurantId = searchParams.get("restaurantId") ?? ""

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meetingType, setMeetingType] = useState<string>("")
  const [restaurantId, setRestaurantId] = useState(prefilledRestaurantId)

  const lockedRestaurant = prefilledRestaurantId
    ? restaurants.find((r) => r.id === prefilledRestaurantId)
    : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!restaurantId) { setError("Please select a restaurant"); return }
    if (!meetingType) { setError("Please select a meeting type"); return }

    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const body = {
      restaurantId,
      title: formData.get("title") as string,
      meetingType,
      scheduledAt: formData.get("scheduledAt") as string,
      durationMins: formData.get("durationMins")
        ? Number(formData.get("durationMins"))
        : undefined,
      location: (formData.get("location") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    }

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const text = await res.text()
      const json = text ? JSON.parse(text) : {}

      if (res.ok || res.status === 201) {
        router.push(prefilledRestaurantId ? `/restaurants/${prefilledRestaurantId}` : "/calendar")
        router.refresh()
      } else {
        setError(json.error ?? "Something went wrong. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Schedule Meeting"
        description="Add a new meeting to your calendar"
      />

      <div className="rounded-xl border bg-white p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Restaurant — locked or picker */}
          <div className="space-y-1.5">
            <Label>Restaurant *</Label>
            {lockedRestaurant ? (
              <div className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600">
                {lockedRestaurant.name} · {lockedRestaurant.city}
              </div>
            ) : (
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                required
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— Select a restaurant —</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.city}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              name="title"
              required
              autoFocus={!lockedRestaurant}
              placeholder="e.g. Intro call with Chef Maria"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Meeting Type *</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {MEETING_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Date &amp; Time *</Label>
              <Input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationMins">Duration (min)</Label>
              <Input
                id="durationMins"
                name="durationMins"
                type="number"
                min={15}
                step={15}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location / Link</Label>
            <Input
              id="location"
              name="location"
              placeholder="Restaurant address, or video call link"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Agenda</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="What to cover, who to ask for, prep notes…"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Scheduling…" : "Schedule Meeting"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
