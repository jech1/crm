/**
 * /api/notifications
 *
 * GET   — fetch current user's notifications (newest first)
 * PATCH — mark notifications as read ({ all: true } or { id: string })
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get("unread") === "true"

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    })

    return ApiResponse.ok(notifications)
  })
}

export async function PATCH(req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const body = await req.json()

    if (body.all) {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })
    } else if (body.id) {
      await db.notification.update({
        where: { id: body.id, userId: user.id },
        data: { isRead: true },
      })
    }

    return ApiResponse.noContent()
  })
}
