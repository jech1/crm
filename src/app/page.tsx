/**
 * Root page — redirects authenticated users to /dashboard.
 * Unauthenticated users are caught by middleware and sent to /sign-in.
 */

import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/dashboard")
}
