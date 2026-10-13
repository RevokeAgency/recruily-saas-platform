import { sendMail } from "./client"
import { button, escapeHtml, eyebrow, heading, paragraph, shell } from "./layout"

// ─────────────────────────────────────────────────────────────────────────────
// Einladung ins Team. Der Link enthält den Klartext-Token und verlässt die
// Anwendung nur in dieser Mail; gespeichert ist nur der Abdruck.
// ─────────────────────────────────────────────────────────────────────────────

function dateDe(iso: string): string {
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "long", timeZone: "Europe/Vienna" })
}

export async function sendTeamInvite(opts: {
  to: string
  inviterName: string
  inviterEmail: string | null
  company: string
  url: string
  expiresAt: string
}): Promise<boolean> {
  const who = escapeHtml(opts.inviterName)
  const company = escapeHtml(opts.company || "Revetly")

  const body = `
    ${eyebrow("Einladung ins Team")}
    ${heading(`Arbeite mit ${company} in Revetly`)}
    ${paragraph(`${who} lädt dich ein, gemeinsam Bewerbungen zu sichten und Gespräche zu planen. Du siehst alle Stellen und Kandidaten des Teams, dein Kalender bleibt dein eigener.`)}
    ${button(opts.url, "Einladung annehmen")}
    ${paragraph(`Melde dich mit dieser Adresse an oder lege ein Konto an. Der Link gilt bis ${escapeHtml(dateDe(opts.expiresAt))} und ist nur für dich bestimmt.`, { muted: true, small: true, last: true })}
  `

  return sendMail(
    {
      to: opts.to,
      subject: `${opts.inviterName} lädt dich ins Team von ${opts.company || "Revetly"} ein`,
      html: shell(opts.company || "Revetly", body, { preheader: `${opts.inviterName} lädt dich zu Revetly ein.` }),
      ...(opts.inviterEmail ? { replyTo: opts.inviterEmail } : {}),
    },
    "Team-Einladung",
  )
}
