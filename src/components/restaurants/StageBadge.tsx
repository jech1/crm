/**
 * Colored badge showing a restaurant's pipeline stage.
 * Used in tables, profile headers, and kanban cards.
 */

import { cn } from "@/lib/utils"
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS } from "@/lib/constants"
import type { PipelineStage } from "@prisma/client"

interface StageBadgeProps {
  stage: PipelineStage
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        PIPELINE_STAGE_COLORS[stage],
        className,
      )}
    >
      {PIPELINE_STAGE_LABELS[stage]}
    </span>
  )
}
