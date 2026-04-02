/**
 * Notifications page — accessible to ADMIN and SALES_REP.
 * Shows all in-app notifications for the current user with mark-as-read.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { NotificationsClient } from "./NotificationsClient"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/api/auth/sync")
  if (user.role === "CONNECTOR") redirect("/dashboard")

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${notifications.filter((n) => !n.isRead).length} unread`}
      />
      <NotificationsClient notifications={notifications} />
    </div>
  )
}
