import { z } from "zod"

export const createSampleSchema = z.object({
  restaurantId: z.string().min(1),
  sampleDate: z.string().min(1, "Sample date is required"),
  product: z.string().min(1, "Product is required"),
  quantity: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional(),
  followUpResult: z.string().optional(),
  ledToInterest: z.boolean().optional(),
})

export type CreateSampleInput = z.infer<typeof createSampleSchema>
