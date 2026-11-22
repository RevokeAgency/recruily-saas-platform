import { defaultRejectionText } from "@/lib/email/rejection-text"

// ─────────────────────────────────────────────────────────────────────────────
// Feste Vorlagen für Absagen und Einladungen aus Revy (Etappe 3).
//
// Kein Modell schreibt diese Texte. Revy wählt nur einen Ton aus festen
// Bausteinen und hängt höchstens einen geprüften Zusatz aus dem Befehl des
// Nutzers an. Die Standard-Absage ist der bestehende Text aus
// lib/email/rejection-text.ts, unverändert.
//
// Platzhalter statt Namen: {{name}}, {{stelle}}, {{firma}}. Eingesetzt wird
// erst beim Versand auf dem Server (renderDraft). Bewerber werden gesiezt
// (Korrespondenz im Namen des Kunden).
// ─────────────────────────────────────────────────────────────────────────────

export const TOENE = ["standard", "kurz", "persoenlich"] as const
export type Ton = (typeof TOENE)[number]

export const GESPRAECH = ["offen", "vor_ort", "video", "telefon"] as const
export type Gespraech = (typeof GESPRAECH)[number]

const P = { name: "{{name}}", stelle: "{{stelle}}", firma: "{{firma}}" }

function zusatzAbsatz(zusatz?: string | null): string {
  const z = zusatz?.trim()
  return z ? `${z}\n\n` : ""
}

export function absageVorlage(ton: Ton, zusatz?: string | null): { betreff: string; text: string } {
  const betreff = `Ihre Bewerbung als ${P.stelle} bei ${P.firma}`
  if (ton === "standard" && !zusatz?.trim()) return { betreff, text: defaultRejectionText(P.name, P.stelle, P.firma) }
  const einleitung =
    ton === "kurz"
      ? `vielen Dank für Ihre Bewerbung als ${P.stelle}. Wir haben uns für andere Kandidatinnen und Kandidaten entschieden.`
      : ton === "persoenlich"
        ? `vielen Dank für Ihre Bewerbung als ${P.stelle} und die Zeit, die Sie sich dafür genommen haben. Wir haben uns die Entscheidung nicht leicht gemacht und uns am Ende für andere Kandidatinnen und Kandidaten entschieden.`
        : `vielen Dank für Ihre Bewerbung als ${P.stelle} bei ${P.firma}.\n\nNach sorgfältiger Prüfung aller eingegangenen Bewerbungen müssen wir Ihnen leider mitteilen, dass wir uns für andere Kandidatinnen und Kandidaten entschieden haben, die noch besser zu unserem aktuellen Anforderungsprofil passen.`
  const schluss =
    ton === "kurz"
      ? "Für Ihre weitere Suche wünschen wir Ihnen alles Gute."
      : "Wir danken Ihnen für Ihr Interesse an unserem Unternehmen und wünschen Ihnen bei Ihrer weiteren Suche viel Erfolg."
  return {
    betreff,
    text: `Guten Tag ${P.name},\n\n${einleitung}\n\n${zusatzAbsatz(zusatz)}${schluss}\n\nMit freundlichen Grüßen\n${P.firma}`,
  }
}

const EINLADUNG_SATZ: Record<Gespraech, string> = {
  offen: "Wir möchten Sie gern zu einem Gespräch einladen.",
  vor_ort: "Wir möchten Sie gern zu einem Gespräch bei uns vor Ort einladen.",
  video: "Wir möchten Sie gern zu einem Gespräch per Video einladen.",
  telefon: "Wir möchten Sie gern zu einem Telefongespräch einladen.",
}

export function einladungVorlage(gespraech: Gespraech, zusatz?: string | null): { betreff: string; text: string } {
  return {
    betreff: `Einladung zum Gespräch: ${P.stelle} bei ${P.firma}`,
    text: `Guten Tag ${P.name},\n\nvielen Dank für Ihre Bewerbung als ${P.stelle}. ${EINLADUNG_SATZ[gespraech]}\n\n${zusatzAbsatz(zusatz)}Bitte antworten Sie kurz auf diese E-Mail, dann stimmen wir einen Termin mit Ihnen ab.\n\nMit freundlichen Grüßen\n${P.firma}`,
  }
}

/** Platzhalter füllen. Nur beim Versand auf dem Server und in der Vorschau im Browser. */
export function renderDraft(text: string, werte: { name: string; stelle: string; firma: string }): string {
  return text.replaceAll(P.name, werte.name).replaceAll(P.stelle, werte.stelle).replaceAll(P.firma, werte.firma)
}
