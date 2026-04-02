/**
 * Horizontal pipeline stage overview bar.
 * Each stage shows a count. Clicking navigates to filtered restaurant list.
 */

"use client"

import Link from "next/link"
import { PIPELINE_STAGES_ORDERED, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS } from "@/lib/constants"
import type { PipelineCounts } from "@/types"

interface PipelineBarProps {
  counts: PipelineCounts
}

export function PipelineBar({ counts }: PipelineBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Pipeline Overview</h2>
      <div className="flex gap-1 flex-wrap">
        {PIPELINE_STAGES_ORDERED.map((stage) => {
          const count = counts[stage] ?? 0
          return (
            <Link
              key={stage}
              href={`/restaurants?stage=${stage}`}
              className="group flex flex-col items-center gap-1 min-w-[70px] flex-1"
            >
              <div
                className={`w-full rounded px-2 py-1.5 text-center transition-opacity group-hover:opacity-80 ${PIPELINE_STAGE_COLORS[stage]}`}
              >
                <p className="text-sm font-semibold">{count}</p>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">
                {PIPELINE_STAGE_LABELS[stage]}
              </p>
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">{total} total restaurants</p>
    </div>
  )
}
