/**
 * Restaurant detail / profile page — server component.
 *
 * Layout (two-column on desktop):
 *   Left (wide): Profile header, Visit history, Notes, Activity timeline
 *   Right (narrow): Contacts, Warm intros, Tasks, Product interests, Competitor notes
 */

import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getRestaurantAccess } from "@/lib/auth"
import { ProfileHeader } from "@/components/restaurants/RestaurantProfile/ProfileHeader"
import { VisitHistory } from "@/components/restaurants/RestaurantProfile/VisitHistory"
import { NotesSection } from "@/components/restaurants/RestaurantProfile/NotesSection"
import { ContactsSection } from "@/components/restaurants/RestaurantProfile/ContactsSection"
import { StageBadge } from "@/components/restaurants/StageBadge"
import { formatDate, formatRelativeTime } from "@/lib/utils"
import { RestaurantTaskSection } from "@/components/tasks/RestaurantTaskSection"
import { TeamSection } from "@/components/restaurants/RestaurantProfile/TeamSection"
import { MeetingsSection } from "@/components/restaurants/RestaurantProfile/MeetingsSection"
import { WarmIntrosSection } from "@/components/restaurants/RestaurantProfile/WarmIntrosSection"
import { SamplesSection } from "@/components/restaurants/RestaurantProfile/SamplesSection"
import type { Metadata } from "next"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const restaurant = await db.restaurant.findUnique({ where: { id }, select: { name: true } })
  return { title: restaurant?.name ?? "Restaurant" }
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true, name: true },
  })
  if (!user) redirect("/api/auth/sync")

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    include: {
      rep: { select: { id: true, name: true, email: true, avatarUrl: true } },
      territory: { select: { id: true, name: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      visits: {
        orderBy: { visitDate: "desc" },
        include: { rep: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      meetings: {
        orderBy: [{ isCompleted: "asc" }, { scheduledAt: "asc" }],
        include: { owner: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        take: 20,
      },
      tasks: {
        orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }],
        include: { assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        take: 30,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      warmIntros: {
        where: { isActive: true },
        orderBy: { priority: "desc" },
        include: { addedBy: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      samples: { orderBy: { sampleDate: "desc" } },
      productInterests: true,
      competitorNote: true,
      stageHistory: { orderBy: { changedAt: "desc" }, take: 10 },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      _count: { select: { visits: true, tasks: true, warmIntros: true, meetings: true } },
      supportingReps: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { addedAt: "asc" },
      },
      creditAttributions: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { percentage: "desc" },
      },
    },
  })

  if (!restaurant || restaurant.isArchived) notFound()

  // Determine access level (checks supporting rep membership)
  const access = await getRestaurantAccess(id, user.id, user.role, restaurant.repId)
  if (access === "none") redirect("/restaurants")

  const canEdit = access === "primary" || access === "admin"
  const canLog = true // access is always supporting/primary/admin after the "none" redirect above
  const isAdmin = user.role === "ADMIN"

  // For admin and primary rep: fetch active users not already on this restaurant's team,
  // so the "Add supporting rep" dropdown has the correct options.
  const alreadyOnTeam = [
    restaurant.repId,
    ...restaurant.supportingReps.map((sr) => sr.userId),
  ].filter((id): id is string => id !== null && id !== undefined)

  const availableReps = canEdit
    ? await db.user.findMany({
        where: {
          status: "ACTIVE",
          role: { in: ["ADMIN", "SALES_REP"] },
          id: { notIn: alreadyOnTeam },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : []

  return (
    <div className="space-y-4">
      {/* Profile header — full width */}
      <ProfileHeader restaurant={restaurant} canEdit={canEdit} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column (wider) */}
        <div className="lg:col-span-2 space-y-4">
          <VisitHistory visits={restaurant.visits} restaurantId={id} canLog={canLog} />
          <NotesSection notes={restaurant.notes} restaurantId={id} />

          {/* Stage history */}
          {restaurant.stageHistory.length > 0 && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Stage History</h2>
              <ul className="space-y-2">
                {restaurant.stageHistory.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-slate-400 dark:text-slate-500 w-28 shrink-0">{formatDate(h.changedAt)}</span>
                    <div className="flex items-center gap-2">
                      {h.fromStage && (
                        <>
                          <StageBadge stage={h.fromStage} />
                          <span className="text-slate-400 dark:text-slate-500">→</span>
                        </>
                      )}
                      <StageBadge stage={h.toStage} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Activity timeline */}
          {restaurant.activities.length > 0 && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Activity</h2>
              <ul className="space-y-3">
                {restaurant.activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 w-24">{formatRelativeTime(a.createdAt)}</span>
                    <p className="text-slate-600 dark:text-slate-400">{a.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <TeamSection
            restaurantId={id}
            primaryRep={restaurant.rep}
            supportingReps={restaurant.supportingReps}
            creditAttributions={restaurant.creditAttributions}
            canManageTeam={canEdit}
            availableReps={availableReps}
          />
          <ContactsSection contacts={restaurant.contacts} restaurantId={id} canEdit={canEdit} />
          <MeetingsSection
            meetings={restaurant.meetings}
            restaurantId={id}
            restaurantName={restaurant.name}
            canLog={canLog}
          />

          {/* Warm intros */}
          <WarmIntrosSection
            restaurantId={id}
            restaurantName={restaurant.name}
            warmIntros={restaurant.warmIntros}
            canAddWarmIntro={true}
          />

          {/* Samples */}
          <SamplesSection
            restaurantId={id}
            samples={restaurant.samples}
            canLog={canLog}
          />

          {/* Tasks — open + recently completed */}
          <RestaurantTaskSection
            tasks={restaurant.tasks}
            restaurantId={id}
            restaurantName={restaurant.name}
            canLog={canLog}
          />

          {/* Operational info */}
          {(restaurant.deliveriesPerWeek != null ||
            restaurant.desiredDeliveryTime ||
            restaurant.deliveryLocation ||
            restaurant.paymentMethod ||
            restaurant.billingTerms ||
            restaurant.yearsInBusiness != null ||
            restaurant.isReferral ||
            restaurant.creditAppSent ||
            restaurant.additionalNotes ||
            restaurant.followUpNotes) && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Account Details</h2>
              <dl className="space-y-2 text-sm">
                {restaurant.deliveriesPerWeek != null && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Deliveries/week</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{restaurant.deliveriesPerWeek}</dd>
                  </div>
                )}
                {restaurant.desiredDeliveryTime && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Preferred time</dt>
                    <dd className="text-slate-800">{restaurant.desiredDeliveryTime}</dd>
                  </div>
                )}
                {restaurant.deliveryLocation && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Delivery location</dt>
                    <dd className="text-slate-800">{restaurant.deliveryLocation}</dd>
                  </div>
                )}
                {restaurant.paymentMethod && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Payment</dt>
                    <dd className="text-slate-800">{restaurant.paymentMethod}</dd>
                  </div>
                )}
                {restaurant.billingTerms && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Billing terms</dt>
                    <dd className="text-slate-800">{restaurant.billingTerms}</dd>
                  </div>
                )}
                {restaurant.yearsInBusiness != null && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Years in business</dt>
                    <dd className="text-slate-800">{restaurant.yearsInBusiness}</dd>
                  </div>
                )}
                {restaurant.isReferral && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Referral</dt>
                    <dd className="text-slate-800">
                      {restaurant.referredBy ? `Via ${restaurant.referredBy}` : "Yes"}
                    </dd>
                  </div>
                )}
                {restaurant.creditAppSent && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Credit app</dt>
                    <dd className="text-slate-800 text-green-700 font-medium">Sent</dd>
                  </div>
                )}
                {restaurant.additionalNotes && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Notes</dt>
                    <dd className="text-slate-800 dark:text-slate-200 whitespace-pre-line">{restaurant.additionalNotes}</dd>
                  </div>
                )}
                {restaurant.followUpNotes && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0 w-36">Follow-up notes</dt>
                    <dd className="text-slate-800 dark:text-slate-200 whitespace-pre-line">{restaurant.followUpNotes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Product interests */}
          {restaurant.productInterests.length > 0 && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Product Interests</h2>
              <div className="flex flex-wrap gap-1.5">
                {restaurant.productInterests.map((pi) => (
                  <span key={pi.id} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium">
                    {pi.product}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Competitor note */}
          {restaurant.competitorNote && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Competitor Intel</h2>
              <div className="space-y-2 text-sm">
                {restaurant.competitorNote.currentSupplier && (
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700">Current supplier: </span>
                    {restaurant.competitorNote.currentSupplier}
                  </p>
                )}
                {restaurant.competitorNote.complaints && (
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700">Complaints: </span>
                    {restaurant.competitorNote.complaints}
                  </p>
                )}
                {restaurant.competitorNote.whyMightSwitch && (
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700">Why switch: </span>
                    {restaurant.competitorNote.whyMightSwitch}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
