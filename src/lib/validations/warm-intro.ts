import { z } from "zod"

export const createWarmIntroSchema = z.object({
  restaurantId: z.string().min(1),
  introducedBy: z.string().min(1, "Introduced by is required"),
  relationship: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  whatToPitch: z.string().optional(),
  productInterests: z.array(z.string()).default([]),
  bestTimeToVisit: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  meetingDate: z.string().optional(),
})

export type CreateWarmIntroInput = z.infer<typeof createWarmIntroSchema>
