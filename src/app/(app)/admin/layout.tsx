/**
 * Admin section layout.
 * Enforces ADMIN role — non-admins are redirected to the dashboard.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { role: true },
  })
  if (!user) redirect("/api/auth/sync")
  if (user.role !== "ADMIN") redirect("/dashboard")

  return <>{children}</>
}
