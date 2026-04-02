/**
 * Extended types that combine Prisma models with their relations.
 * These are the shapes returned by API routes and used in components.
 */

import type {
  Restaurant,
  User,
  Contact,
  Visit,
  WarmIntro,
  Meeting,
  Task,
  Note,
  Sample,
  ProductInterest,
  CompetitorNote,
  StageHistory,
  ActivityLog,
  Territory,
} from "@prisma/client"

// ─── Nested relation types ────────────────────────────────────

export type RepSummary = Pick<User, "id" | "name" | "email" | "avatarUrl">

export type RestaurantSummary = Pick<Restaurant, "id" | "name" | "city" | "pipelineStage">

// ─── Restaurant list item (used in the table) ─────────────────

export type RestaurantListItem = Restaurant & {
  rep: RepSummary | null
  territory: Pick<Territory, "id" | "name"> | null
  _count: {
    visits: number
    tasks: number
    warmIntros: number
  }
}

// ─── Restaurant full profile ──────────────────────────────────

export type RestaurantProfile = Restaurant & {
  rep: RepSummary | null
  territory: Pick<Territory, "id" | "name"> | null
  contacts: Contact[]
  visits: (Visit & { rep: RepSummary })[]
  meetings: (Meeting & { owner: RepSummary })[]
  tasks: (Task & { assignedTo: RepSummary })[]
  notes: (Note & { author: RepSummary })[]
  warmIntros: (WarmIntro & { addedBy: RepSummary })[]
  samples: Sample[]
  productInterests: ProductInterest[]
  competitorNote: CompetitorNote | null
  stageHistory: (StageHistory & { changedBy?: RepSummary })[]
  activities: (ActivityLog & { user: RepSummary })[]
  _count: {
    visits: number
    tasks: number
    warmIntros: number
    meetings: number
  }
}

// ─── Dashboard data shape ──────────────────────────────────────

export type DashboardKpis = {
  totalRestaurants: number
  addedThisWeek: number
  followUpsDue: number
  meetingsThisWeek: number
  warmLeads: number
  customersWonThisMonth: number
  lostThisMonth: number
  visitsThisWeek: number
}

export type PipelineCounts = Record<string, number>

export type DashboardData = {
  kpis: DashboardKpis
  pipelineCounts: PipelineCounts
  upcomingMeetings: (Meeting & {
    restaurant: RestaurantSummary
    owner: RepSummary
  })[]
  followUpQueue: (Task & {
    restaurant: RestaurantSummary | null
    assignedTo: RepSummary
  })[]
  topWarmLeads: (WarmIntro & {
    restaurant: RestaurantSummary
    addedBy: RepSummary
  })[]
  recentActivity: (ActivityLog & {
    user: RepSummary
    restaurant: RestaurantSummary | null
  })[]
  opportunityHighlights: Pick<Restaurant, "id" | "name" | "opportunityScore" | "pipelineStage">[]
}

// ─── API list response ─────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
