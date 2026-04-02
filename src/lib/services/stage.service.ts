/**
 * Stage update service.
 *
 * Changing a restaurant's pipeline stage is a multi-step operation:
 *   1. Update the stage on the Restaurant record
 *   2. Write a StageHistory row
 *   3. If stage → CUSTOMER, set isCustomer = true
 *   4. Log an activity entry
 *   5. Recalculate opportunity score
 *
 * All steps run in a transaction so nothing is partially written.
 */

import { db } from "@/lib/db"
import { logActivity } from "./activity.service"
import { recalculateScore } from "./scoring.service"
import type { LossReason, PipelineStage } from "@prisma/client"
import { PIPELINE_STAGE_LABELS } from "@/lib/constants"

interface UpdateStageParams {
  restaurantId: string
  toStage: PipelineStage
  changedById: string
  notes?: string
  // Win data — supplied when toStage === "CUSTOMER"
  firstProduct?: string
  leadSource?: string
  warmIntroUsed?: boolean
  winNotes?: string
  // Loss data — supplied when toStage === "LOST_LEAD"
  lossReason?: LossReason
  lossNotes?: string
}

export async function updateStage(params: UpdateStageParams) {
  const {
    restaurantId, toStage, changedById, notes,
    firstProduct, leadSource, warmIntroUsed, winNotes,
    lossReason, lossNotes,
  } = params

  // Fetch current stage before the update
  const current = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { pipelineStage: true, name: true },
  })

  if (!current) throw new Error("Restaurant not found")

  const fromStage = current.pipelineStage

  // Skip if stage hasn't changed
  if (fromStage === toStage) return

  await db.$transaction([
    // 1. Update restaurant
    db.restaurant.update({
      where: { id: restaurantId },
      data: {
        pipelineStage: toStage,
        isCustomer: toStage === "CUSTOMER" ? true : undefined,
      },
    }),

    // 2. Write history
    db.stageHistory.create({
      data: {
        restaurantId,
        changedById,
        fromStage,
        toStage,
        notes,
      },
    }),
  ])

  // 3. Write WinRecord or LossRecord when transitioning to terminal stages
  if (toStage === "CUSTOMER") {
    await db.winRecord.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        repId: changedById,
        convertedAt: new Date(),
        firstProduct: firstProduct ?? null,
        leadSource: leadSource ?? null,
        warmIntroUsed: warmIntroUsed ?? false,
        notes: winNotes ?? null,
      },
      update: {
        repId: changedById,
        convertedAt: new Date(),
        firstProduct: firstProduct ?? null,
        leadSource: leadSource ?? null,
        warmIntroUsed: warmIntroUsed ?? false,
        notes: winNotes ?? null,
      },
    })
    // Remove any stale loss record if this account is being revived
    await db.lossRecord.deleteMany({ where: { restaurantId } })
  } else if (toStage === "LOST_LEAD" && lossReason) {
    await db.lossRecord.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        repId: changedById,
        reason: lossReason,
        notes: lossNotes ?? null,
        lostAt: new Date(),
      },
      update: {
        repId: changedById,
        reason: lossReason,
        notes: lossNotes ?? null,
        lostAt: new Date(),
      },
    })
    // Remove any stale win record
    await db.winRecord.deleteMany({ where: { restaurantId } })
  }

  // 4. Log activity (outside transaction — non-critical)
  await logActivity({
    userId: changedById,
    restaurantId,
    action: toStage === "CUSTOMER" ? "LEAD_WON" : toStage === "LOST_LEAD" ? "LEAD_LOST" : "STAGE_CHANGED",
    description: `Stage changed from ${PIPELINE_STAGE_LABELS[fromStage]} to ${PIPELINE_STAGE_LABELS[toStage]}`,
    metadata: { fromStage: fromStage as string, toStage: toStage as string },
  })

  // 5. Recalculate score
  await recalculateScore(restaurantId)
}
