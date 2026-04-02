"use client"

import Link from "next/link"
import { ExternalLink, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImportSearchResult } from "@/lib/services/google-places"

export interface SearchResultAnnotated extends ImportSearchResult {
  isDuplicate: boolean
  existingId: string | null
  duplicateReason: "place_id" | "phone" | "name_address" | null
}

interface ImportResultsTableProps {
  results: SearchResultAnnotated[]
  selectedIds: Set<string>
  onToggle: (placeId: string) => void
  onToggleAll: () => void
  allNonDupSelected: boolean
}

const DUPLICATE_REASON_LABELS: Record<string, string> = {
  place_id: "Same Google listing",
  phone: "Same phone number",
  name_address: "Same name & location",
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
      ★ {rating.toFixed(1)}
    </span>
  )
}

export function ImportResultsTable({
  results,
  selectedIds,
  onToggle,
  onToggleAll,
  allNonDupSelected,
}: ImportResultsTableProps) {
  const newCount = results.filter((r) => !r.isDuplicate).length
  const dupCount = results.filter((r) => r.isDuplicate).length

  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-3 border-b dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {results.length} results
          </span>
          {dupCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              <AlertCircle className="h-3 w-3" />
              {dupCount} already in CRM
            </span>
          )}
          {newCount > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {newCount} new
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allNonDupSelected}
                  onChange={onToggleAll}
                  className="rounded border-slate-300 dark:border-slate-600"
                  aria-label="Select all non-duplicate results"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">
                Address
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                Phone
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {results.map((result) => {
              const isSelected = selectedIds.has(result.placeId)
              const isDup = result.isDuplicate

              return (
                <tr
                  key={result.placeId}
                  className={cn(
                    "transition-colors",
                    isDup
                      ? "opacity-50 bg-slate-50 dark:bg-slate-900/30"
                      : isSelected
                        ? "bg-green-50 dark:bg-green-900/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/30",
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDup}
                      onChange={() => !isDup && onToggle(result.placeId)}
                      className="rounded border-slate-300 dark:border-slate-600 disabled:cursor-not-allowed"
                      aria-label={`Select ${result.name}`}
                    />
                  </td>

                  {/* Name */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "font-medium",
                          isDup
                            ? "text-slate-500 dark:text-slate-400"
                            : "text-slate-900 dark:text-white",
                        )}
                      >
                        {result.name}
                      </span>
                      {result.googleMapsUrl && (
                        <a
                          href={result.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-green-600 dark:hover:text-green-400 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Open ${result.name} in Google Maps`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {result.rating !== null && (
                      <div className="mt-0.5">
                        <StarRating rating={result.rating} />
                      </div>
                    )}
                    {/* Show address inline on small screens */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 md:hidden">
                      {result.city}, {result.state} {result.zip}
                    </p>
                  </td>

                  {/* Address (hidden on mobile) */}
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    <p className="truncate max-w-[200px]">{result.address}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {result.city}, {result.state} {result.zip}
                    </p>
                  </td>

                  {/* Phone */}
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell whitespace-nowrap">
                    {result.phone ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>

                  {/* Type */}
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {result.cuisineType || result.primaryType ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        {result.cuisineType ?? result.primaryType}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {isDup ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                          Already in CRM
                        </span>
                        {result.duplicateReason && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {DUPLICATE_REASON_LABELS[result.duplicateReason]}
                          </p>
                        )}
                        {result.existingId && (
                          <Link
                            href={`/restaurants/${result.existingId}`}
                            className="text-[10px] text-green-600 dark:text-green-400 hover:underline mt-0.5 block"
                          >
                            View record →
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        New
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
