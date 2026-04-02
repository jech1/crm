/**
 * Warm leads widget.
 * Shows the top 5 warm intros by priority with connector name and next action.
 */

import Link from "next/link"
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { WarmIntro } from "@prisma/client"
import type { RepSummary, RestaurantSummary } from "@/types"

interface WarmLeadsWidgetProps {
  warmLeads: (WarmIntro & {
    restaurant: RestaurantSummary
    addedBy: RepSummary
  })[]
}

export function WarmLeadsWidget({ warmLeads }: WarmLeadsWidgetProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Warm Leads</h2>
        <Link href="/warm-leads" className="text-xs text-green-600 dark:text-green-400 hover:underline">
          View all
        </Link>
      </div>

      {warmLeads.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No active warm leads.</p>
      ) : (
        <ul className="space-y-3">
          {warmLeads.map((intro) => (
            <li key={intro.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/restaurants/${intro.restaurant.id}`}
                    className="text-sm font-medium text-slate-900 dark:text-white hover:text-green-700 dark:hover:text-green-400 truncate block"
                  >
                    {intro.restaurant.name}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Via {intro.introducedBy}
                    {intro.contactName && ` → ${intro.contactName}`}
                  </p>
                  {intro.bestTimeToVisit && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Best time: {intro.bestTimeToVisit}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                    PRIORITY_COLORS[intro.priority],
                  )}
                >
                  {PRIORITY_LABELS[intro.priority]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
