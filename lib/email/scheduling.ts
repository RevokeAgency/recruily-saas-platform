import { sendMail, type MailAttachment } from "./client"
import { MAIL, button as mailButton, details, escapeHtml, eyebrow, heading, panel, paragraph, shell } from "./layout"
import { buildIcs } from "@/lib/scheduling/ics"
import { formatInZone, zoneAbbreviation } from "@/lib/scheduling/timezone"
import { LOCATION_LABELS, type LocationKind } from "@/lib/scheduling/types"

// Mails rund um die Terminbuchung. Bewusst getrennt von lib/email/send.ts:
// Dort liegen die Bewerbungsmails, hier die Terminlogik samt ICS-Anhang.
// Alle Funktionen sind best-effort und geben false zurück statt zu werfen,
// damit eine Buchung nie an einem Mailfehler scheitert.


// Mails an Bewerber kommen vom Unternehmen, deshalb ein neutraler dunkler
// Knopf statt des Revetly-Verlaufs.
function button(href: string, label: string): string {
  return mailButton(href, label, { variant: "dark" })
}

const SIGN = (company: string) =>
  `<p style="margin:26px 0 0;color:${MAIL.text};">Freundliche Grüße<br><strong style="color:${MAIL.ink};">${escapeHtml(company)}</strong></p>`

const note = (text: string) => panel(`<div style="font-size:14px;line-height:1.6;color:${MAIL.text};">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`)

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
    ${eyebrow("Einladung zum Gespräch")}
    ${heading("Wählen Sie Ihren Termin")}
    ${paragraph(`${greeting} wir würden Sie gerne zu einem Gespräch${job ? ` zur Stelle <strong style="color:${MAIL.ink};">${escapeHtml(job)}</strong>` : ""} einladen. Suchen Sie sich einfach den Termin aus, der Ihnen am besten passt.`)}
    ${details([
      ["Was", `<strong>${escapeHtml(opts.meetingTypeName)}</strong>`],
      ["Dauer", `${opts.durationMinutes} Minuten`],
    ])}
    ${opts.personalNote?.trim() ? note(opts.personalNote.trim()) : ""}
    ${button(opts.bookingUrl, "Termin auswählen")}
    ${paragraph(`Der Link gilt bis ${escapeHtml(formatInZone(opts.expiresAt, opts.timezone))} Uhr und ist nur für Sie bestimmt. Passt kein Termin? Antworten Sie einfach auf diese E-Mail.`, { muted: true, small: true, last: true })}
    ${SIGN(company)}
  `

  return sendMail(
    {
      to: opts.to,
      subject: job ? `Terminvorschlag: Gespräch zur Stelle ${job}` : "Terminvorschlag für ein Gespräch",
      html: shell(company, body, { preheader: `${opts.meetingTypeName}, ${opts.durationMinutes} Minuten. Wählen Sie einen passenden Termin.` }),
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
    ${eyebrow("Termin bestätigt")}
    ${heading("Ihr Termin steht")}
    ${paragraph(`${greeting} wir freuen uns auf das Gespräch. Den Termin finden Sie auch als Kalendereintrag im Anhang.`)}
    ${details([
      ["Wann", `<strong>${escapeHtml(whenLine(ctx))}</strong>`],
      ["Dauer", `${Math.round((ctx.end.getTime() - ctx.start.getTime()) / 60000)} Minuten`],
      ["Was", `${escapeHtml(ctx.meetingTypeName)}${ctx.jobTitle ? ` zur Stelle ${escapeHtml(ctx.jobTitle)}` : ""}`],
      ["Wo", escapeHtml(locationLine(ctx.locationKind, ctx.locationValue, ctx.meetingUrl))],
    ])}
    ${ctx.meetingUrl ? button(ctx.meetingUrl, "Zum Videocall") : ""}
    ${
      ctx.manageUrl
        ? paragraph(`Sie können den Termin jederzeit <a href="${ctx.manageUrl}" style="color:${MAIL.greenDeep};font-weight:700;">verschieben oder absagen</a>.`, { muted: true, small: true, last: true })
        : ""
    }
    ${SIGN(company)}
  `

  return sendMail(
    {
      to: ctx.candidateEmail,
      subject: `Termin bestätigt: ${formatInZone(ctx.start, ctx.timezone)} Uhr`,
      html: shell(company, body, { preheader: `${whenLine(ctx)} · ${ctx.meetingTypeName}` }),
      attachments: [icsAnhang(ctx, "REQUEST")],
    },
    "Terminbestätigung",
  )
}

/** Kurze Mitteilung an den Recruiter, wenn ein Bewerber gebucht hat. */
export async function sendRecruiterBookingNotice(ctx: BookingMailContext): Promise<boolean> {
  if (!ctx.recruiterEmail) return false

  const who = ctx.candidateName || ctx.candidateEmail || "Ein Bewerber"
  const body = `
    ${eyebrow("Neuer Termin")}
    ${heading(`${who} hat einen Termin gebucht`)}
    ${details([
      ["Wann", `<strong>${escapeHtml(whenLine(ctx))}</strong>`],
      ["Was", `${escapeHtml(ctx.meetingTypeName)}${ctx.jobTitle ? ` zur Stelle ${escapeHtml(ctx.jobTitle)}` : ""}`],
      ["Wo", escapeHtml(locationLine(ctx.locationKind, ctx.locationValue, ctx.meetingUrl))],
      ...(ctx.candidateEmail ? ([["Kontakt", escapeHtml(ctx.candidateEmail)]] as Array<[string, string]>) : []),
    ])}
    ${paragraph("Der Termin ist als Kalendereintrag angehängt und steht in deinem verbundenen Kalender.", { muted: true, small: true, last: true })}
  `

  return sendMail(
    {
      to: ctx.recruiterEmail,
      subject: `Neuer Termin: ${ctx.candidateName || "Bewerber"} am ${formatInZone(ctx.start, ctx.timezone)}`,
      html: shell("Revetly", body, { preheader: `${whenLine(ctx)} · ${ctx.meetingTypeName}` }),
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
    ${eyebrow("Termin abgesagt")}
    ${heading(opts.byRecruiter ? "Der Termin findet nicht statt" : "Der Bewerber hat den Termin abgesagt")}
    ${paragraph(`Der Termin am <strong style="color:${MAIL.ink};">${escapeHtml(whenLine(ctx))}</strong> wurde abgesagt.`)}
    ${opts.reason?.trim() ? note(opts.reason.trim()) : ""}
    ${opts.rebookUrl ? button(opts.rebookUrl, "Neuen Termin wählen") : ""}
    ${SIGN(company)}
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
