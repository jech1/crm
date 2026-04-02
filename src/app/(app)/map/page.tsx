/**
 * Map — territory overview and restaurant geographic distribution.
 * Full Mapbox GL JS integration is planned for Phase 9.
 * Currently shows territory breakdown and restaurant counts by city.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { Map, MapPin, Building2 } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Map" }

export default async function MapPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const repFilter = user.role === "SALES_REP" ? { repId: user.id } : {}

  const [territories, cityGroups, geoCount] = await Promise.all([
    db.territory.findMany({
      include: {
        rep: { select: { id: true, name: true } },
        _count: { select: { restaurants: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.restaurant.groupBy({
      by: ["city", "state"],
      where: { ...repFilter, isArchived: false },
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: 20,
    }),
    db.restaurant.count({ where: { ...repFilter, isArchived: false, lat: { not: null } } }),
  ])

  return (
    <div>
      <PageHeader
        title="Map"
        description="Territory coverage and restaurant geographic distribution"
      />

      {/* Map canvas placeholder */}
      <div className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 h-80 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Fake map dots */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { top: "30%", left: "25%" },
            { top: "45%", left: "40%" },
            { top: "35%", left: "55%" },
            { top: "55%", left: "30%" },
            { top: "60%", left: "65%" },
            { top: "25%", left: "70%" },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-green-400 opacity-60"
              style={pos}
            />
          ))}
        </div>

        <Map className="h-10 w-10 text-slate-400 mb-3 relative z-10" />
        <p className="text-slate-200 font-semibold text-base relative z-10">
          Interactive map view coming soon
        </p>
        <p className="text-slate-400 text-sm mt-1 relative z-10">
          {geoCount} restaurant{geoCount !== 1 ? "s" : ""} with GPS coordinates
        </p>
        <p className="text-slate-600 text-xs mt-2 relative z-10">
          Restaurant pins · territory overlays · rep heatmaps
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Territories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Territories ({territories.length})
            </h2>
            {user.role === "ADMIN" && (
              <Link
                href="/admin/territories"
                className="text-xs text-green-700 hover:underline"
              >
                Manage →
              </Link>
            )}
          </div>

          {territories.length === 0 ? (
            <div className="rounded-xl border bg-white p-8">
              <EmptyState
                icon={MapPin}
                title="No territories defined"
                description={
                  user.role === "ADMIN"
                    ? "Set up territories to assign regions to your sales reps."
                    : "No territories have been configured yet."
                }
                action={
                  user.role === "ADMIN" ? (
                    <Link
                      href="/admin/territories"
                      className="text-sm text-green-700 hover:underline"
                    >
                      Set up territories →
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              {territories.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border bg-white p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.rep ? t.rep.name : "No rep assigned"}
                    </p>
                    {t.cities.length > 0 && (
                      <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                        {t.cities.slice(0, 4).join(", ")}
                        {t.cities.length > 4 && ` +${t.cities.length - 4} more`}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right ml-4">
                    <p className="text-2xl font-bold text-slate-900">{t._count.restaurants}</p>
                    <p className="text-[10px] text-slate-400">restaurants</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top cities */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Top Cities
          </h2>
          {cityGroups.length === 0 ? (
            <div className="rounded-xl border bg-white p-8">
              <EmptyState
                icon={Building2}
                title="No restaurants yet"
                description="Add restaurants to see geographic distribution."
              />
            </div>
          ) : (
            <div className="rounded-xl border bg-white divide-y">
              {cityGroups.map((c) => {
                const max = cityGroups[0]._count._all
                const pct = Math.round((c._count._all / max) * 100)
                return (
                  <div key={`${c.city}-${c.state}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-32 shrink-0">
                      <p className="text-sm text-slate-700">{c.city}</p>
                      <p className="text-xs text-slate-400">{c.state}</p>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-6 text-right shrink-0">
                      {c._count._all}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
