/**
 * Standard API response helpers.
 * Every route handler returns through one of these so the shape is consistent.
 */

import { NextResponse } from "next/server"
import { ApiError } from "./errors"
import { ZodError } from "zod"

export const ApiResponse = {
  ok<T>(data: T, status = 200) {
    return NextResponse.json({ data }, { status })
  },

  created<T>(data: T) {
    return NextResponse.json({ data }, { status: 201 })
  },

  noContent() {
    return new NextResponse(null, { status: 204 })
  },

  error(message: string, status = 500) {
    return NextResponse.json({ error: message }, { status })
  },

  notFound(message = "Not found") {
    return NextResponse.json({ error: message }, { status: 404 })
  },

  forbidden(message = "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 })
  },

  conflict<T extends object>(data: T) {
    return NextResponse.json(data, { status: 409 })
  },

  tooManyRequests(retryAfterSecs = 60) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSecs) } },
    )
  },

  validationError(error: ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten().fieldErrors },
      { status: 422 },
    )
  },

  /**
   * Wraps a route handler to automatically catch ApiError and ZodError.
   * Use at the top of every route: return withErrorHandler(() => { ... })
   */
  handle(fn: () => Promise<NextResponse>) {
    return fn().catch((err: unknown) => {
      if (err instanceof ApiError) {
        return ApiResponse.error(err.message, err.status)
      }
      if (err instanceof ZodError) {
        return ApiResponse.validationError(err)
      }
      console.error("[API Error]", err)
      return ApiResponse.error("Internal server error", 500)
    })
  },
}
