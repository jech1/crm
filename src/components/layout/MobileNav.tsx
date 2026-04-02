"use client"

/**
 * MobileNav — mobile-only top bar + slide-over drawer.
 *
 * Rendered only on < md breakpoints (hidden on md+ via header/drawer classNames).
 * Contains identical nav items as CollapsibleSidebar, plus global search and
 * notification badge for ADMIN + SALES_REP users.
 *
 * Accessibility:
 *   - Drawer has role="dialog" + aria-modal + aria-label
 *   - Hamburger button has aria-expanded + aria-controls
 *   - Escape key closes the drawer
 *   - Focus moves to close button on open; returns to hamburger on close
 *   - Body scroll locked while drawer is open
 */

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Bell, Moon, Sun, LogOut, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants"
import { useClerk } from "@clerk/nextjs"
import { GlobalSearch } from "./GlobalSearch"
import type { Role } from "@prisma/client"

interface MobileNavProps {
  userRole: Role
  userName: string
  userEmail?: string
}

export function MobileNav({ userRole, userName, userEmail }: MobileNavProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Auto-close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Poll for unread notifications — ADMIN and SALES_REP
  useEffect(() => {
    if (userRole === "CONNECTOR") return

    async function checkNotifications() {
      try {
        const res = await fetch("/api/notifications/generate", { method: "POST" })
        const json = await res.json()
        setUnreadCount(json?.data?.unreadCount ?? 0)
      } catch {}
    }

    checkNotifications()
    const id = setInterval(checkNotifications, 60_000)
    return () => clearInterval(id)
  }, [userRole])

  // Sync dark mode from localStorage on mount
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") setDark(true)
  }, [])

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Move focus into drawer on open; return to trigger on close
  useEffect(() => {
    if (open) {
      closeRef.current?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [open])

  function closeDrawer() {
    setOpen(false)
  }

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900 md:hidden">
        {/* Logo */}
        <div className="flex items-center gap-2" aria-label="Produce CRM" role="img">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md bg-green-600"
            aria-hidden="true"
          >
            <span className="text-xs font-bold text-white">P</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Produce CRM</span>
        </div>

        {/* Right: search + notifications + hamburger */}
        <div className="flex items-center gap-0.5">
          {/* Search button (ADMIN + SALES_REP) */}
          {userRole !== "CONNECTOR" && (
            <GlobalSearch
              trigger={
                <button
                  aria-label="Search (⌘K)"
                  className="relative flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Search className="h-5 w-5" />
                </button>
              }
            />
          )}

          {/* Notification bell (ADMIN + SALES_REP) */}
          {userRole !== "CONNECTOR" && (
            <Link
              href="/notifications"
              aria-label={
                unreadCount > 0
                  ? `Notifications — ${unreadCount} unread`
                  : "Notifications"
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          <button
            ref={triggerRef}
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="mobile-drawer"
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Drawer ───────────────────────────────────────────────────── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl",
          "transition-transform duration-300 ease-in-out",
          "dark:bg-slate-900 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
          <div className="flex items-center gap-2.5" aria-hidden="true">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-600">
              <span className="text-xs font-bold text-white">P</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Produce CRM</span>
          </div>
          <button
            ref={closeRef}
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4"
        >
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-green-50 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {/* Notifications — ADMIN + SALES_REP */}
          {userRole !== "CONNECTOR" && (
            <Link
              href="/notifications"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/notifications")
                  ? "bg-green-50 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
              )}
            >
              <span className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="flex flex-1 items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    {unreadCount}
                  </span>
                )}
              </span>
            </Link>
          )}

          {/* Admin section */}
          {userRole === "ADMIN" && (
            <>
              <div className="my-3 border-t border-slate-100 dark:border-slate-800" />
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Admin
              </p>

              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-green-50 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* Bottom: dark mode + sign out + user chip */}
        <div className="shrink-0 space-y-1 border-t border-slate-200 p-2 dark:border-slate-700">
          <button
            onClick={toggleDark}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {dark
              ? <Sun className="h-4 w-4 shrink-0" />
              : <Moon className="h-4 w-4 shrink-0" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>

          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>

          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {userName}
              </p>
              {userEmail && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {userEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
