/**
 * Warm Leads — list of all active warm introductions.
 * REPs see their restaurants' intros. ADMINs see all.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { cn, formatDate } from "@/lib/utils"
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/constants"
import { Heart, Phone, Mail, Calendar } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Warm Leads" }

export default async function WarmLeadsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")

  const warmIntros = await db.warmIntro.findMany({
    where: {
      isActive: true,
      ...(user.role === "SALES_REP" && { restaurant: { repId: user.id } }),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      restaurant: {
        select: { id: true, name: true, city: true, state: true, pipelineStage: true },
      },
      addedBy: { select: { id: true, name: true } },
    },
  })

  // Group by priority for display
  const urgent = warmIntros.filter((w) => w.priority === "URGENT")
  const high = warmIntros.filter((w) => w.priority === "HIGH")
  const rest = warmIntros.filter((w) => w.priority === "MEDIUM" || w.priority === "LOW")

  return (
    <div>
      <PageHeader
        title="Warm Leads"
        description={`${warmIntros.length} active warm introduction${warmIntros.length !== 1 ? "s" : ""}`}
      />

      {warmIntros.length === 0 ? (
        <div className="rounded-xl border bg-white p-12">
          <EmptyState
            icon={Heart}
            title="No warm leads yet"
            description="Warm introductions help your team get a foot in the door. Add one from any restaurant's profile page."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {urgent.length > 0 && (
            <IntroGroup title={`Urgent (${urgent.length})`} intros={urgent} variant="urgent" />
          )}
          {high.length > 0 && (
            <IntroGroup title={`High Priority (${high.length})`} intros={high} variant="high" />
          )}
          {rest.length > 0 && (
            <IntroGroup title={`Other (${rest.length})`} intros={rest} variant="default" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-component ──────────────────────────────────────────────

type WarmIntroWithRelations = Awaited<
  ReturnType<typeof db.warmIntro.findMany>
>[number] & {
  restaurant: { id: string; name: string; city: string; state: string; pipelineStage: string }
  addedBy: { id: string; name: string }
}

interface IntroGroupProps {
  title: string
  intros: WarmIntroWithRelations[]
  variant: "urgent" | "high" | "default"
}

function IntroGroup({ title, intros, variant }: IntroGroupProps) {
  return (
    <div>
      <h2
        className={cn(
          "text-xs font-semibold uppercase tracking-wide mb-3",
          variant === "urgent"
            ? "text-red-600"
            : variant === "high"
              ? "text-orange-600"
              : "text-slate-500",
        )}
      >
        {title}
      </h2>
      <div className="rounded-xl border bg-white divide-y">
        {intros.map((intro) => (
          <div key={intro.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Restaurant + priority */}
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/restaurants/${intro.restaurant.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-green-700"
                  >
                    {intro.restaurant.name}
                  </Link>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      PRIORITY_COLORS[intro.priority],
                    )}
                  >
                    {PRIORITY_LABELS[intro.priority]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  {intro.restaurant.city}, {intro.restaurant.state}
                </p>

                {/* Intro source */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  <div>
                    <p className="text-slate-500 font-medium">Introduced by</p>
                    <p className="text-slate-700">
                      {intro.introducedBy}
                      {intro.relationship && (
                        <span className="text-slate-400"> · {intro.relationship}</span>
                      )}
                    </p>
                  </div>

                  {intro.contactName && (
                    <div>
                      <p className="text-slate-500 font-medium">Contact</p>
                      <p className="text-slate-700">
                        {intro.contactName}
                        {intro.contactRole && (
                          <span className="text-slate-400"> · {intro.contactRole}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Contact details */}
                {(intro.contactPhone || intro.contactEmail) && (
                  <div className="flex items-center gap-4 mt-2">
                    {intro.contactPhone && (
                      <a
                        href={`tel:${intro.contactPhone}`}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-700"
                      >
                        <Phone className="h-3 w-3" />
                        {intro.contactPhone}
                      </a>
                    )}
                    {intro.contactEmail && (
                      <a
                        href={`mailto:${intro.contactEmail}`}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-700"
                      >
                        <Mail className="h-3 w-3" />
                        {intro.contactEmail}
                      </a>
                    )}
                  </div>
                )}

                {/* What to pitch */}
                {intro.whatToPitch && (
                  <div className="mt-3 rounded-md bg-green-50 px-3 py-2">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Pitch angle</p>
                    <p className="text-xs text-slate-700">{intro.whatToPitch}</p>
                  </div>
                )}

                {/* Product interests */}
                {intro.productInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {intro.productInterests.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Best time + meeting date */}
                <div className="flex items-center gap-4 mt-3">
                  {intro.bestTimeToVisit && (
                    <p className="text-xs text-slate-400">
                      Best time: <span className="text-slate-600">{intro.bestTimeToVisit}</span>
                    </p>
                  )}
                  {intro.meetingDate && (
                    <p className="flex items-center gap-1 text-xs text-blue-600">
                      <Calendar className="h-3 w-3" />
                      Meeting: {formatDate(intro.meetingDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-3">
              Added by {intro.addedBy.name} · {formatDate(intro.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
