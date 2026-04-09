/**
 * /api/admin/users/[id]
 *
 * PATCH — Update a user's status or role (admin only).
 *
 * Safeguards:
 *   - Admins cannot remove the last active admin
 *   - Admins cannot change their own status to DISABLED
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { accountApprovedTemplate } from "@/lib/email/templates"

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "DISABLED"]).optional(),
  // CONNECTOR is not in launch scope — only ADMIN and SALES_REP are assignable
  role: z.enum(["ADMIN", "SALES_REP"]).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return ApiResponse.handle(async () => {
    const { id } = await params
    const { user: actor } = await getAuthContext()

    if (actor.role !== "ADMIN") {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 })
    }

    const body = patchSchema.parse(await req.json())

    if (!body.status && !body.role) {
      throw Object.assign(new Error("No changes provided"), { statusCode: 400 })
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, name: true, email: true },
    })
    if (!target) throw Object.assign(new Error("User not found"), { statusCode: 404 })

    // Guard: cannot disable yourself
    if (body.status === "DISABLED" && id === actor.id) {
      throw Object.assign(new Error("You cannot disable your own account"), { statusCode: 400 })
    }

    // Guard: cannot demote or disable the last active admin — checked atomically
    const wouldRemoveAdmin =
      (body.status === "DISABLED" || body.status === "PENDING" || body.role === "SALES_REP") &&
      target.role === "ADMIN"

    const updated = await db.$transaction(async (tx) => {
      if (wouldRemoveAdmin) {
        const activeAdminCount = await tx.user.count({
          where: { role: "ADMIN", status: "ACTIVE" },
        })
        if (activeAdminCount <= 1) {
          throw Object.assign(
            new Error("Cannot remove the last active admin"),
            { statusCode: 400 }
          )
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          ...(body.status && { status: body.status }),
          ...(body.role && { role: body.role }),
        },
        select: { id: true, name: true, email: true, role: true, status: true },
      })
    })

    // Send account approved email when transitioning TO ACTIVE from a non-ACTIVE state
    if (body.status === "ACTIVE" && target.status !== "ACTIVE") {
      const { subject, html } = accountApprovedTemplate({ name: updated.name, email: updated.email })
      await sendEmail({ to: updated.email, subject, html })
    }

    return ApiResponse.ok(updated)
  })
}
