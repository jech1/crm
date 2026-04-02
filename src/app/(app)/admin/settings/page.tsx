/**
 * Admin — Settings.
 * Account info, pipeline stage reference, notification preferences (scaffold),
 * and a danger zone section.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { Separator } from "@/components/ui/separator"
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGES_ORDERED } from "@/lib/constants"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const me = await db.user.findUnique({
    where: { clerkId },
    select: { role: true, name: true, email: true },
  })
  if (!me || me.role !== "ADMIN") redirect("/dashboard")

  const [userCount, restaurantCount] = await Promise.all([
    db.user.count(),
    db.restaurant.count({ where: { isArchived: false } }),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Application configuration and preferences" />

      {/* Account */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Account</h2>
        <div className="space-y-0">
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-slate-700">Name</p>
              <p className="text-xs text-slate-400">Your display name in the CRM</p>
            </div>
            <p className="text-sm font-medium text-slate-900">{me.name}</p>
          </div>
          <Separator />
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-slate-700">Email</p>
              <p className="text-xs text-slate-400">Managed via Clerk</p>
            </div>
            <p className="text-sm text-slate-500">{me.email}</p>
          </div>
          <Separator />
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-slate-700">Role</p>
              <p className="text-xs text-slate-400">Full administrative access</p>
            </div>
            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded">
              ADMIN
            </span>
          </div>
        </div>
      </section>

      {/* App stats */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">App Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{userCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Team members</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{restaurantCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Active restaurants</p>
          </div>
        </div>
      </section>

      {/* Pipeline stages reference */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Pipeline Stages</h2>
        <p className="text-xs text-slate-400 mb-4">
          Stages are defined in the codebase as a Prisma enum. Custom stage editing is planned
          for a future release.
        </p>
        <div className="space-y-1">
          {PIPELINE_STAGES_ORDERED.map((stage, i) => (
            <div key={stage} className="flex items-center gap-3 py-1">
              <span className="text-xs text-slate-300 w-4 text-right font-mono">{i + 1}</span>
              <span className="text-xs text-slate-700">{PIPELINE_STAGE_LABELS[stage]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Notification preferences */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Email Notifications</h2>
        <p className="text-xs text-slate-400 mb-4">
          Email reminders are coming soon. Toggles shown for planning purposes.
        </p>
        <div className="space-y-0">
          {[
            {
              label: "Overdue task digest",
              sub: "Daily summary of overdue follow-ups sent to each rep",
            },
            {
              label: "Upcoming meeting reminders",
              sub: "24-hour alerts for scheduled meetings",
            },
            {
              label: "Warm lead activity",
              sub: "Notify reps when a warm intro is added for their restaurant",
            },
            {
              label: "Stage change to Customer",
              sub: "Celebrate new customer conversions with the team",
            },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.sub}</p>
                </div>
                <div
                  className="w-9 h-5 bg-slate-200 rounded-full cursor-not-allowed"
                  title="Coming in Phase 10"
                />
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Integrations</h2>
        <div className="space-y-0">
          {[
            {
              name: "Clerk",
              description: "Authentication and user management",
              status: "Connected",
              color: "text-green-600",
            },
            {
              name: "Supabase / PostgreSQL",
              description: "Primary database",
              status: "Connected",
              color: "text-green-600",
            },
            {
              name: "Google Places API",
              description: "Restaurant discovery and import",
              status: "Configured",
              color: "text-green-600",
            },
            {
              name: "Uploadthing",
              description: "File storage for visit photos and documents",
              status: "Pending",
              color: "text-slate-400",
            },
            {
              name: "Resend",
              description: "Transactional email for reminders",
              status: "Coming soon",
              color: "text-slate-400",
            },
            {
              name: "Mapbox GL JS",
              description: "Interactive territory and restaurant map",
              status: "Coming soon",
              color: "text-slate-400",
            },
          ].map((integration, i, arr) => (
            <div key={integration.name}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-700">{integration.name}</p>
                  <p className="text-xs text-slate-400">{integration.description}</p>
                </div>
                <span className={`text-xs font-medium ${integration.color}`}>
                  {integration.status}
                </span>
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-red-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-slate-400 mb-4">
          Irreversible actions. Use with caution.
        </p>
        <div className="space-y-0">
          {[
            {
              label: "Export all data",
              sub: "Download a full CSV of restaurants, visits, and activity",
            },
            {
              label: "Archive inactive restaurants",
              sub: "Bulk-archive restaurants with no activity in 90+ days",
            },
          ].map((action, i, arr) => (
            <div key={action.label}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-700">{action.label}</p>
                  <p className="text-xs text-slate-400">{action.sub}</p>
                </div>
                <button
                  disabled
                  className="text-xs text-slate-400 border border-slate-200 rounded px-3 py-1.5 cursor-not-allowed opacity-60"
                >
                  Coming soon
                </button>
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
