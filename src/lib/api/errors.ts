/**
 * Typed API error class.
 * Throw this anywhere in a route handler — the response helper catches it.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
