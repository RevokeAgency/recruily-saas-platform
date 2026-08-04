import { generateStructured } from "@/lib/ai/generate"
import { z } from "zod"


// ─────────────────────────────────────────────────────────────────────────────
// IMLRS 2.0 — Stage A: career dossier extraction.
//
// The FULL CV text is normalised ONCE per candidate into a structured dossier
// (strict JSON, temperature 0). Matching never judges raw text again — every
// later stage works from this dossier, which removes the "attention drift"
// that made single-prompt scoring inconsistent. The dossier is cached on the
// candidate row and reused across every job they are matched against.
// ─────────────────────────────────────────────────────────────────────────────

const stationSchema = z.object({
  role: z.string().describe("Positionsbezeichnung"),
  company: z.string().describe("Arbeitgeber (oder 'Unbekannt')"),
  industry: z.string().describe("Branche des Arbeitgebers, z. B. 'E-Commerce', 'Maschinenbau'"),
  from: z.string().describe("Beginn im Format YYYY-MM (oder YYYY, wenn nur das Jahr bekannt ist)"),
  to: z.string().describe("Ende im Format YYYY-MM, YYYY oder 'heute'"),
  seniority: z.enum(["einstieg", "professional", "senior", "lead", "management"]).describe("Senioritätslevel dieser Station"),
  achievements: z.array(z.string()).describe("Konkrete Aufgaben/Erfolge dieser Station, wörtlich aus dem CV abgeleitet (max. 4)"),
})

const skillEvidenceSchema = z.object({
  skill: z.string().describe("Die Fähigkeit, normalisiert (z. B. 'React' statt 'react.js')"),
  evidence: z.string().describe("WO die Fähigkeit belegt ist: Station/Projekt/Zertifikat. 'nur gelistet', wenn sie ausschließlich in einer Skill-Liste steht"),
  depth: z.enum(["erwähnt", "angewendet", "vertieft"]).describe("erwähnt = nur gelistet; angewendet = in mind. einer Station genutzt; vertieft = mehrjährig/zentral"),
})

const dossierSchema = z.object({
  stations: z.array(stationSchema).describe("Beruflicher Werdegang, neueste zuerst"),
  totalYearsExperience: z.number().describe("Gesamte Berufserfahrung in Jahren (ohne Ausbildung/Studium), konservativ berechnet"),
  gaps: z.array(z.string()).describe("Lücken im Lebenslauf > 3 Monate, mit Zeitraum und — falls erkennbar — Grund (z. B. '2023-01 bis 2023-08: nicht erklärt')"),
  trajectory: z.enum(["aufsteigend", "stabil", "wechselhaft", "absteigend"]).describe("Karriereverlauf über die Stationen hinweg"),
  skills: z.array(skillEvidenceSchema).describe("Alle Fähigkeiten mit Beleg und Tiefe"),
  languages: z.array(z.object({
    language: z.string(),
    level: z.enum(["grundkenntnisse", "gut", "fliessend", "verhandlungssicher", "muttersprache", "unbekannt"]),
  })).describe("Sprachen mit Niveau; 'unbekannt' wenn kein Niveau angegeben"),
  education: z.array(z.string()).describe("Abschlüsse/Ausbildungen, höchster zuerst"),
  certifications: z.array(z.string()).describe("Zertifikate und Weiterbildungen"),
  industries: z.array(z.string()).describe("Branchen, in denen gearbeitet wurde"),
  leadership: z.string().describe("Führungserfahrung: Teamgröße/Verantwortung, oder 'keine belegt'"),
  redFlags: z.array(z.string()).describe("Auffälligkeiten: sehr häufige Wechsel, unklare Angaben, Widersprüche. Leer, wenn keine"),
  summary: z.string().describe("3-4 Sätze neutrales Profil-Fazit"),
})

export type CareerDossier = z.infer<typeof dossierSchema>

const systemPrompt = `Du bist ein präziser CV-Analyst. Du überführst Lebensläufe in ein strukturiertes Karriere-Dossier.

## Regeln
- Extrahiere NUR, was im Text belegt ist. Erfinde nichts, schätze nicht großzügig.
- Berechne Berufsjahre KONSERVATIV aus den Stationsdaten (Überlappungen nicht doppelt zählen, Ausbildung zählt nicht).
- Markiere Lücken > 3 Monate zwischen Stationen explizit.
- Bei Skills unterscheide streng: nur in einer Liste erwähnt vs. tatsächlich in Stationen angewendet vs. mehrjährig vertieft.
- Widersprüche und Auffälligkeiten gehören in redFlags — sie zu verschweigen wäre ein Fehler.
- Antworte ausschließlich auf Deutsch.`

/**
 * Builds the career dossier from the candidate's full CV text (preferred) or,
 * as a degraded fallback, from the structured fields alone. Temperature 0 →
 * same input, same dossier.
 */
export async function generateDossier(input: {
  resumeText?: string | null
  coverLetterText?: string | null
  fullName?: string | null
  jobTitle?: string | null
  skills?: string[] | null
  yearsOfExperience?: number | null
  education?: string | null
  location?: string | null
  summaryAi?: string | null
}): Promise<CareerDossier> {
  const hasFullText = !!input.resumeText?.trim()

  const source = hasFullText
    ? `=== VOLLSTÄNDIGER LEBENSLAUF (Text) ===\n${input.resumeText!.trim().slice(0, 24000)}`
    : `=== STRUKTURIERTE DATEN (kein CV-Volltext verfügbar — konservativ extrahieren) ===
Name: ${input.fullName || "Unbekannt"}
Letzte Position: ${input.jobTitle || "Unbekannt"}
Berufsjahre laut Erfassung: ${input.yearsOfExperience ?? "Unbekannt"}
Skills laut Erfassung: ${(input.skills || []).join(", ") || "Keine"}
Ausbildung: ${input.education || "Unbekannt"}
Standort: ${input.location || "Unbekannt"}
Zusammenfassung: ${input.summaryAi || "—"}`

  const cover = input.coverLetterText?.trim()
    ? `\n\n=== ANSCHREIBEN ===\n${input.coverLetterText.trim().slice(0, 6000)}`
    : ""

  const { output } = await generateStructured({
    task: "extraction",
    label: "Dossier-Extraktion",
    schema: dossierSchema,
    system: systemPrompt,
    prompt: `Erstelle das Karriere-Dossier für diesen Kandidaten:\n\n${source}${cover}`,
  })

  if (!output) throw new Error("Dossier extraction failed")
  return output
}

/** Compact, deterministic text rendering of a dossier for downstream prompts. */
export function renderDossier(d: CareerDossier): string {
  const stations = d.stations
    .map((s) => `- ${s.from} bis ${s.to}: ${s.role} @ ${s.company} (${s.industry}, ${s.seniority})${s.achievements.length ? ` — ${s.achievements.join("; ")}` : ""}`)
    .join("\n")
  const skills = d.skills.map((s) => `- ${s.skill} [${s.depth}] — ${s.evidence}`).join("\n")
  const langs = d.languages.map((l) => `${l.language} (${l.level})`).join(", ")
  return `WERDEGANG (${d.totalYearsExperience} Jahre gesamt, Verlauf: ${d.trajectory}):
${stations || "- keine Stationen belegt"}
LÜCKEN: ${d.gaps.length ? d.gaps.join(" | ") : "keine > 3 Monate"}
SKILLS MIT BELEG:
${skills || "- keine"}
SPRACHEN: ${langs || "keine Angabe"}
AUSBILDUNG: ${d.education.join("; ") || "keine Angabe"}
ZERTIFIKATE: ${d.certifications.join("; ") || "keine"}
BRANCHEN: ${d.industries.join(", ") || "unbekannt"}
FÜHRUNG: ${d.leadership}
RED FLAGS: ${d.redFlags.length ? d.redFlags.join(" | ") : "keine"}
FAZIT: ${d.summary}`
}
