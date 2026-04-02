/**
 * Activity log service.
 * All activity writes go through here so the shape is consistent.
 * Call this inside other service functions — never directly from routes.
 */

import { db } from "@/lib/db"
import type { ActivityType, Prisma } from "@prisma/client"

interface LogActivityParams {
  userId: string
  action: ActivityType
  description: string
  restaurantId?: string
  metadata?: Prisma.InputJsonValue
}

export async function logActivity(params: LogActivityParams) {
  return db.activityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      description: params.description,
      restaurantId: params.restaurantId,
      metadata: params.metadata,
    },
  })
}
