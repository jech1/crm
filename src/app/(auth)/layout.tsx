/**
 * Auth route group layout.
 * Needed so Next.js correctly recognises the (auth) route group.
 * No chrome — just renders children directly.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
