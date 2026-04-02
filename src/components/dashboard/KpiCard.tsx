/**
 * Single KPI stat card.
 * Shows a metric value, label, and an optional trend indicator.
 */

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  trend?: number // positive = up, negative = down
  urgent?: boolean // shows red highlight for actionable metrics
}

export function KpiCard({ label, value, icon: Icon, trend, urgent }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-3 md:p-5",
        urgent && Number(value) > 0 && "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p
            className={cn(
              "text-xl md:text-2xl font-bold mt-1",
              urgent && Number(value) > 0 ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-white",
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0",
            urgent && Number(value) > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-slate-100 dark:bg-slate-700",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              urgent && Number(value) > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
            )}
          />
        </div>
      </div>
      {trend !== undefined && (
        <p
          className={cn(
            "text-xs mt-2",
            trend > 0 ? "text-green-600 dark:text-green-400" : trend < 0 ? "text-red-500" : "text-slate-400",
          )}
        >
          {trend > 0 ? `+${trend}` : trend} vs last week
        </p>
      )}
    </div>
  )
}
