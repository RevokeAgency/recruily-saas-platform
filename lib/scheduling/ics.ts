// ICS-Erzeugung für Termin-Anhänge.
//
// Der bestehende Erzeuger in /api/send-interview-invite rechnete mit lokalen
// Zeichenketten ohne Zeitzone und setzte das Ende hart auf Start plus eine
// Stunde. Hier stehen echte UTC-Zeitstempel (Suffix Z), die jedes Mailprogramm
// korrekt in die Zeitzone des Empfängers umrechnet.

export interface IcsEvent {
  uid: string
  start: Date
  end: Date
  summary: string
  description?: string
  location?: string
  url?: string
  organizerEmail?: string
  organizerName?: string
  attendeeEmail?: string | null
  attendeeName?: string | null
  /** REQUEST lädt ein, CANCEL sagt ab. */
  method?: "REQUEST" | "CANCEL"
  /** Muss bei jeder Änderung desselben UID steigen, sonst ignorieren Clients sie. */
  sequence?: number
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** Escaping nach RFC 5545: Komma, Semikolon, Backslash und Zeilenumbruch. */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/**
 * Zeilen über 75 Oktette müssen umgebrochen werden, sonst brechen Parser.
 *
 * Gezählt wird in Oktetten, nicht in Zeichen: „Erstgespräch" ist zwölf Zeichen,
 * aber dreizehn Oktette. Bei deutschen Texten mit Umlauten würde eine Zählung
 * nach Zeichen die Grenze reißen. Umgekehrt darf ein mehrteiliges Zeichen nicht
 * mitten zwischen seinen Oktetten getrennt werden, deshalb wird zeichenweise
 * gefüllt und dabei die Oktettlänge mitgeführt.
 */
function fold(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line

  const parts: string[] = []
  let current = ""
  let bytes = 0
  // Erste Zeile darf 75 Oktette, Folgezeilen 74, weil das führende Leerzeichen
  // eines davon belegt.
  let limit = 75

  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8")
    if (bytes + size > limit) {
      parts.push(current)
      current = ""
      bytes = 0
      limit = 74
    }
    current += char
    bytes += size
  }
  if (current) parts.push(current)

  return parts[0] + parts.slice(1).map((p) => `\r\n ${p}`).join("")
}

export function buildIcs(event: IcsEvent): string {
  const method = event.method ?? "REQUEST"
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Revetly//Terminplanung//DE",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${esc(event.summary)}`,
  ]

  if (event.description) lines.push(`DESCRIPTION:${esc(event.description)}`)
  if (event.location) lines.push(`LOCATION:${esc(event.location)}`)
  if (event.url) lines.push(`URL:${event.url}`)
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${esc(event.organizerName)}` : ""
    lines.push(`ORGANIZER${cn}:mailto:${event.organizerEmail}`)
  }
  if (event.attendeeEmail) {
    const cn = event.attendeeName ? `;CN=${esc(event.attendeeName)}` : ""
    lines.push(
      `ATTENDEE${cn};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${event.attendeeEmail}`,
    )
  }

  // Erinnerung 30 Minuten vorher. Absagen brauchen keine.
  if (method !== "CANCEL") {
    lines.push(
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(event.summary)}`,
      "END:VALARM",
    )
  }

  lines.push("END:VEVENT", "END:VCALENDAR")
  return lines.map(fold).join("\r\n")
}
