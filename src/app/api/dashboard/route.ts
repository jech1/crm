/**
 * Dashboard data route.
 *
 * Returns all data needed to render the dashboard in a single request.
 * Admin sees all data. Rep sees only data for their assigned restaurants.
 */

import { type NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { ApiResponse } from "@/lib/api/response"
import { db } from "@/lib/db"
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  addDays,
} from "date-fns"

export async function GET(_req: NextRequest) {
  return ApiResponse.handle(async () => {
    const { user } = await getAuthContext()
    const isAdmin = user.role === "ADMIN"

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)

    // For reps, scope everything to their assigned restaurants
    const repRestaurantFilter = isAdmin
      ? { isArchived: false }
      : { repId: user.id, isArchived: false }

    const [
      totalRestaurants,
      addedThisWeek,
      followUpsDue,
      meetingsThisWeek,
      warmLeads,
      customersWonThisMonth,
      lostThisMonth,
      visitsThisWeek,
      pipelineCounts,
      upcomingMeetings,
      followUpQueue,
      topWarmLeads,
      recentActivity,
      opportunityHighlights,
    ] = await Promise.all([
      // KPIs
      db.restaurant.count({ where: repRestaurantFilter }),

      db.restaurant.count({
        where: { ...repRestaurantFilter, createdAt: { gte: weekStart } },
      }),

      db.task.count({
        where: {
          assignedToId: isAdmin ? undefined : user.id,
          isCompleted: false,
          dueDate: { lte: now },
        },
      }),

      db.meeting.count({
        where: {
          ownerId: isAdmin ? undefined : user.id,
          scheduledAt: { gte: weekStart, lte: weekEnd },
          isCompleted: false,
        },
      }),

      db.warmIntro.count({
        where: {
          isActive: true,
          restaurant: repRestaurantFilter,
        },
      }),

      db.winRecord.count({
        where: { convertedAt: { gte: monthStart } },
      }),

      db.lossRecord.count({
        where: { lostAt: { gte: monthStart } },
      }),

      db.visit.count({
        where: {
          repId: isAdmin ? undefined : user.id,
          visitDate: { gte: weekStart, lte: weekEnd },
        },
      }),

      // Pipeline stage breakdown
      db.restaurant.groupBy({
        by: ["pipelineStage"],
        where: repRestaurantFilter,
        _count: { _all: true },
      }),

      // Upcoming meetings (next 7 days)
      db.meeting.findMany({
        where: {
          ownerId: isAdmin ? undefined : user.id,
          scheduledAt: { gte: now, lte: addDays(now, 7) },
          isCompleted: false,
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: {
          restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } },
          owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),

      // Follow-up queue (overdue + due in next 3 days)
      db.task.findMany({
        where: {
          assignedToId: isAdmin ? undefined : user.id,
          isCompleted: false,
          dueDate: { lte: addDays(now, 3) },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
        include: {
          restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } },
          assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),

      // Top warm leads by priority
      db.warmIntro.findMany({
        where: {
          isActive: true,
          restaurant: repRestaurantFilter,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 5,
        include: {
          restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } },
          addedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),

      // Recent activity feed
      db.activityLog.findMany({
        where: isAdmin ? {} : { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          restaurant: { select: { id: true, name: true, city: true, pipelineStage: true } },
        },
      }),

      // Opportunity highlights
      db.restaurant.findMany({
        where: { ...repRestaurantFilter, isCustomer: false },
        orderBy: { opportunityScore: "desc" },
        take: 5,
        select: { id: true, name: true, opportunityScore: true, pipelineStage: true },
      }),
    ])

    // Convert groupBy result to a plain object keyed by stage
    const pipelineCountsMap: Record<string, number> = {}
    for (const row of pipelineCounts) {
      pipelineCountsMap[row.pipelineStage] = row._count._all
    }

    return ApiResponse.ok({
      kpis: {
        totalRestaurants,
        addedThisWeek,
        followUpsDue,
        meetingsThisWeek,
        warmLeads,
        customersWonThisMonth,
        lostThisMonth,
        visitsThisWeek,
      },
      pipelineCounts: pipelineCountsMap,
      upcomingMeetings,
      followUpQueue,
      topWarmLeads,
      recentActivity,
      opportunityHighlights,
    })
  })
}
