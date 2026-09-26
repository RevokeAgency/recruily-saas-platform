import { z } from "zod"

import { generateStructured } from "@/lib/ai/generate"
import { withApplicantTextRule } from "@/lib/ai/applicant-text"

// ─────────────────────────────────────────────────────────────────────────────
// Abgleich: Aussagen im Anschreiben gegen den Lebenslauf.
//
// Was ein Recruiter wissen will, ist nicht, wer den Text geschrieben hat,
// sondern ob etwas dahintersteckt. Deshalb werden prüfbare Aussagen aus dem
// Anschreiben ("acht Personen geführt", "fließend Englisch") gegen den
// Lebenslauf gehalten. Was dort nicht steht oder anders steht, wird zur
// Nachfrage im Gesprächsleitfaden. Geprüft wird im Gespräch, von einem
// Menschen. Der Abgleich selbst ändert den Match nicht. Die Nachfragen
// werden wie jede Leitfaden-Frage mit 1 bis 5 Punkten bewertet und zählen
// nur über diese Bewertung (Gesprächsanteil, Migration 029).
//
// Jede Aussage muss wörtlich im Anschreiben stehen, jeder Beleg wörtlich im
// Lebenslauf. Das prüft der Code, nicht das Modell. Was sich nicht
// nachweisen lässt, wird verworfen, statt dem Bewerber etwas zu unterstellen.
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimStatus = "belegt" | "abweichend" | "ohne_beleg"

export interface CoverClaim {
  aussage: string
  thema: string
  status: ClaimStatus
  /** Zitat aus dem Lebenslauf. Bei "ohne_beleg" null. */
  beleg: string | null
  hinweis: string
  nachfrage: string
  wofuer: string
  schwach: string
  stark: string
}

export interface ClaimCheck {
  /** Aussagen, die geprüft und nachgewiesen wurden. */
  claims: CoverClaim[]
  /** Vom Modell gemeldet, aber im Text nicht auffindbar und deshalb verworfen. */
  discarded: number
}

const MIN_COVER_CHARS = 150

const claimSchema = z.object({
  aussage: z
    .string()
    .describe("Wörtliches Zitat aus dem ANSCHREIBEN (ein Satz oder Satzteil), Zeichen für Zeichen übernommen, nicht umformuliert"),
  thema: z.enum(["Erfahrung", "Fachkenntnis", "Verantwortung", "Ergebnis", "Ausbildung", "Sprache"]),
  pruefung: z
    .string()
    .describe("Zuerst prüfen: Was steht im Lebenslauf zu dieser Aussage? Ein bis zwei Sätze. Erst danach den Status festlegen."),
  status: z.enum(["belegt", "abweichend", "ohne_beleg"]),
  beleg: z
    .string()
    .nullable()
    .describe("Wörtliches Zitat aus dem LEBENSLAUF, das die Aussage stützt (belegt) oder ihr widerspricht (abweichend). null bei ohne_beleg."),
  hinweis: z
    .string()
    .describe("Ein Satz für den Recruiter: was fehlt oder was abweicht. Sachlich, ohne Unterstellung."),
  nachfrage: z
    .string()
    .describe("Offene Nachfrage im Gespräch, Sie-Form, lädt zu einem konkreten Beispiel ein, ohne Vorwurf. Leer lassen bei belegt."),
  wofuer: z.string().describe("Worauf der Recruiter bei der Antwort achten sollte. Leer bei belegt."),
  schwach: z.string().describe("Wie eine schwache Antwort klingt (1–2 Punkte). Leer bei belegt."),
  stark: z.string().describe("Wie eine starke Antwort klingt (4–5 Punkte). Leer bei belegt."),
})

const resultSchema = z.object({ aussagen: z.array(claimSchema) })

const systemPrompt = `Du gleichst Aussagen aus einem Anschreiben mit dem Lebenslauf derselben Person ab. Das Ergebnis sind Nachfragen für ein Bewerbungsgespräch.

## Welche Aussagen du prüfst
Nur überprüfbare Angaben über den bisherigen Werdegang:
- Dauer von Erfahrung ("seit fünf Jahren im Vertrieb")
- Rollen und Verantwortung (Teamgröße, Budget, Führung, Projektleitung)
- Messbare Ergebnisse ("Umsatz um 30 Prozent gesteigert")
- Konkret genannte Werkzeuge, Technologien, Methoden, die eingesetzt wurden
- Abschlüsse, Zertifikate, Sprachniveaus

Nicht prüfen: Motivation, Wünsche, Aussagen über das Unternehmen, Zukunftspläne und Selbsteinschätzungen von Eigenschaften ("teamfähig", "belastbar", "kommunikationsstark"). Die lassen sich im Lebenslauf ohnehin nicht belegen.

Höchstens acht Aussagen, die für die Stelle am wichtigsten sind. Keine Aussage doppelt.

## Status
- belegt: Der Lebenslauf enthält eine Angabe, die die Aussage stützt. Andere Wortwahl ist in Ordnung.
- abweichend: Der Lebenslauf sagt etwas, das der Aussage widerspricht (andere Dauer, andere Rolle, anderer Abschluss). Kleine Rundungen ("fast fünf Jahre" gegenüber 4 Jahren 8 Monaten) sind KEINE Abweichung.
- ohne_beleg: Im Lebenslauf steht nichts dazu.

"ohne_beleg" heißt nicht "unwahr". Lebensläufe sind knapp, vieles steht nur im Anschreiben. Formuliere Hinweis und Nachfrage entsprechend neutral.

## Zitate
"aussage" und "beleg" sind wörtliche Zitate, Zeichen für Zeichen aus dem jeweiligen Text kopiert. Nicht kürzen mit Auslassungspunkten, nicht umformulieren. Ein Zitat, das so nicht im Text steht, wird verworfen.

## Nachfragen
Offen, in Sie-Form, zielen auf ein konkretes Beispiel oder die konkrete Station ("In welcher Position war das, und wie groß war das Team?"). Kein Misstrauen, kein "Stimmt es, dass …". Dazu eine Verankerung, wie eine schwache und eine starke Antwort klingt.

Antworte auf Deutsch.`

// Normalisierung für den Zitatabgleich: Anführungszeichen, Striche, Silben-
// trennung und Zeilenumbrüche aus der PDF-Extraktion sollen einen echten
// Treffer nicht verhindern.
function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[­​-‍﻿]/g, "")
    .replace(/[„“”"'‚‘’«»‹›]/g, "")
    .replace(/[–—‑]/g, "-")
    .replace(/(\p{L})-\s+(\p{L})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .replace(/\s*([.,;:!?])\s*/g, "$1 ")
    .trim()
    .replace(/[.,;:!?]+$/, "")
}

// Zahlen zählen unabhängig von ihrer Länge: "12" statt "zwölf" oder "3"
// statt "5" Jahre ist genau der Unterschied, auf den es ankommt.
function words(s: string): string[] {
  return normalize(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 || /\p{N}/u.test(w))
}

/**
 * Steht das Zitat im Text? Exakt nach Normalisierung, sonst müssen fast alle
 * Wörter des Zitats in derselben Reihenfolge im Text vorkommen (Modelle
 * glätten gelegentlich ein Satzzeichen oder eine Endung).
 */
export function quoteFound(quote: string | null | undefined, text: string): boolean {
  if (!quote || quote.trim().length < 8) return false
  const q = normalize(quote)
  const t = normalize(text)
  if (t.includes(q)) return true
  const qw = words(quote)
  if (qw.length < 3) return false
  const tw = words(text)
  let pos = 0
  let hits = 0
  for (const w of qw) {
    const at = tw.indexOf(w, pos)
    if (at !== -1) {
      hits++
      pos = at + 1
    }
  }
  if (hits / qw.length < 0.85) return false
  // Jede Zahl des Zitats muss im Text stehen, auch wenn der Rest passt.
  const tset = new Set(tw)
  return qw.filter((w) => /\p{N}/u.test(w)).every((w) => tset.has(w))
}

const GENERIC = new Set(
  (
    "erfahrung erfahrungen jahre jahren jahr kenntnisse kenntnissen team teams projekt projekte projekten bereich " +
    "bereichen verantwortung kunden kundinnen mitarbeiter mitarbeitern mitarbeitende leitung führung einsatz arbeit " +
    "aufgaben unternehmen tätigkeit tätigkeiten rahmen umgang praxis expertise hintergrund position rolle stelle zeit " +
    "umsatz ergebnis ergebnisse zuletzt dabei durch meine mein meiner meinem meinen sehr bereits während nach über " +
    "auch seit zudem außerdem darüber hinaus insgesamt gerne dort hier diese dieser dieses ihrem ihren ihnen"
  ).split(" "),
)

/**
 * "Nicht im Lebenslauf" lässt sich nicht zitieren. Gegenprobe: Nennt die
 * Aussage konkrete Begriffe (SAP, AWS, TypeScript, S/4HANA, ISO …) und stehen
 * alle davon im Lebenslauf, ist "ohne Beleg" vermutlich ein Irrtum des
 * Modells. Dann lieber nicht nachfragen als etwas unterstellen.
 */
export function likelyMentioned(aussage: string, resume: string): boolean {
  const terms = (aussage.match(/[\p{L}\p{N}][\p{L}\p{N}+#./-]*/gu) ?? [])
    .map((t) => t.replace(/[./-]+$/, ""))
    .filter((t) => {
      const upper = t.match(/\p{Lu}/gu)?.length ?? 0
      const hasLetter = /\p{L}/u.test(t)
      const hasDigit = /\p{N}/u.test(t)
      // Fachbegriffe: mehrere Großbuchstaben (SAP, TypeScript), Buchstaben mit
      // Ziffern (S4, ISO9001) oder Zeichen wie + # / (C++, C#, S/4HANA).
      if (hasLetter && (upper >= 2 || (hasDigit && t.length >= 2) || /[+#/]/.test(t))) return true
      // Sonstige großgeschriebene Wörter (Salesforce, Entwickler, Scrum),
      // außer den allgemeinen, die in fast jedem Lebenslauf stehen.
      return /^\p{Lu}/u.test(t) && t.length >= 4 && !GENERIC.has(t.toLowerCase())
    })
  if (terms.length === 0) return false
  const text = normalize(resume)
  return terms.every((t) => text.includes(normalize(t)))
}

/**
 * Prüft das Anschreiben gegen den Lebenslauf. Liefert null, wenn es nichts
 * abzugleichen gibt (kein Anschreiben, kein Lebenslauftext).
 */
export async function checkCoverLetterClaims(input: {
  resumeText: string | null | undefined
  coverText: string | null | undefined
  jobTitle?: string | null
  requiredSkills?: string[] | null
}): Promise<ClaimCheck | null> {
  const resume = input.resumeText?.trim() ?? ""
  const cover = input.coverText?.trim() ?? ""
  if (cover.length < MIN_COVER_CHARS || resume.length < MIN_COVER_CHARS) return null

  const job = input.jobTitle
    ? `\n=== STELLE (nur zur Auswahl der wichtigsten Aussagen) ===\n${input.jobTitle}${
        input.requiredSkills?.length ? ` · Muss-Skills: ${input.requiredSkills.join(", ")}` : ""
      }`
    : ""

  const { output } = await generateStructured({
    task: "verification",
    label: "Abgleich Anschreiben",
    schema: resultSchema,
    system: withApplicantTextRule(systemPrompt),
    prompt: `=== ANSCHREIBEN ===\n${cover.slice(0, 6000)}\n\n=== LEBENSLAUF ===\n${resume.slice(0, 24000)}${job}`,
  })
  if (!output) return null

  const claims: CoverClaim[] = []
  const seen = new Set<string>()
  let discarded = 0
  for (const a of output.aussagen.slice(0, 8)) {
    const key = normalize(a.aussage)
    if (seen.has(key)) continue
    // Aussage muss im Anschreiben stehen, sonst gibt es nichts nachzufragen.
    if (!quoteFound(a.aussage, cover)) {
      discarded++
      continue
    }
    // Ein Beleg oder Widerspruch muss im Lebenslauf stehen. Fehlt er, lässt
    // sich weder "belegt" noch "abweichend" nachweisen: verwerfen.
    if (a.status !== "ohne_beleg" && !quoteFound(a.beleg, resume)) {
      discarded++
      continue
    }
    if (a.status === "ohne_beleg" && likelyMentioned(a.aussage, resume)) {
      discarded++
      continue
    }
    const open = a.status !== "belegt"
    if (open && !a.nachfrage.trim()) {
      discarded++
      continue
    }
    seen.add(key)
    claims.push({
      // Ohne Schlusspunkt, damit das Zitat sich in einen Satz einfügt.
      aussage: a.aussage.trim().replace(/[.!?;,]+$/, ""),
      thema: a.thema,
      status: a.status,
      beleg: a.status === "ohne_beleg" ? null : (a.beleg?.trim().replace(/[.!?;,]+$/, "") ?? null),
      hinweis: a.hinweis.trim(),
      nachfrage: a.nachfrage.trim(),
      wofuer: a.wofuer.trim(),
      schwach: a.schwach.trim(),
      stark: a.stark.trim(),
    })
  }
  return { claims, discarded }
}
