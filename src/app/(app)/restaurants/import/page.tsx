/**
 * Restaurant import page — server component wrapper.
 *
 * Fetches the list of active reps to populate the assignment dropdown,
 * then delegates all interactive state to the ImportFlow client component.
 *
 * Access: ADMIN and REP only (CONNECTORs cannot import).
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { can } from "@/lib/auth"
import { ImportFlow } from "@/components/restaurants/ImportFlow"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Import Restaurants" }

export default async function ImportPage() {
  // Import feature disabled for launch.
  // To re-enable: remove this redirect, then restore the original function body:
  //
  //   const { userId: clerkId } = await auth()
  //   if (!clerkId) redirect("/sign-in")
  //   const user = await db.user.findUnique({ where: { clerkId: clerkId! }, select: { id: true, role: true } })
  //   if (!user) redirect("/api/auth/sync")
  //   if (!can.createRestaurant(user.role)) redirect("/restaurants")
  //   const reps = await db.user.findMany({
  //     where: { status: "ACTIVE", role: { in: ["ADMIN", "SALES_REP"] } },
  //     select: { id: true, name: true, email: true },
  //     orderBy: { name: "asc" },
  //   })
  //   return (
  //     <div>
  //       <div className="mb-6">
  //         <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Import Restaurants</h1>
  //         <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
  //           Search Google Places to find restaurants in your territory, then select and import them into the CRM.
  //         </p>
  //       </div>
  //       <ImportFlow reps={reps} currentUserId={user.id} isAdmin={user.role === "ADMIN"} />
  //     </div>
  //   )
  redirect("/restaurants")
}
