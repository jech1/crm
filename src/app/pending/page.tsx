/**
 * Pending approval page.
 * Shown to users who signed up but haven't been approved by an admin yet.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { SignOutButton } from "@clerk/nextjs"
import { Clock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Pending Approval" }

export default async function PendingPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { name: true, email: true, status: true },
  })

  // If they've been approved, send them to the app
  if (!user || user.status === "ACTIVE") redirect("/dashboard")
  if (user.status === "DISABLED") redirect("/disabled")

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Waiting for approval
        </h1>
        <p className="text-slate-500 text-sm mb-1">
          Hi {user.name} — your account has been created.
        </p>
        <p className="text-slate-500 text-sm mb-6">
          An admin needs to approve your access before you can use the app.
          You&apos;ll be able to sign in once approved.
        </p>

        <div className="rounded-lg bg-slate-50 border px-4 py-3 text-sm text-slate-600 mb-6">
          Signed in as <span className="font-medium">{user.email}</span>
        </div>

        <SignOutButton>
          <button className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
