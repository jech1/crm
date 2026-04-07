/**
 * Visit history section on the restaurant profile.
 * Shows all visits in reverse chronological order with outcome and next action.
 */

import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { VISIT_TYPE_LABELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { MapPin, Plus } from "lucide-react"
import type { Visit } from "@prisma/client"
import type { RepSummary } from "@/types"

interface VisitHistoryProps {
  visits: (Visit & { rep: RepSummary })[]
  restaurantId: string
  canLog: boolean
}

export function VisitHistory({ visits, restaurantId, canLog }: VisitHistoryProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Visit History ({visits.length})</h2>
        {canLog && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/visits/new?restaurantId=${restaurantId}`}>
              <Plus className="h-3.5 w-3.5" />
              Log Visit
            </Link>
          </Button>
        )}
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="h-8 w-8 text-slate-200 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No visits logged yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visits.map((visit) => (
            <li key={visit.id} className="border-l-2 border-slate-100 dark:border-slate-700 pl-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {VISIT_TYPE_LABELS[visit.visitType]}
                    </span>
                    {visit.contactedPerson && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">with {visit.contactedPerson}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(visit.visitDate)}</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{visit.rep.name}</span>
              </div>

              {visit.outcome && (
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{visit.outcome}</p>
              )}
              {visit.objections && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Objection: {visit.objections}</p>
              )}
              {visit.nextAction && (
                <p className="text-xs text-green-600 font-medium mt-1">Next: {visit.nextAction}</p>
              )}
              {visit.productsDiscussed.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {visit.productsDiscussed.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
