import { sendMail } from "./client"
import { MAIL, avatar, button, escapeHtml, eyebrow, heading, panel, paragraph, shell } from "./layout"
import { absoluteUrl } from "@/lib/site"
import { VERDICT_LABEL, type ReviewVerdict } from "@/lib/review/shared"

// ─────────────────────────────────────────────────────────────────────────────
// Mails zum Freigabe-Link: die Bitte an den Fachbereich und die Rückmeldung
// an HR, sobald alle Bewerber beurteilt sind.
// ─────────────────────────────────────────────────────────────────────────────

const quote = (text: string) =>
  panel(`<div style="font-size:14px;line-height:1.6;color:${MAIL.text};">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`)

function dateDe(iso: string): string {
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "long", timeZone: "Europe/Vienna" })
}

/** Bitte um Einschätzung an den Fachbereich. Antworten gehen an HR. */
export async function sendReviewRequest(opts: {
  to: string
  reviewerName: string | null
  senderName: string
  senderEmail: string | null
  company: string
  jobTitle: string
  count: number
  url: string
  note: string | null
  expiresAt: string
}): Promise<boolean> {
  const hello = opts.reviewerName ? `Hallo ${escapeHtml(opts.reviewerName)},` : "Hallo,"
  const who = escapeHtml(opts.senderName)
  const job = `<strong style="color:${MAIL.ink};">${escapeHtml(opts.jobTitle)}</strong>`
  const many = opts.count === 1 ? "eine Bewerbung" : `${opts.count} Bewerbungen`

  const body = `
    ${eyebrow("Deine Einschätzung")}
    ${heading(`${opts.count === 1 ? "Eine Bewerbung wartet" : `${opts.count} Bewerbungen warten`} auf dich`)}
    ${paragraph(`${hello} ${who} bittet dich, ${many} für ${job} anzusehen. Du siehst pro Person eine kurze Zusammenfassung und den Lebenslauf und sagst mit einem Klick, ob sie für dich interessant ist.`)}
    ${opts.note ? quote(opts.note) : ""}
    ${button(opts.url, "Bewerbungen ansehen")}
    ${paragraph(`Du brauchst kein Konto. Der Link gilt bis ${escapeHtml(dateDe(opts.expiresAt))} und ist nur für dich bestimmt, bitte leite ihn nicht weiter.`, { muted: true, small: true, last: true })}
  `

  return sendMail(
    {
      to: opts.to,
      subject: `Deine Einschätzung: ${many} für ${opts.jobTitle}`,
      html: shell(opts.company || "Revetly", body, { preheader: `${opts.senderName} bittet um deine Einschätzung zu ${many}.` }),
      ...(opts.senderEmail ? { replyTo: opts.senderEmail } : {}),
    },
    "Freigabe-Link",
  )
}

/** Rückmeldung an HR, sobald der Fachbereich alle Bewerber beurteilt hat. */
export async function sendReviewCompleted(opts: {
  to: string
  reviewerName: string | null
  jobId: string
  jobTitle: string
  items: Array<{ name: string; verdict: ReviewVerdict; comment: string | null }>
}): Promise<boolean> {
  const who = opts.reviewerName ? escapeHtml(opts.reviewerName) : "Der Fachbereich"
  const interesting = opts.items.filter((i) => i.verdict === "interessant").length

  const rows = opts.items
    .map((i, idx) => {
      const tone = i.verdict === "interessant" ? MAIL.greenDeep : "#B42318"
      const border = idx < opts.items.length - 1 ? `border-bottom:1px solid ${MAIL.line};` : ""
      return `<tr><td style="padding:12px 0;${border}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="44" valign="top" style="padding-right:12px;">${avatar(i.name, 36)}</td>
          <td valign="top">
            <div style="font-size:15px;font-weight:700;color:${MAIL.ink};">${escapeHtml(i.name)}</div>
            ${i.comment ? `<div style="margin-top:3px;font-size:14px;line-height:1.55;color:${MAIL.text};">${escapeHtml(i.comment)}</div>` : ""}
          </td>
          <td valign="top" align="right" style="white-space:nowrap;font-size:13px;font-weight:800;color:${tone};">${VERDICT_LABEL[i.verdict]}</td>
        </tr></table>
      </td></tr>`
    })
    .join("")

  const body = `
    ${eyebrow("Rückmeldung vom Fachbereich")}
    ${heading(`${who} hat alle Bewerbungen angesehen`)}
    ${paragraph(`Für <strong style="color:${MAIL.ink};">${escapeHtml(opts.jobTitle)}</strong>: ${interesting} von ${opts.items.length} ${opts.items.length === 1 ? "ist" : "sind"} interessant. Status und Absagen bleiben bei dir.`)}
    ${panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`)}
    ${button(absoluteUrl(`/jobs/${opts.jobId}`), "Zur Stelle", { variant: "dark" })}
  `

  return sendMail(
    {
      to: opts.to,
      subject: `Rückmeldung zu ${opts.jobTitle}: ${interesting} von ${opts.items.length} interessant`,
      html: shell("Revetly", body, { preheader: `${opts.reviewerName ?? "Der Fachbereich"} hat ${opts.items.length} Bewerbungen beurteilt.` }),
    },
    "Rückmeldung Fachbereich",
  )
}
