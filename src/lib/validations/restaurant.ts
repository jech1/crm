import { z } from "zod"

export const createRestaurantSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2).max(2),
  zip: z.string().min(5).max(10),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  googleMapsUrl: z.string().url().optional().or(z.literal("")),
  cuisineType: z.string().optional(),
  restaurantType: z
    .enum(["FINE_DINING", "CASUAL", "FAST_CASUAL", "BAR", "CAFE", "FOOD_TRUCK", "OTHER"])
    .optional(),
  estimatedVolume: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  repId: z.string().optional(),
  territoryId: z.string().optional(),
  // Operational info
  deliveriesPerWeek: z.coerce.number().int().min(0).optional().nullable(),
  desiredDeliveryTime: z.string().optional(),
  deliveryLocation: z.string().optional(),
  paymentMethod: z.string().optional(),
  billingTerms: z.string().optional(),
  yearsInBusiness: z.coerce.number().int().min(0).optional().nullable(),
  isReferral: z.boolean().optional(),
  referredBy: z.string().optional(),
  additionalNotes: z.string().optional(),
  followUpNotes: z.string().optional(),
  nearbyProspectsVisited: z.string().optional(),
  creditAppSent: z.boolean().optional(),
  creditAppSentAt: z.string().datetime().optional().nullable(),
  // Set to true to bypass the same-location duplicate check on create.
  // Used when a rep confirms they are intentionally adding a second
  // location that shares a name and address with an existing record.
  skipDuplicateCheck: z.boolean().optional(),
})

export const updateRestaurantSchema = createRestaurantSchema.partial()

export const updateStageSchema = z.object({
  stage: z.enum([
    "NOT_CONTACTED",
    "NEEDS_VISIT",
    "VISITED",
    "SPOKE_TO_BUYER",
    "SAMPLES_REQUESTED",
    "PRICING_SENT",
    "FOLLOW_UP_NEEDED",
    "INTERESTED",
    "CUSTOMER",
    "LOST_LEAD",
  ]),
  notes: z.string().optional(),
  // Win data — captured when stage → CUSTOMER
  firstProduct: z.string().optional(),
  leadSource: z.string().optional(),
  warmIntroUsed: z.boolean().optional(),
  winNotes: z.string().optional(),
  // Loss data — captured when stage → LOST_LEAD
  lossReason: z
    .enum([
      "PRICE",
      "SUPPLIER_LOYALTY",
      "NO_NEED",
      "TIMING",
      "NO_DECISION_MAKER",
      "NO_RESPONSE",
      "SERVICE_ISSUE",
      "OTHER",
    ])
    .optional(),
  lossNotes: z.string().optional(),
})

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum([
    "OWNER",
    "CHEF",
    "KITCHEN_MANAGER",
    "PURCHASING_MANAGER",
    "GENERAL_MANAGER",
    "FRONT_DESK",
    "OTHER",
  ]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

export const updateContactSchema = createContactSchema.partial()

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>
export type UpdateStageInput = z.infer<typeof updateStageSchema>
export type UpdateStageWinData = Pick<UpdateStageInput, "firstProduct" | "leadSource" | "warmIntroUsed" | "winNotes">
export type UpdateStageLossData = Pick<UpdateStageInput, "lossReason" | "lossNotes">
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
