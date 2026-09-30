import { absoluteUrl } from "@/lib/site"

// ─────────────────────────────────────────────────────────────────────────────
// Mail-Layout: ein Designsystem für jede Mail, die Revetly verschickt.
//
// Mailprogramme sind keine Browser. Deshalb: Tabellen statt Flex und Grid,
// Stile inline, Webfont nur als Wunsch mit Systemschriften dahinter, und bei
// jedem Verlauf eine Vollfarbe als Rückfall (Outlook zeichnet keine
// Verläufe). Das Logo ist ein PNG in doppelter Auflösung, SVG zeigen viele
// Programme nicht an.
//
// Zwei Absender, zwei Köpfe:
//   Revetly an Recruiter      Revetly-Logo oben
//   Arbeitgeber an Bewerber   Firmenname oben, Revetly nur klein im Fuß.
//                             Für Bewerber schreibt das Unternehmen, nicht wir.
// ─────────────────────────────────────────────────────────────────────────────

export const MAIL = {
  ink: "#0C1A16",
  text: "#33443F",
  muted: "#5E736D",
  faint: "#8A9E98",
  line: "#E3ECE8",
  mist: "#F4F8F6",
  page: "#EEF4F1",
  green: "#16C77C",
  greenDeep: "#0E9F63",
  cyan: "#22C1EE",
  gradient: "linear-gradient(90deg,#16C77C 0%,#22C1EE 100%)",
  font: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export interface ShellOptions {
  /** Vorschautext im Posteingang, direkt nach dem Betreff. */
  preheader?: string
  /** Zusatzzeile im Fuß, etwa wo sich Benachrichtigungen einstellen lassen (HTML). */
  footerNote?: string
}

const LOGO_WIDTH = 132
const LOGO_HEIGHT = 33

function logo(width = LOGO_WIDTH, height = LOGO_HEIGHT): string {
  return `<img src="${absoluteUrl("/revetly/email-logo.png")}" width="${width}" height="${height}" alt="Revetly" style="display:block;border:0;outline:none;width:${width}px;height:${height}px;">`
}

/**
 * Hülle jeder Mail. `bodyHtml` ist bereits escaptes HTML. Ist `companyName`
 * "Revetly", steht das Logo oben, sonst der Firmenname des Arbeitgebers.
 */
export function shell(companyName: string, bodyHtml: string, opts: ShellOptions = {}): string {
  const fromRevetly = companyName.trim().toLowerCase() === "revetly"
  const head = fromRevetly
    ? `<a href="${absoluteUrl("/")}" style="text-decoration:none;">${logo()}</a>`
    : `<span style="font-family:${MAIL.font};font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${MAIL.ink};">${escapeHtml(companyName)}</span>`

  const foot = fromRevetly
    ? `Revetly · KI-Recruiting-Assistent für den DACH-Raum`
    : `Diese Nachricht hat ${escapeHtml(companyName)} über Revetly verschickt.`

  // Unsichtbare Füllzeichen hinter dem Vorschautext, damit das Mailprogramm
  // nicht den Anfang des Inhalts in die Vorschau zieht.
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${MAIL.page};">${escapeHtml(opts.preheader)}${"&#8199;&#65279;&#847;".repeat(60)}</div>`
    : ""

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title></title>
<!-- Markenschrift für Apple Mail und iOS. Programme, die sie nicht laden, nehmen die Systemschrift. -->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @media (max-width: 520px) {
    .rv-card { padding: 28px 22px 26px !important; }
    .rv-outer { padding: 20px 10px !important; }
    .rv-h1 { font-size: 22px !important; }
  }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${MAIL.page};-webkit-text-size-adjust:100%;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MAIL.page};">
  <tr>
    <td align="center" class="rv-outer" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td style="padding:0 6px 22px;">${head}</td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;border:1px solid ${MAIL.line};border-radius:24px;overflow:hidden;box-shadow:0 1px 2px rgba(12,26,22,.05),0 18px 40px -22px rgba(12,26,22,.28);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:${MAIL.green};background-image:${MAIL.gradient};">&nbsp;</td></tr>
              <tr>
                <td class="rv-card" style="padding:38px 40px 36px;font-family:${MAIL.font};font-size:15px;line-height:1.65;color:${MAIL.text};">
                  ${bodyHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 8px 0;font-family:${MAIL.font};font-size:12px;line-height:1.6;color:${MAIL.faint};">
            ${opts.footerNote ? `<p style="margin:0 0 10px;">${opts.footerNote}</p>` : ""}
            <p style="margin:0;">${foot}</p>
            ${fromRevetly ? "" : `<p style="margin:14px 0 0;opacity:.7;">${logo(72, 18)}</p>`}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/** Kleine Oberzeile über der Überschrift, in Markengrün. */
export function eyebrow(text: string): string {
  return `<p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${MAIL.greenDeep};">${escapeHtml(text)}</p>`
}

/** Hauptüberschrift der Mail. */
export function heading(text: string): string {
  return `<h1 class="rv-h1" style="margin:0 0 14px;font-family:${MAIL.font};font-size:25px;line-height:1.25;font-weight:800;letter-spacing:-0.025em;color:${MAIL.ink};">${escapeHtml(text)}</h1>`
}

/** Absatz im Fließtext. `html` ist bereits escaptes HTML. */
export function paragraph(html: string, opts: { muted?: boolean; small?: boolean; last?: boolean } = {}): string {
  const color = opts.muted ? MAIL.muted : MAIL.text
  const size = opts.small ? 13 : 15
  return `<p style="margin:0 0 ${opts.last ? 0 : 16}px;font-size:${size}px;line-height:1.65;color:${color};">${html}</p>`
}

/**
 * Knopf im Marken-Verlauf. Als Tabelle gebaut, damit er auch in Outlook ein
 * Knopf bleibt, dort in Vollfarbe.
 */
export function button(href: string, label: string, opts: { variant?: "primary" | "dark" } = {}): string {
  const dark = opts.variant === "dark"
  const bg = dark ? `background:${MAIL.ink};` : `background:${MAIL.green};background-image:${MAIL.gradient};`
  const color = dark ? "#FFFFFF" : MAIL.ink
  const glow = dark ? "0 10px 22px -12px rgba(12,26,22,.55)" : "0 10px 24px -12px rgba(22,199,124,.8)"
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;">
  <tr>
    <td style="border-radius:999px;${bg}box-shadow:${glow};">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${MAIL.font};font-size:15px;font-weight:800;letter-spacing:-0.01em;color:${color};text-decoration:none;border-radius:999px;">${escapeHtml(label)}&nbsp;&nbsp;&rarr;</a>
    </td>
  </tr>
</table>`
}

/** Kasten in Nebelgrau für hervorgehobene Inhalte. `html` ist bereits escapt. */
export function panel(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;background:${MAIL.mist};border:1px solid ${MAIL.line};border-radius:18px;">
  <tr><td style="padding:18px 20px;">${html}</td></tr>
</table>`
}

/** Zwei Spalten mit Bezeichnung und Wert, etwa für Termindetails. */
export function details(rows: Array<[string, string]>): string {
  return panel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows
      .map(
        ([k, v], i) =>
          `<tr><td valign="top" style="padding:${i ? 10 : 0}px 16px 0 0;width:92px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${MAIL.faint};">${escapeHtml(k)}</td><td valign="top" style="padding:${i ? 8 : 0}px 0 0;font-size:15px;line-height:1.5;color:${MAIL.ink};">${v}</td></tr>`,
      )
      .join("")}</table>`,
  )
}

/** Initialen im Verlaufskreis, als Ersatz für ein Foto. */
export function avatar(name: string, size = 44): string {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:${size}px;background:${MAIL.green};background-image:linear-gradient(135deg,#16C77C 0%,#22C1EE 100%);font-family:${MAIL.font};font-size:${Math.round(size * 0.36)}px;font-weight:800;color:${MAIL.ink};">${escapeHtml(initials)}</td></tr></table>`
}
