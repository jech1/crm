import { z } from "zod"

export const createVisitSchema = z.object({
  restaurantId: z.string().min(1),
  visitDate: z.string().min(1, "Visit date is required"),
  visitType: z.enum(["WALK_IN", "SCHEDULED", "FOLLOW_UP", "SAMPLE_DROP", "PHONE_CALL"]),
  contactedPerson: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  objections: z.string().optional(),
  productsDiscussed: z.array(z.string()).default([]),
  nextAction: z.string().optional(),
  followUpDate: z.string().optional(),
})

export type CreateVisitInput = z.infer<typeof createVisitSchema>
