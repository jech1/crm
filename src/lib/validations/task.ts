import { z } from "zod"

export const createTaskSchema = z.object({
  restaurantId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200),
  taskType: z.enum([
    "CALL",
    "REVISIT",
    "SEND_PRICING",
    "BRING_SAMPLE",
    "ASK_FOR_BUYER",
    "CONFIRM_MEETING",
    "UPDATE_NOTE",
    "OTHER",
  ]),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  notes: z.string().optional(),
  assignedToId: z.string().optional(), // admin can reassign; defaults to current user
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  isCompleted: z.boolean().optional(),
})

export const completeTaskSchema = z.object({
  outcomeType: z
    .enum([
      "SPOKE_TO_OWNER",
      "SPOKE_TO_MANAGER",
      "SPOKE_TO_BUYER",
      "LEFT_VOICEMAIL",
      "NO_ANSWER",
      "MEETING_SCHEDULED",
      "SAMPLE_REQUESTED",
      "PRICING_SENT",
      "REVISITED",
      "NOTE_UPDATED",
      "OTHER",
    ])
    .optional(),
  completionNotes: z.string().max(1000).optional(),
})

export type CompleteTaskInput = z.infer<typeof completeTaskSchema>

export type CreateTaskInput = z.infer<typeof createTaskSchema>
