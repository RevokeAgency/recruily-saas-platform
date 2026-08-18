import { escapeHtml, sendMail, shell, type MailAttachment } from "./client"
import { buildIcs } from "@/lib/scheduling/ics"
import { formatInZone, zoneAbbreviation } from "@/lib/scheduling/timezone"
import { LOCATION_LABELS, type LocationKind } from "@/lib/scheduling/types"

// Mails rund um die Terminbuchung. Bewusst getrennt von lib/email/send.ts:
// Dort liegen die Bewerbungsmails, hier die Terminlogik samt ICS-Anhang.
// Alle Funktionen sind best-effort und geben false zurück statt zu werfen,
// damit eine Buchung nie an einem Mailfehler scheitert.


function button(href: string, label: string): string {
  return `
    <p style="margin: 0 0 24px;">
      <a href="${href}" style="display:inline-block;background:#0C1A16;color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;">
        ${escapeHtml(label)}
      </a>
    </p>
  `
}

/** Ort des Termins als lesbare Zeile, für Mail und Kalendereintrag. */
export function locationLine(
  kind: LocationKind,
  value: string | null | undefined,
  meetingUrl: string | null | undefined,
): string {
  switch (kind) {
    case "video_auto":
      return meetingUrl ? `Videocall: ${meetingUrl}` : "Videocall (Link folgt)"
    case "custom_link":
      return value ? `Videocall: ${value}` : "Videocall"
    case "phone":
      return "Telefonisch. Wir rufen zur vereinbarten Zeit an."
    case "onsite":
      return value ? `Vor Ort: ${value}` : "Vor Ort"
    default:
      return LOCATION_LABELS[kind] ?? ""
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Einladung mit Buchungslink
// ─────────────────────────────────────────────────────────────────────────────

export async function sendBookingInvite(opts: {
  to: string
  candidateName?: string | null
  jobTitle?: string | null
  companyName?: string | null
  meetingTypeName: string
  durationMinutes: number
  bookingUrl: string
  personalNote?: string | null
  expiresAt: Date
  timezone: string
}): Promise<boolean> {
  if (!opts.to) return false

  const company = (opts.companyName || "Revetly").trim()
  const greeting = opts.candidateName?.trim() ? `Hallo ${escapeHtml(opts.candidateName.trim())},` : "Hallo,"
  const job = opts.jobTitle?.trim()

  const body = `
    <p style="margin: 0 0 16px;">${greeting}</p>
    <p style="margin: 0 0 16px;">
      wir würden Sie gerne zu einem Gespräch${job ? ` zur Stelle <strong>${escapeHtml(job)}</strong>` : ""} einladen.
      Suchen Sie sich einfach den Termin aus, der Ihnen am besten passt.
    </p>
    <p style="margin: 0 0 20px;">
      <strong>${escapeHtml(opts.meetingTypeName)}</strong>, ${opts.durationMinutes} Minuten
    </p>
    ${button(opts.bookingUrl, "Termin auswählen")}
    ${
      opts.personalNote?.trim()
        ? `<p style="margin: 0 0 16px; padding: 14px 16px; background:#F4F7F6; border-radius:12px;">${escapeHtml(opts.personalNote.trim()).replace(/\n/g, "<br>")}</p>`
        : ""
    }
    <p style="margin: 0 0 16px; color:#64707B; font-size:13px;">
      Der Link gilt bis ${escapeHtml(formatInZone(opts.expiresAt, opts.timezone))} Uhr und ist nur für Sie bestimmt.
      Passt kein Termin? Antworten Sie einfach auf diese E-Mail.
    </p>
    <p style="margin: 24px 0 0;">Freundliche Grüße<br>${escapeHtml(company)}</p>
  `

  return sendMail(
    {
      to: opts.to,
      subject: job ? `Terminvorschlag: Gespräch zur Stelle ${job}` : "Terminvorschlag für ein Gespräch",
      html: shell(company, body),
    },
    "Buchungseinladung",
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bestätigung nach der Buchung
// ─────────────────────────────────────────────────────────────────────────────

export interface BookingMailContext {
  bookingId: string
  start: Date
  end: Date
  timezone: string
  meetingTypeName: string
  locationKind: LocationKind
  locationValue: string | null
  meetingUrl: string | null
  jobTitle?: string | null
  companyName?: string | null
  candidateName?: string | null
  candidateEmail?: string | null
  recruiterEmail?: string | null
  manageUrl?: string | null
  sequence?: number
}

function icsFor(ctx: BookingMailContext, method: "REQUEST" | "CANCEL"): string {
  return buildIcs({
    uid: `booking-${ctx.bookingId}@revetly.ai`,
    start: ctx.start,
    end: ctx.end,
    summary: ctx.jobTitle
      ? `${ctx.meetingTypeName}: ${ctx.jobTitle}`
      : ctx.meetingTypeName,
    description: [
      locationLine(ctx.locationKind, ctx.locationValue, ctx.meetingUrl),
      ctx.manageUrl ? `Termin verwalten: ${ctx.manageUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    location: locationLine(ctx.locationKind, ctx.locationValue, ctx.meetingUrl),
    url: ctx.meetingUrl ?? undefined,
    organizerEmail: ctx.recruiterEmail ?? undefined,
    organizerName: ctx.companyName ?? undefined,
    attendeeEmail: ctx.candidateEmail,
    attendeeName: ctx.candidateName,
    method,
    sequence: ctx.sequence ?? 0,
  })
}

/** ICS als Anhang, korrekt ausgezeichnet, damit Mailprogramme es als Termin erkennen. */
function icsAnhang(ctx: BookingMailContext, method: "REQUEST" | "CANCEL"): MailAttachment {
  return {
    filename: method === "CANCEL" ? "absage.ics" : "termin.ics",
    content: Buffer.from(icsFor(ctx, method)).toString("base64"),
    contentType: `text/calendar; method=${method}; charset=utf-8`,
  }
}

function whenLine(ctx: BookingMailContext): string {
  return `${formatInZone(ctx.start, ctx.timezone)} Uhr (${zoneAbbreviation(ctx.start, ctx.timezone)})`
}

export async function sendBookingConfirmation(ctx: BookingMailContext): Promise<boolean> {
  if (!ctx.candidateEmail) return false

  const company = (ctx.companyName || "Revetly").trim()
  const greeting = ctx.candidateName?.trim() ? `Hallo ${escapeHtml(ctx.candidateName.trim())},` : "Hallo,"

  const body = `
    <p style="margin: 0 0 16px;">${greeting}</p>
    <p style="margin: 0 0 20px;">Ihr Termin steht.</p>
    <table style="width:100%; border-collapse:collapse; margin:0 0 22px;">
      <tr><td style="padding:6px 0; color:#64707B; width:110px;">Wann</td><td style="padding:6px 0;"><strong>${escapeHtml(whenLine(ctx))}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#64707B;">Dauer</td><td style="padding:6px 0;">${Math.round((ctx.end.getTime() - ctx.start.getTime()) / 60000)} Minuten</td></tr>
      <tr><td style="padding:6px 0; color:#64707B;">Was</td><td style="padding:6px 0;">${escapeHtml(ctx.meetingTypeName)}${ctx.jobTitle ? ` zur Stelle ${escapeHtml(ctx.jobTitle)}` : ""}</td></tr>
      <tr><td style="padding:6px 0; color:#64707B;">Wo</td><td style="padding:6px 0;">${escapeHtml(locationLine(ctx.locationKind, ctx.locationValue, ctx.meetingUrl))}</td></tr>
    </table>
    ${ctx.meetingUrl ? button(ctx.meetingUrl, "Zum Videocall") : ""}
    ${
      ctx.manageUrl
        ? `<p style="margin: 0 0 16px; color:#64707B; font-size:13px;">Sie können den Termin jederzeit <a href="${ctx.manageUrl}" style="color:#0E9F62;">verschieben oder absagen</a>.</p>`
        : ""
    }
    <p style="margin: 24px 0 0;">Freundliche Grüße<br>${escapeHtml(company)}</p>
  `

  return sendMail(
    {
      to: ctx.candidateEmail,
      subject: `Termin bestätigt: ${formatInZone(ctx.start, ctx.timezone)} Uhr`,
      html: shell(company, body),
      attachments: [icsAnhang(ctx, "REQUEST")],
    },
    "Terminbestätigung",
  )
}

/** Kurze Mitteilung an den Recruiter, wenn ein Bewerber gebucht hat. */
export async function sendRecruiterBookingNotice(ctx: BookingMailContext): Promise<boolean> {
  if (!ctx.recruiterEmail) return false

  const body = `
    <p style="margin: 0 0 16px;">
      <strong>${escapeHtml(ctx.candidateName || ctx.candidateEmail || "Ein Bewerber")}</strong> hat einen Termin gebucht.
    </p>
    <table style="width:100%; border-collapse:collapse; margin:0 0 22px;">
      <tr><td style="padding:6px 0; color:#64707B; width:110px;">Wann</td><td style="padding:6px 0;"><strong>${escapeHtml(whenLine(ctx))}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#64707B;">Was</td><td style="padding:6px 0;">${escapeHtml(ctx.meetingTypeName)}${ctx.jobTitle ? ` zur Stelle ${escapeHtml(ctx.jobTitle)}` : ""}</td></tr>
      <tr><td style="padding:6px 0; color:#64707B;">Wo</td><td style="padding:6px 0;">${escapeHtml(locationLine(ctx.locationKind, ctx.locationValue, ctx.meetingUrl))}</td></tr>
      ${ctx.candidateEmail ? `<tr><td style="padding:6px 0; color:#64707B;">Kontakt</td><td style="padding:6px 0;">${escapeHtml(ctx.candidateEmail)}</td></tr>` : ""}
    </table>
  `

  return sendMail(
    {
      to: ctx.recruiterEmail,
      subject: `Neuer Termin: ${ctx.candidateName || "Bewerber"} am ${formatInZone(ctx.start, ctx.timezone)}`,
      html: shell("Revetly", body),
      attachments: [icsAnhang(ctx, "REQUEST")],
    },
    "Recruiter-Benachrichtigung",
  )
}

export async function sendBookingCancellation(
  ctx: BookingMailContext,
  opts: { to: string; byRecruiter: boolean; reason?: string | null; rebookUrl?: string | null },
): Promise<boolean> {
  if (!opts.to) return false

  const company = (ctx.companyName || "Revetly").trim()
  const body = `
    <p style="margin: 0 0 16px;">
      Der Termin am <strong>${escapeHtml(whenLine(ctx))}</strong> wurde abgesagt${
        opts.byRecruiter ? "" : " (durch den Bewerber)"
      }.
    </p>
    ${
      opts.reason?.trim()
        ? `<p style="margin: 0 0 16px; padding: 14px 16px; background:#F4F7F6; border-radius:12px;">${escapeHtml(opts.reason.trim())}</p>`
        : ""
    }
    ${opts.rebookUrl ? button(opts.rebookUrl, "Neuen Termin wählen") : ""}
    <p style="margin: 24px 0 0;">Freundliche Grüße<br>${escapeHtml(company)}</p>
  `

  return sendMail(
    {
      to: opts.to,
      subject: `Termin abgesagt: ${formatInZone(ctx.start, ctx.timezone)} Uhr`,
      html: shell(company, body),
      attachments: [icsAnhang({ ...ctx, sequence: (ctx.sequence ?? 0) + 1 }, "CANCEL")],
    },
    "Absagemail",
  )
}
