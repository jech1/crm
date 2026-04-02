"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SearchFormValues {
  query: string
  keyword: string
  radiusMiles: number
  maxResults: number
}

interface ImportSearchFormProps {
  onSearch: (values: SearchFormValues) => void
  isSearching: boolean
}

const RADIUS_OPTIONS = [
  { value: 1, label: "1 mile" },
  { value: 2, label: "2 miles" },
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
]

export function ImportSearchForm({ onSearch, isSearching }: ImportSearchFormProps) {
  const [query, setQuery] = useState("")
  const [keyword, setKeyword] = useState("")
  const [radiusMiles, setRadiusMiles] = useState(5)
  const [maxResults] = useState(20)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    onSearch({ query: query.trim(), keyword: keyword.trim(), radiusMiles, maxResults })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        Search Parameters
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Area input */}
        <div className="sm:col-span-1 space-y-1.5">
          <Label htmlFor="query">Area (city, ZIP, or address)</Label>
          <Input
            id="query"
            placeholder="e.g. Phoenix AZ or 85254"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
        </div>

        {/* Keyword input */}
        <div className="space-y-1.5">
          <Label htmlFor="keyword">
            Keyword{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="keyword"
            placeholder="e.g. fine dining, sushi, farm to table"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {/* Radius */}
        <div className="space-y-1.5">
          <Label>Radius</Label>
          <Select
            value={String(radiusMiles)}
            onValueChange={(v) => setRadiusMiles(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isSearching ? "Searching…" : "Search Google Places"}
        </Button>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Returns up to 20 results · Radius is a soft location bias
        </p>
      </div>
    </form>
  )
}
