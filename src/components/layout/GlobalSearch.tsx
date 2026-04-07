"use client"

/**
 * GlobalSearch — command-palette-style search modal.
 *
 * Opens on:
 *   - Clicking the search button in the sidebar / mobile top bar
 *   - Pressing ⌘K (Mac) or Ctrl+K (Windows/Linux)
 *
 * Searches restaurants, contacts, and notes via GET /api/search?q=...
 * Results are debounced (300 ms) and grouped by entity type.
 * Keyboard navigation: ↑ ↓ to move, Enter to navigate, Esc to close.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Store, User, FileText, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StageBadge } from "@/components/restaurants/StageBadge"
import type { PipelineStage } from "@prisma/client"

// ── Types returned by /api/search ────────────────────────────────────

interface SearchRestaurant {
  id: string
  name: string
  address: string
  city: string
  state: string
  pipelineStage: PipelineStage
  rep?: { name: string } | null
}

interface SearchContact {
  id: string
  name: string
  email?: string | null
  role?: string | null
  restaurantId: string
  restaurant: { name: string }
}

interface SearchNote {
  id: string
  body: string
  createdAt: string
  restaurantId: string
  restaurant: { name: string }
  author: { name: string }
}

interface SearchResults {
  restaurants: SearchRestaurant[]
  contacts: SearchContact[]
  notes: SearchNote[]
}

// ── Flat result item for keyboard navigation ─────────────────────────

interface ResultItem {
  key: string
  href: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  badge?: React.ReactNode
}

function buildItems(results: SearchResults): ResultItem[] {
  const items: ResultItem[] = []

  for (const r of results.restaurants) {
    items.push({
      key: `restaurant-${r.id}`,
      href: `/restaurants/${r.id}`,
      label: r.name,
      sublabel: `${r.address}, ${r.city}, ${r.state}${r.rep ? ` · ${r.rep.name}` : ""}`,
      icon: <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />,
      badge: <StageBadge stage={r.pipelineStage} />,
    })
  }

  for (const c of results.contacts) {
    items.push({
      key: `contact-${c.id}`,
      href: `/restaurants/${c.restaurantId}`,
      label: c.name,
      sublabel: `${c.restaurant.name}${c.email ? ` · ${c.email}` : ""}`,
      icon: <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />,
    })
  }

  for (const n of results.notes) {
    items.push({
      key: `note-${n.id}`,
      href: `/restaurants/${n.restaurantId}`,
      label: n.body,
      sublabel: `Note · ${n.restaurant.name} · ${n.author.name}`,
      icon: <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />,
    })
  }

  return items
}

// ── Component ─────────────────────────────────────────────────────────

interface GlobalSearchProps {
  /** Trigger element (button, icon, etc.) passed by the parent */
  trigger: React.ReactNode
}

export function GlobalSearch({ trigger }: GlobalSearchProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── ⌘K / Ctrl+K shortcut ─────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Reset state on close
  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("")
      setResults(null)
      setFocusedIdx(0)
    }
    setOpen(next)
  }

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        setResults(json.data ?? null)
        setFocusedIdx(0)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    runSearch(val)
  }

  const allItems = results ? buildItems(results) : []
  const totalResults =
    (results?.restaurants.length ?? 0) +
    (results?.contacts.length ?? 0) +
    (results?.notes.length ?? 0)

  // Keyboard navigation inside input
  function handleKeyDown(e: React.KeyboardEvent) {
    if (allItems.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIdx((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setFocusedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = allItems[focusedIdx]
      if (item) {
        router.push(item.href)
        handleOpenChange(false)
      }
    }
  }

  return (
    <>
      {/* Trigger (passed in from sidebar) */}
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Global search</DialogTitle>
          </DialogHeader>

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 text-slate-400 animate-spin" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="Search restaurants, contacts, notes…"
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults(null) }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[420px]">
            {query.length >= 2 && !loading && totalResults === 0 && (
              <div className="py-10 text-center text-sm text-slate-400">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {query.length < 2 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Type at least 2 characters to search
              </div>
            )}

            {results && totalResults > 0 && (() => {
              let itemIndex = 0
              return (
                <div className="py-1">
                  {/* Restaurants */}
                  {results.restaurants.length > 0 && (
                    <section>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Restaurants
                      </p>
                      {results.restaurants.map((r) => {
                        const idx = itemIndex++
                        const item = allItems[idx]
                        return (
                          <button
                            key={item.key}
                            onClick={() => { router.push(item.href); handleOpenChange(false) }}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              focusedIdx === idx ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            {item.icon}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                              {item.sublabel && (
                                <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                              )}
                            </div>
                            {item.badge && <div className="shrink-0">{item.badge}</div>}
                          </button>
                        )
                      })}
                    </section>
                  )}

                  {/* Contacts */}
                  {results.contacts.length > 0 && (
                    <section>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Contacts
                      </p>
                      {results.contacts.map((c) => {
                        const idx = itemIndex++
                        const item = allItems[idx]
                        return (
                          <button
                            key={item.key}
                            onClick={() => { router.push(item.href); handleOpenChange(false) }}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              focusedIdx === idx ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            {item.icon}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                              {item.sublabel && (
                                <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </section>
                  )}

                  {/* Notes */}
                  {results.notes.length > 0 && (
                    <section>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Notes
                      </p>
                      {results.notes.map((n) => {
                        const idx = itemIndex++
                        const item = allItems[idx]
                        return (
                          <button
                            key={item.key}
                            onClick={() => { router.push(item.href); handleOpenChange(false) }}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              focusedIdx === idx ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            {item.icon}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{n.body}</p>
                              {item.sublabel && (
                                <p className="text-xs text-slate-400 truncate mt-0.5">{item.sublabel}</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </section>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Footer hint */}
          {allItems.length > 0 && (
            <div className="border-t px-4 py-2 flex items-center gap-3 text-[10px] text-slate-400">
              <span>↑↓ navigate</span>
              <span>·</span>
              <span>↵ open</span>
              <span>·</span>
              <span>Esc close</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
