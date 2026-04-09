/**
 * Simple in-memory sliding window rate limiter.
 *
 * This is intentionally lightweight — no Redis, no external deps.
 * Appropriate for a small-team, single-process / low-concurrency deployment.
 *
 * On serverless (Vercel), each function instance maintains its own store, so
 * the effective limit per user is higher across multiple instances. That is
 * acceptable for launch: even a loose cap prevents runaway scripted abuse.
 *
 * Usage:
 *   const result = rateLimit(`${userId}:search`, 10, 60_000)
 *   if (result.limited) return ApiResponse.tooManyRequests(result.retryAfterSecs)
 */

/** Timestamps of recent requests, keyed by `userId:endpoint`. */
const store = new Map<string, number[]>()

export interface RateLimitResult {
  limited: boolean
  /** Seconds until the oldest request leaves the window (only meaningful when limited). */
  retryAfterSecs: number
}

/**
 * @param key        Unique identifier for this (user, endpoint) pair.
 * @param limit      Max requests allowed within the window.
 * @param windowMs   Rolling window duration in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  // Evict expired timestamps
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff)

  if (hits.length >= limit) {
    // Oldest hit determines when a slot opens
    const retryAfterMs = hits[0] + windowMs - now
    return { limited: true, retryAfterSecs: Math.ceil(retryAfterMs / 1000) }
  }

  hits.push(now)
  store.set(key, hits)
  return { limited: false, retryAfterSecs: 0 }
}
