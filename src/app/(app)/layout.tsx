/**
 * Protected app layout.
 *
 * All routes inside (app)/ share this layout.
 * Fetches the current user and enforces status-based access:
 *   - PENDING  → /pending  (approval required)
 *   - DISABLED → /disabled (account disabled)
 *   - ACTIVE   → render app shell
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { CollapsibleSidebar } from "@/components/layout/CollapsibleSidebar"
import { MobileNav } from "@/components/layout/MobileNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    redirect("/sign-in")
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  if (!user) {
    redirect("/api/auth/sync")
  }

  if (user.status === "PENDING") {
    redirect("/pending")
  }

  if (user.status === "DISABLED") {
    redirect("/disabled")
  }

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar — hidden on mobile via CollapsibleSidebar internals */}
      <CollapsibleSidebar userRole={user.role} userName={user.name} userEmail={user.email} />

      {/*
        Right-side column: stacks mobile top bar above the scrollable content.
        min-w-0 prevents the flex child from overflowing its container.
      */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar + drawer — hidden on md+ */}
        <MobileNav userRole={user.role} userName={user.name} userEmail={user.email} />

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
