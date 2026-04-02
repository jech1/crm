import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns"

// Tailwind class merging — used everywhere in components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date formatting ─────────────────────────────────────────

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy")
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a")
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDueDate(date: Date | string): string {
  const d = new Date(date)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  if (isPast(d)) return `Overdue — ${format(d, "MMM d")}`
  return format(d, "MMM d")
}

// ─── String helpers ───────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "…"
}

// Normalise a phone number to digits only for comparison
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

// ─── URL helpers ──────────────────────────────────────────────

export function restaurantHref(id: string) {
  return `/restaurants/${id}`
}

export function visitHref(id: string) {
  return `/visits/${id}`
}
