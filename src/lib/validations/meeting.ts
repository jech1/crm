import { z } from "zod"

export const createMeetingSchema = z.object({
  restaurantId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  meetingType: z.enum([
    "INTRO",
    "PRICING_DISCUSSION",
    "SAMPLE_DROP",
    "FOLLOW_UP_CALL",
    "ON_SITE_VISIT",
  ]),
  scheduledAt: z.string().min(1, "Date and time is required"),
  durationMins: z.number().int().min(5).max(480).optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
