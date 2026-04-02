/**
 * Email HTML templates for the three CRM notification flows.
 *
 * Each function returns a plain HTML string suitable for passing
 * directly to sendEmail({ html }).  No external template engine needed.
 */

// ── Shared helpers ─────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.producecrm.com"

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                🌿 Produce CRM
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                You're receiving this because you have an account on Produce CRM.<br/>
                <a href="${BASE_URL}/settings" style="color:#64748b;text-decoration:underline;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 22px;background:#16a34a;color:#ffffff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">${label}</a>`
}

function muted(text: string): string {
  return `<p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">${text}</p>`
}

// ── Template 1: Account Approved ───────────────────────────────────────────

export interface AccountApprovedData {
  name: string
  email: string
}

export function accountApprovedTemplate(data: AccountApprovedData): {
  subject: string
  html: string
} {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Welcome aboard, ${data.name}! 🎉
    </h1>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Your Produce CRM account has been approved. You can now log in and start
      managing your restaurant outreach pipeline.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;padding:16px 20px;width:100%;margin:16px 0;">
      <tr>
        <td>
          <p style="margin:0;color:#14532d;font-size:14px;font-weight:600;">What you can do:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#15803d;font-size:14px;line-height:1.8;">
            <li>View and manage your assigned restaurants</li>
            <li>Log visits, notes, and meetings</li>
            <li>Track your pipeline and follow-up queue</li>
            <li>Coordinate warm intros with your team</li>
          </ul>
        </td>
      </tr>
    </table>
    ${btn(`${BASE_URL}/dashboard`, "Go to Dashboard")}
    ${muted(`Signed in as ${data.email}`)}
  `
  return {
    subject: "Your Produce CRM account is approved",
    html: layout("Account Approved — Produce CRM", body),
  }
}

// ── Template 2: Meeting Scheduled ─────────────────────────────────────────

export interface MeetingScheduledData {
  ownerName: string
  meetingTitle: string
  restaurantName: string
  restaurantId: string
  scheduledAt: Date
  durationMins?: number | null
  location?: string | null
  meetingType: string
  notes?: string | null
}

export function meetingScheduledTemplate(data: MeetingScheduledData): {
  subject: string
  html: string
} {
  const dateStr = new Date(data.scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const durationLine = data.durationMins
    ? `<tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:110px;">Duration</td><td style="color:#0f172a;font-size:13px;padding:4px 0;">${data.durationMins} minutes</td></tr>`
    : ""

  const locationLine = data.location
    ? `<tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:110px;">Location</td><td style="color:#0f172a;font-size:13px;padding:4px 0;">${data.location}</td></tr>`
    : ""

  const notesSection = data.notes
    ? `<div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:16px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Notes</p><p style="margin:0;color:#334155;font-size:14px;line-height:1.5;">${data.notes}</p></div>`
    : ""

  const body = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">
      Meeting Scheduled
    </h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">
      Hi ${data.ownerName}, your meeting has been scheduled.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px 20px;width:100%;">
      <tr>
        <td colspan="2" style="padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${data.meetingTitle}</p>
          <p style="margin:2px 0 0;font-size:13px;color:#16a34a;font-weight:500;">${data.restaurantName}</p>
        </td>
      </tr>
      <tr><td style="padding-top:10px;" colspan="2"></td></tr>
      <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:110px;">Type</td><td style="color:#0f172a;font-size:13px;padding:4px 0;">${data.meetingType}</td></tr>
      <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:110px;">Date &amp; Time</td><td style="color:#0f172a;font-size:13px;padding:4px 0;">${dateStr}</td></tr>
      ${durationLine}
      ${locationLine}
    </table>
    ${notesSection}
    ${btn(`${BASE_URL}/restaurants/${data.restaurantId}`, "View Restaurant")}
    ${muted("You can manage this meeting from the restaurant profile or calendar.")}
  `

  return {
    subject: `Meeting scheduled: ${data.meetingTitle} — ${data.restaurantName}`,
    html: layout("Meeting Scheduled — Produce CRM", body),
  }
}

// ── Template 3: Overdue Task Digest ───────────────────────────────────────

export interface OverdueTaskItem {
  title: string
  restaurantName: string
  restaurantId: string
  dueDate: Date
}

export interface OverdueTaskDigestData {
  recipientName: string
  tasks: OverdueTaskItem[]
}

export function overdueTaskDigestTemplate(data: OverdueTaskDigestData): {
  subject: string
  html: string
} {
  const count = data.tasks.length
  const taskRows = data.tasks
    .slice(0, 10)
    .map((t) => {
      const dueStr = new Date(t.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 0;">
          <p style="margin:0;font-size:14px;font-weight:500;color:#0f172a;">${t.title}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#16a34a;">
            <a href="${BASE_URL}/restaurants/${t.restaurantId}" style="color:#16a34a;text-decoration:none;font-weight:500;">${t.restaurantName}</a>
          </p>
        </td>
        <td style="padding:10px 0 10px 16px;text-align:right;white-space:nowrap;">
          <span style="font-size:12px;color:#dc2626;font-weight:600;">Due ${dueStr}</span>
        </td>
      </tr>`
    })
    .join("")

  const moreNote =
    count > 10
      ? `<p style="margin:12px 0 0;color:#94a3b8;font-size:12px;">…and ${count - 10} more. <a href="${BASE_URL}/calendar" style="color:#64748b;text-decoration:underline;">View all in the app</a>.</p>`
      : ""

  const body = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">
      You have ${count} overdue task${count === 1 ? "" : "s"}
    </h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">
      Hi ${data.recipientName}, here's a summary of tasks that need your attention.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%">
      ${taskRows}
    </table>
    ${moreNote}
    ${btn(`${BASE_URL}/calendar`, "Open Calendar & Tasks")}
    ${muted("Overdue tasks are highlighted red in your calendar view.")}
  `

  return {
    subject: `${count} overdue task${count === 1 ? "" : "s"} need your attention`,
    html: layout("Overdue Tasks — Produce CRM", body),
  }
}
