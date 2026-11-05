// ─────────────────────────────────────────────────────────────────────────────
// Kontaktformular: Anliegen und wohin sie gehen.
//
// Allgemeine Anfragen gehen an hallo@, Hilfe bei der Nutzung an support@.
// Beide Adressen lassen sich per Umgebungsvariable umstellen (CONTACT_EMAIL,
// SUPPORT_EMAIL). Die Nachricht wird nur weitergeleitet, nicht gespeichert.
// ─────────────────────────────────────────────────────────────────────────────

export const CONTACT_TOPICS = {
  frage: { label: "Allgemeine Frage", inbox: "hallo" },
  vertrieb: { label: "Angebot oder Enterprise", inbox: "hallo" },
  support: { label: "Hilfe bei der Nutzung", inbox: "support" },
  datenschutz: { label: "Datenschutz", inbox: "hallo" },
  sonstiges: { label: "Sonstiges", inbox: "hallo" },
} as const

export type ContactTopic = keyof typeof CONTACT_TOPICS

export const CONTACT_LIMITS = { name: 120, email: 200, company: 160, message: 5000, minMessage: 10 }

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CONTACT_TOPICS, value)
}

/** Empfängeradresse für ein Anliegen. */
export function contactInbox(topic: ContactTopic): string {
  return CONTACT_TOPICS[topic].inbox === "support"
    ? process.env.SUPPORT_EMAIL?.trim() || "support@revetly.ai"
    : process.env.CONTACT_EMAIL?.trim() || "hallo@revetly.ai"
}

export interface ContactInput {
  topic: ContactTopic
  name: string
  email: string
  company: string | null
  message: string
}

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/

/** Prüft und bereinigt die Eingabe. Liefert die Fehlermeldung für den Nutzer. */
export function parseContactInput(body: Record<string, unknown>): { ok: true; value: ContactInput } | { ok: false; error: string } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  const oneLine = (v: string) => v.replace(/[\r\n\t]+/g, " ")

  const topic = isContactTopic(body.topic) ? body.topic : "frage"
  const name = oneLine(str(body.name))
  const email = str(body.email).toLowerCase()
  const company = oneLine(str(body.company))
  const message = str(body.message).replace(/\r\n/g, "\n")

  if (!name) return { ok: false, error: "Bitte gib deinen Namen an." }
  if (name.length > CONTACT_LIMITS.name) return { ok: false, error: "Der Name ist zu lang." }
  if (!EMAIL_RE.test(email) || email.length > CONTACT_LIMITS.email) {
    return { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse an." }
  }
  if (company.length > CONTACT_LIMITS.company) return { ok: false, error: "Der Firmenname ist zu lang." }
  if (message.length < CONTACT_LIMITS.minMessage) return { ok: false, error: "Bitte beschreib dein Anliegen in ein paar Worten." }
  if (message.length > CONTACT_LIMITS.message) {
    return { ok: false, error: `Die Nachricht ist zu lang (höchstens ${CONTACT_LIMITS.message.toLocaleString("de-DE")} Zeichen).` }
  }
  return { ok: true, value: { topic, name, email, company: company || null, message } }
}
