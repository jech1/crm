/**
 * Auth sync route.
 *
 * Called on first login when the user exists in Clerk but not in our DB.
 * Creates a User record with role and status determined by their email:
 *
 *   - Email in ADMIN_EMAILS env var → role=ADMIN, status=ACTIVE
 *   - Everyone else                 → role=SALES_REP, status=PENDING
 *
 * PENDING users are redirected to /pending to await admin approval.
 */

import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function GET() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    redirect("/sign-in")
  }

  // If user already exists, route based on status
  const existing = await db.user.findUnique({
    where: { clerkId },
    select: { status: true },
  })
  if (existing) {
    if (existing.status === "PENDING") redirect("/pending")
    if (existing.status === "DISABLED") redirect("/disabled")
    redirect("/dashboard")
  }

  // Fetch profile from Clerk
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(clerkId)

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ""
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    "New User"

  const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase())

  await db.user.create({
    data: {
      clerkId,
      name,
      email,
      avatarUrl: clerkUser.imageUrl,
      role: isAdminEmail ? "ADMIN" : "SALES_REP",
      status: isAdminEmail ? "ACTIVE" : "PENDING",
    },
  })

  if (isAdminEmail) {
    redirect("/dashboard")
  } else {
    redirect("/pending")
  }
}
