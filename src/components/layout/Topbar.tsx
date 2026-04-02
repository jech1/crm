"use client"

/**
 * Top navigation bar.
 * Contains global search input and the Clerk UserButton for account/sign-out.
 */

import { UserButton } from "@clerk/nextjs"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function Topbar() {
  return (
    <header className="h-14 border-b bg-white flex items-center px-6 gap-4">
      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search restaurants, contacts…"
          className="pl-8 h-8 text-sm bg-slate-50 border-slate-200"
        />
      </div>
      <div className="ml-auto">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  )
}
