"use client"

/**
 * ImportFlow — main orchestrator for the restaurant import UX.
 *
 * State machine (simplified):
 *   idle → searching → results_shown → importing → done
 *
 * This component manages search state, selection state, and import result.
 * Child components handle the form and table rendering.
 */

import { useState } from "react"
import Link from "next/link"
import {
  Download,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImportSearchForm, type SearchFormValues } from "./ImportSearchForm"
import {
  ImportResultsTable,
  type SearchResultAnnotated,
} from "./ImportResultsTable"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Rep {
  id: string
  name: string
  email: string
}

interface ImportResult {
  importedCount: number
  skippedCount: number
  importedIds: string[]
  skipped: { placeId: string; name: string; reason: string; existingId?: string }[]
}

interface ImportFlowProps {
  reps: Rep[]
  currentUserId: string
  isAdmin: boolean
}

const PIPELINE_STAGE_OPTIONS = [
  { value: "NOT_CONTACTED", label: "Not Contacted" },
  { value: "NEEDS_VISIT", label: "Needs Visit" },
  { value: "VISITED", label: "Visited" },
  { value: "SPOKE_TO_BUYER", label: "Spoke to Buyer" },
  { value: "SAMPLES_REQUESTED", label: "Samples Requested" },
  { value: "PRICING_SENT", label: "Pricing Sent" },
  { value: "FOLLOW_UP_NEEDED", label: "Follow-Up Needed" },
  { value: "INTERESTED", label: "Interested" },
]

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ImportFlow({ reps, currentUserId, isAdmin }: ImportFlowProps) {
  // ── Search state ─────────────────────────────────────────────
  const [lastSearchValues, setLastSearchValues] = useState<SearchFormValues | null>(null)
  const [results, setResults] = useState<SearchResultAnnotated[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // ── Selection state ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Import options ───────────────────────────────────────────
  const [assignRepId, setAssignRepId] = useState<string>(
    isAdmin ? "" : currentUserId,
  )
  const [initialStage, setInitialStage] = useState("NOT_CONTACTED")

  // ── Import result ────────────────────────────────────────────
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // ── Derived values ───────────────────────────────────────────
  const nonDuplicates = results.filter((r) => !r.isDuplicate)
  const allNonDupSelected =
    nonDuplicates.length > 0 &&
    nonDuplicates.every((r) => selectedIds.has(r.placeId))
  const selectedCount = selectedIds.size

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  async function handleSearch(values: SearchFormValues, pageToken?: string) {
    setIsSearching(true)
    setSearchError(null)
    if (!pageToken) {
      // New search — clear previous state
      setResults([])
      setSelectedIds(new Set())
      setNextPageToken(undefined)
      setImportResult(null)
      setHasSearched(true)
    }
    setLastSearchValues(values)

    try {
      const res = await fetch("/api/restaurants/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, pageToken }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? "Search failed. Check your connection.")
      }

      const newResults: SearchResultAnnotated[] = json.data.results
      setResults((prev) => (pageToken ? [...prev, ...newResults] : newResults))
      setNextPageToken(json.data.nextPageToken)
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Search failed. Please try again.",
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken || !lastSearchValues || isSearching) return
    await handleSearch(lastSearchValues, nextPageToken)
  }

  function toggleSelect(placeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

  function toggleSelectAll() {
    if (allNonDupSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(nonDuplicates.map((r) => r.placeId)))
    }
  }

  async function handleImport() {
    if (selectedCount === 0) return

    const toImport = results.filter((r) => selectedIds.has(r.placeId))
    setIsImporting(true)
    setSearchError(null)

    try {
      const res = await fetch("/api/restaurants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurants: toImport,
          repId: assignRepId || undefined,
          initialStage,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? "Import failed. Please try again.")
      }

      setImportResult(json.data)
      setSelectedIds(new Set())

      // Re-mark newly imported items as duplicates in the current results
      const importedSet = new Set(
        toImport.map((r) => r.placeId),
      )
      setResults((prev) =>
        prev.map((r) =>
          importedSet.has(r.placeId)
            ? { ...r, isDuplicate: true, duplicateReason: "place_id" }
            : r,
        ),
      )
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Import failed. Please try again.",
      )
    } finally {
      setIsImporting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Search form */}
      <ImportSearchForm
        onSearch={(values) => handleSearch(values)}
        isSearching={isSearching && !nextPageToken}
      />

      {/* Search error */}
      {searchError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {searchError}
            </p>
            {searchError.includes("GOOGLE_PLACES_API_KEY") && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Add <code className="bg-red-100 dark:bg-red-900 px-1 rounded">GOOGLE_PLACES_API_KEY</code> to your{" "}
                <code className="bg-red-100 dark:bg-red-900 px-1 rounded">.env.local</code> file.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Import success banner */}
      {importResult && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-800 dark:text-green-300">
                {importResult.importedCount === 0
                  ? "No new restaurants imported"
                  : `${importResult.importedCount} restaurant${importResult.importedCount !== 1 ? "s" : ""} imported successfully`}
              </p>
              {importResult.skippedCount > 0 && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  {importResult.skippedCount} skipped — already in your CRM
                </p>
              )}
              {importResult.importedCount > 0 && (
                <div className="flex items-center gap-3 mt-3">
                  <Link
                    href="/restaurants"
                    className="inline-flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
                  >
                    View all restaurants
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  {importResult.importedIds[0] && (
                    <Link
                      href={`/restaurants/${importResult.importedIds[0]}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
                    >
                      View first import →
                    </Link>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-green-500 hover:text-green-700 dark:hover:text-green-300"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* No results state */}
      {hasSearched && !isSearching && results.length === 0 && !searchError && (
        <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-10 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No restaurants found. Try a different city, ZIP code, or keyword.
          </p>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <>
          <ImportResultsTable
            results={results}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            allNonDupSelected={allNonDupSelected}
          />

          {/* Load more */}
          {nextPageToken && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isSearching}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Load more results
              </Button>
            </div>
          )}

          {/* Import toolbar — shown when something is selected */}
          {nonDuplicates.length > 0 && (
            <div
              className={`
                rounded-xl border p-4
                ${
                  selectedCount > 0
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-white dark:bg-slate-800 dark:border-slate-700"
                }
              `}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Selection count */}
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
                  {selectedCount === 0
                    ? "Select restaurants to import"
                    : `${selectedCount} restaurant${selectedCount !== 1 ? "s" : ""} selected`}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Rep assignment (admin only) */}
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Label
                      htmlFor="assignRep"
                      className="text-sm text-slate-600 dark:text-slate-400 shrink-0"
                    >
                      Assign to
                    </Label>
                    <Select
                      value={assignRepId}
                      onValueChange={setAssignRepId}
                    >
                      <SelectTrigger id="assignRep" className="w-44">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {reps.map((rep) => (
                          <SelectItem key={rep.id} value={rep.id}>
                            {rep.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Initial stage */}
                <div className="flex items-center gap-2 shrink-0">
                  <Label
                    htmlFor="initialStage"
                    className="text-sm text-slate-600 dark:text-slate-400 shrink-0"
                  >
                    Stage
                  </Label>
                  <Select value={initialStage} onValueChange={setInitialStage}>
                    <SelectTrigger id="initialStage" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Import button */}
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isImporting}
                  className="shrink-0"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isImporting
                    ? "Importing…"
                    : `Import ${selectedCount > 0 ? selectedCount : ""} Restaurant${selectedCount !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
