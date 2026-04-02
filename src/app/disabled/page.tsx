/**
 * Disabled account page.
 * Shown to users whose accounts have been disabled by an admin.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@clerk/nextjs"
import { Ban } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Account Disabled" }

export default async function DisabledPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <Ban className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Account disabled
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Your account has been disabled. Please contact your admin to restore access.
        </p>

        <SignOutButton>
          <button className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
