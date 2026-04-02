/**
 * Email service — thin wrapper around the Resend SDK.
 *
 * Usage:
 *   import { sendEmail } from "@/lib/email"
 *   await sendEmail({ to: "...", subject: "...", html: "..." })
 *
 * Behaviour:
 *   - Returns { ok: true, id } on success
 *   - Returns { ok: false, error } on failure — NEVER throws
 *   - Silently no-ops if RESEND_API_KEY is not configured (dev fallback)
 *   - Logs errors to console so they surface in server logs without
 *     crashing the calling route
 */

import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY
const fromAddress =
  process.env.RESEND_FROM_EMAIL ?? "Produce CRM <onboarding@resend.dev>"

// Lazy-initialise so the module can be imported without a key in tests/dev
let client: Resend | null = null
function getClient(): Resend | null {
  if (!apiKey) return null
  if (!client) client = new Resend(apiKey)
  return client
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getClient()
  if (!resend) {
    // No API key configured — log and skip without crashing
    console.warn("[email] RESEND_API_KEY not set — skipping email send:", opts.subject)
    return { ok: false, error: "Email not configured" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })

    if (error) {
      console.error("[email] Send failed:", error)
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[email] Unexpected error:", msg)
    return { ok: false, error: msg }
  }
}
