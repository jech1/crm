"use client"

/**
 * Sidebar navigation.
 *
 * - Reads the current user's role to show/hide nav items
 * - Highlights the active route
 * - Admin section appears at the bottom behind a separator
 * - Logo + app name at top
 * - User name + role at bottom
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants"
import { Separator } from "@/components/ui/separator"
import type { Role } from "@prisma/client"

interface SidebarProps {
  userRole: Role
  userName: string
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b">
        <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        <span className="font-semibold text-slate-900 text-sm">Produce CRM</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 sidebar-scroll overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-green-50 text-green-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Admin section */}
        {userRole === "ADMIN" && (
          <>
            <Separator className="my-3" />
            <p className="px-3 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Admin</p>
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-green-50 text-green-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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

      {/* User info at bottom */}
      <div className="border-t px-4 py-3">
        <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
        <p className="text-xs text-slate-500 capitalize">{userRole.toLowerCase()}</p>
      </div>
    </aside>
  )
}
