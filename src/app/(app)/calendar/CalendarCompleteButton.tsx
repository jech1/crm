"use client"

import { CompleteMeetingModal } from "@/components/meetings/CompleteMeetingModal"

interface CalendarCompleteButtonProps {
  meetingId: string
  meetingTitle: string
  restaurantName: string
}

export function CalendarCompleteButton({
  meetingId,
  meetingTitle,
  restaurantName,
}: CalendarCompleteButtonProps) {
  return (
    <CompleteMeetingModal
      meetingId={meetingId}
      meetingTitle={meetingTitle}
      restaurantName={restaurantName}
      trigger={
        <button
          type="button"
          className="shrink-0 text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-700 hover:bg-green-50 transition-colors"
        >
          Done
        </button>
      }
    />
  )
}
