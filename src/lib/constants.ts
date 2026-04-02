import type { PipelineStage, Priority, VisitType, TaskType, MeetingType, LossReason, Role } from "@prisma/client"
import {
  LayoutDashboard,
  Store,
  KanbanSquare,
  ClipboardList,
  CalendarDays,
  Heart,
  Map,
  BarChart2,
  Settings,
  UserCog,
  MapPin,
  Footprints,
  Activity,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────
// PIPELINE STAGES
// ─────────────────────────────────────────────────────────────

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  NOT_CONTACTED: "Not Contacted",
  NEEDS_VISIT: "Needs Visit",
  VISITED: "Visited",
  SPOKE_TO_BUYER: "Spoke to Buyer",
  SAMPLES_REQUESTED: "Samples Requested",
  PRICING_SENT: "Pricing Sent",
  FOLLOW_UP_NEEDED: "Follow-Up Needed",
  INTERESTED: "Interested",
  CUSTOMER: "Customer",
  LOST_LEAD: "Lost Lead",
}

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  NOT_CONTACTED: "bg-slate-100 text-slate-700",
  NEEDS_VISIT: "bg-blue-100 text-blue-700",
  VISITED: "bg-indigo-100 text-indigo-700",
  SPOKE_TO_BUYER: "bg-violet-100 text-violet-700",
  SAMPLES_REQUESTED: "bg-yellow-100 text-yellow-700",
  PRICING_SENT: "bg-orange-100 text-orange-700",
  FOLLOW_UP_NEEDED: "bg-red-100 text-red-700",
  INTERESTED: "bg-emerald-100 text-emerald-700",
  CUSTOMER: "bg-green-100 text-green-700",
  LOST_LEAD: "bg-gray-100 text-gray-500",
}

// Ordered list used for the pipeline kanban columns and bar
export const PIPELINE_STAGES_ORDERED: PipelineStage[] = [
  "NOT_CONTACTED",
  "NEEDS_VISIT",
  "VISITED",
  "SPOKE_TO_BUYER",
  "SAMPLES_REQUESTED",
  "PRICING_SENT",
  "FOLLOW_UP_NEEDED",
  "INTERESTED",
  "CUSTOMER",
  "LOST_LEAD",
]

// ─────────────────────────────────────────────────────────────
// PRIORITY
// ─────────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
}

// ─────────────────────────────────────────────────────────────
// VISIT TYPES
// ─────────────────────────────────────────────────────────────

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  WALK_IN: "Walk-In",
  SCHEDULED: "Scheduled Visit",
  FOLLOW_UP: "Follow-Up",
  SAMPLE_DROP: "Sample Drop-Off",
  PHONE_CALL: "Phone Call",
}

// ─────────────────────────────────────────────────────────────
// TASK TYPES
// ─────────────────────────────────────────────────────────────

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: "Call",
  REVISIT: "Revisit",
  SEND_PRICING: "Send Pricing",
  BRING_SAMPLE: "Bring Sample",
  ASK_FOR_BUYER: "Ask for Buyer",
  CONFIRM_MEETING: "Confirm Meeting",
  UPDATE_NOTE: "Update Note",
  OTHER: "Other",
}

// ─────────────────────────────────────────────────────────────
// MEETING TYPES
// ─────────────────────────────────────────────────────────────

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  INTRO: "Introductory Meeting",
  PRICING_DISCUSSION: "Pricing Discussion",
  SAMPLE_DROP: "Sample Drop-Off",
  FOLLOW_UP_CALL: "Follow-Up Call",
  ON_SITE_VISIT: "On-Site Visit",
}

// ─────────────────────────────────────────────────────────────
// LOSS REASONS
// ─────────────────────────────────────────────────────────────

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  PRICE: "Price too high",
  SUPPLIER_LOYALTY: "Loyal to current supplier",
  NO_NEED: "No need / not a fit",
  TIMING: "Wrong timing",
  NO_DECISION_MAKER: "Couldn't reach decision-maker",
  NO_RESPONSE: "Went dark / no response",
  SERVICE_ISSUE: "Service or quality concern",
  OTHER: "Other",
}

// ─────────────────────────────────────────────────────────────
// PRODUCT TAGS (preset list, extensible)
// ─────────────────────────────────────────────────────────────

export const PRODUCT_PRESETS = [
  "tomatoes",
  "heirloom tomatoes",
  "herbs",
  "lettuce",
  "specialty greens",
  "micro greens",
  "avocados",
  "onions",
  "garlic",
  "peppers",
  "seasonal produce",
  "specialty produce",
  "fruit",
  "bulk items",
  "premium items",
]

// ─────────────────────────────────────────────────────────────
// NAVIGATION — role-gated sidebar items
// ─────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "SALES_REP", "CONNECTOR"] as Role[],
  },
  {
    href: "/restaurants",
    label: "Restaurants",
    icon: Store,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: KanbanSquare,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/warm-leads",
    label: "Warm Leads",
    icon: Heart,
    roles: ["ADMIN", "SALES_REP", "CONNECTOR"] as Role[],
  },
  {
    href: "/visits",
    label: "Visits",
    icon: Footprints,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: ClipboardList,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/map",
    label: "Map",
    icon: Map,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/activity",
    label: "Activity",
    icon: Activity,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart2,
    roles: ["ADMIN", "SALES_REP"] as Role[],
  },
] as const

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/territories", label: "Territories", icon: MapPin },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const
