"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants"
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut, Bell, Search } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { GlobalSearch } from "./GlobalSearch"
import { useLogoNavigation } from "@/hooks/useLogoNavigation"
import type { Role } from "@prisma/client"

interface CollapsibleSidebarProps {
  userRole: Role
  userName: string
  userEmail?: string
  avatarUrl?: string | null
}

export function CollapsibleSidebar({ userRole, userName, userEmail }: CollapsibleSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Poll for unread notifications — ADMIN and SALES_REP both get notifications
  useEffect(() => {
    if (userRole === "CONNECTOR") return

    async function checkNotifications() {
      try {
        // generate creates any new overdue/reminder notifications and returns count
        const res = await fetch("/api/notifications/generate", { method: "POST" })
        const json = await res.json()
        setUnreadCount(json?.data?.unreadCount ?? 0)
      } catch {
        // silently fail — badge just stays at 0
      }
    }

    checkNotifications()
    const interval = setInterval(checkNotifications, 60_000)
    return () => clearInterval(interval)
  }, [userRole])

  // Persist dark mode across navigations
  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "dark") {
      document.documentElement.classList.add("dark")
      setDark(true)
    }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const { handleLogoClick } = useLogoNavigation()

  const notificationsLinkClass = (active: boolean) =>
    cn(
      "relative flex items-center rounded-md text-sm transition-colors",
      collapsed ? "justify-center h-9 w-full px-0" : "gap-3 px-3 py-2",
      active
        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
    )

  return (
    <aside
      className={cn(
        "hidden md:flex relative flex-col min-h-screen border-r transition-all duration-300 ease-in-out",
        "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-6 z-10",
          "w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700",
          "bg-white dark:bg-slate-900 flex items-center justify-center",
          "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
          "transition-colors shadow-sm",
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo — navigates to dashboard */}
      <Link
        href="/dashboard"
        onClick={handleLogoClick}
        aria-label="Produce CRM — go to dashboard"
        title="Dashboard"
        className={cn(
          "flex items-center h-14 border-b border-slate-200 dark:border-slate-700",
          "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
          collapsed ? "justify-center px-0" : "gap-2.5 px-4",
        )}
      >
        <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-slate-900 dark:text-white text-sm whitespace-nowrap">
            Produce CRM
          </span>
        )}
      </Link>

      {/* Global search trigger */}
      {userRole !== "CONNECTOR" && (
        <div className={cn("px-2 pt-3 pb-1")}>
          <GlobalSearch
            trigger={
              collapsed ? (
                <button
                  title="Search (⌘K)"
                  className="flex items-center justify-center h-9 w-full rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              ) : (
                <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs hover:border-slate-300 transition-colors">
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">Search…</span>
                  <kbd className="text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 font-mono">
                    ⌘K
                  </kbd>
                </button>
              )
            }
          />
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors",
                collapsed ? "justify-center h-9 w-full px-0" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}

        {/* Notifications — visible to ADMIN + SALES_REP */}
        {userRole !== "CONNECTOR" && (
          <Link
            href="/notifications"
            title={collapsed ? "Notifications" : undefined}
            className={notificationsLinkClass(pathname.startsWith("/notifications"))}
          >
            <span className="relative shrink-0">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="flex-1">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </span>
            )}
          </Link>
        )}

        {/* Admin-only section */}
        {userRole === "ADMIN" && (
          <>
            <div className={cn("border-t border-slate-100 dark:border-slate-800 my-3")} />
            {!collapsed && (
              <p className="px-3 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Admin
              </p>
            )}
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md text-sm transition-colors",
                    collapsed ? "justify-center h-9 w-full px-0" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Bottom: dark mode + user info */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-2 space-y-1">
        <button
          onClick={toggleDark}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(
            "flex items-center w-full rounded-md text-sm transition-colors",
            "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
            collapsed ? "justify-center h-9 px-0" : "gap-3 px-3 py-2",
          )}
        >
          {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && (dark ? "Light mode" : "Dark mode")}
        </button>

        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          title="Sign out"
          className={cn(
            "flex items-center w-full rounded-md text-sm transition-colors",
            "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
            collapsed ? "justify-center h-9 px-0" : "gap-3 px-3 py-2",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                {initials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{userName}</p>
              {userEmail && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
              )}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-1">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                {initials}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
