import { describe, expect, it, vi } from "vitest"
import { istRechtlicheVoraussetzung, splitKoCriteria } from "@/lib/matching/rechtliche-voraussetzung"

// Vorgabe 23.11.2026: Ausschließen darf nur, ohne das jemand die Tätigkeit
// rechtlich nicht ausüben darf. Anlass: "Technische Ausbildung (Uni/FH)" hat
// eine Floristin mit 13 Jahren Erfahrung als K.O. auf 12 % gedeckelt.

vi.mock("@/lib/ai/generate", () => ({
  generateStructured: vi.fn(async () => ({
    output: {
      mappings: [
        { required: "Technische Ausbildung (Uni/FH)", reasoning: "kein Studium", coveredBy: null, coverage: "keine", zulassung: true, zulassungGrund: "Modell meint ja" },
        { required: "Diplom DGKP mit Eintragung im Gesundheitsberuferegister", reasoning: "fehlt", coveredBy: null, coverage: "keine", zulassung: true },
        { required: "5 Jahre Führungserfahrung", reasoning: "fehlt", coveredBy: null, coverage: "keine", zulassung: true },
      ],
    },
    run: { provider: "mistral", modelId: "m", euResident: true },
  })),
}))

describe("Nur rechtliche Voraussetzungen schließen aus", () => {
  it.each([
    "Technische Ausbildung (Uni/FH)",
    "Abgeschlossenes Studium (Bachelor oder Master)",
    "FH-Abschluss Betriebswirtschaft",
    "HTL-Matura",
    "Lehrabschluss als Elektriker",
    "Meisterprüfung",
    "5 Jahre Berufserfahrung",
    "Deutsch C1",
    "SAP-Kenntnisse",
    "Erfahrung in einer Arztpraxis",
    "Kassenregistrierung",
    "Führungserfahrung",
  ])("kein Ausschluss: „%s“", (t) => {
    expect(istRechtlicheVoraussetzung(t)).toBe(false)
  })

  it.each([
    "Führerschein Klasse B",
    "Staplerschein",
    "Arbeitserlaubnis für Österreich",
    "Rot-Weiß-Rot-Karte",
    "Diplom DGKP mit Eintragung im Gesundheitsberuferegister",
    "Berufsberechtigung als Ziviltechniker",
    "Approbation als Ärztin",
    "Zulassung als Rechtsanwalt",
    "Befähigungsnachweis Gas- und Sanitärtechnik",
    "Nostrifikation des Pflegediploms",
    "Pflegefachassistenz",
    "Lehramt Mathematik",
  ])("Ausschluss möglich: „%s“", (t) => {
    expect(istRechtlicheVoraussetzung(t)).toBe(true)
  })

  it("K.O.-Kriterien des Kunden: rechtliche bleiben, der Rest wird Anforderung", () => {
    expect(splitKoCriteria(["Studium (Uni/FH)", "Führerschein B", " ", "5 Jahre Erfahrung", "Arbeitserlaubnis EU"])).toEqual({
      rechtlich: ["Führerschein B", "Arbeitserlaubnis EU"],
      anforderung: ["Studium (Uni/FH)", "5 Jahre Erfahrung"],
    })
  })

  it("Zulassungssperre: Studium und Erfahrung deckeln nie, ein Registereintrag schon", async () => {
    const { computeHardFacts, zulassungsSperre } = await import("@/lib/matching/hard-facts")
    const f = await computeHardFacts({
      dossier: null,
      candidateSkills: ["Floristik", "Kundenberatung"],
      job: { required_skills: ["Technische Ausbildung (Uni/FH)", "5 Jahre Führungserfahrung", "Diplom DGKP mit Eintragung im Gesundheitsberuferegister"] },
    })
    const byName = Object.fromEntries(f.requiredSkillMappings.map((m) => [m.required, m.zulassung]))
    expect(byName["Technische Ausbildung (Uni/FH)"]).toBe(false)
    expect(byName["5 Jahre Führungserfahrung"]).toBe(false)
    expect(byName["Diplom DGKP mit Eintragung im Gesundheitsberuferegister"]).toBe(true)
    const sperre = zulassungsSperre(f)
    expect(sperre.fehlend.map((m) => m.required)).toEqual(["Diplom DGKP mit Eintragung im Gesundheitsberuferegister"])
  })

  it("ohne rechtliche Anforderung keine Sperre, auch wenn das Modell „Zulassung“ sagt", async () => {
    const { computeHardFacts, zulassungsSperre } = await import("@/lib/matching/hard-facts")
    const f = await computeHardFacts({ dossier: null, candidateSkills: ["Floristik"], job: { required_skills: ["Technische Ausbildung (Uni/FH)"] } })
    expect(zulassungsSperre(f)).toMatchObject({ verletzt: false, cap: null })
  })
})

describe("K.O.-Urteile des Modells werden den Kriterien der Stelle zugeordnet", () => {
  it("auch bei leicht anderem Wortlaut (Eval 26.11.2026)", async () => {
    const { matchKnockoutResults } = await import("@/lib/matching/imlrs")
    const out = matchKnockoutResults(
      ["Führerschein Klasse B", "Arbeitserlaubnis für Österreich"],
      [
        { criterion: "Führerschein Klasse B (KO-Kriterium)", failed: true, reason: "laut CV kein Führerschein" },
        { criterion: "arbeitserlaubnis für österreich", failed: false, reason: "EU-Bürgerin" },
      ],
    )
    expect(out).toEqual([
      { criterion: "Führerschein Klasse B", failed: true, reason: "laut CV kein Führerschein" },
      { criterion: "Arbeitserlaubnis für Österreich", failed: false, reason: "EU-Bürgerin" },
    ])
  })

  it("erfundene Kriterien zählen nicht, fehlende Urteile schließen niemanden aus", async () => {
    const { matchKnockoutResults } = await import("@/lib/matching/imlrs")
    expect(matchKnockoutResults(["Führerschein Klasse B"], [{ criterion: "Studium", failed: true, reason: "x" }])).toEqual([])
    expect(matchKnockoutResults(["Führerschein Klasse B"], [])).toEqual([])
  })
})

describe("K.O. nur mit wörtlichem Zitat (Eval 26.11.2026: „im Dossier nicht belegt“ reichte für K.O.)", () => {
  const lena = "Lena Wolf, Vertrieb.\n2020 bis heute: Innendienst-Vertrieb. Hinweis: Ich besitze keinen Führerschein und nutze ausschließlich öffentliche Verkehrsmittel.\nAusbildung: HAK Matura."
  const ohne = "Max Berger, Servicetechniker. Seit 2018 Wartung von Heizungsanlagen. Ausbildung: Lehre Elektrotechnik."

  it("ausdrücklich verneint, Zitat steht im Lebenslauf: K.O.", async () => {
    const { pruefeKoUrteile } = await import("@/lib/matching/imlrs")
    const r = pruefeKoUrteile(
      [{ criterion: "Führerschein Klasse B", beleg: "Ich besitze keinen Führerschein", status: "nicht_erfuellt", reason: "ausdrücklich verneint" }],
      lena,
    )
    expect(r.urteile).toEqual([{ criterion: "Führerschein Klasse B", failed: true, reason: "ausdrücklich verneint" }])
    expect(r.roh[0].belegGeprueft).toBe(true)
  })

  it("nicht erwähnt, Modell sagt trotzdem nicht erfüllt: kein K.O., im Gespräch klären", async () => {
    const { pruefeKoUrteile } = await import("@/lib/matching/imlrs")
    const r = pruefeKoUrteile(
      [{ criterion: "Führerschein Klasse B", beleg: null, status: "nicht_erfuellt", reason: "Im Dossier nicht belegt, für Serviceeinsätze essenziell." }],
      ohne,
    )
    expect(r.urteile[0].failed).toBe(false)
    expect(r.urteile[0].reason).toMatch(/^Im Gespräch klären/)
  })

  it("erfundenes Zitat, das nicht in den Unterlagen steht: kein K.O.", async () => {
    const { pruefeKoUrteile } = await import("@/lib/matching/imlrs")
    const r = pruefeKoUrteile(
      [{ criterion: "Führerschein Klasse B", beleg: "Ich habe keinen Führerschein", status: "nicht_erfuellt", reason: "x" }],
      ohne,
    )
    expect(r.urteile[0].failed).toBe(false)
    expect(r.roh[0].belegGeprueft).toBe(false)
  })

  it("Auszüge für den Richter: der Satz zum Führerschein wird gefunden, sonst keiner", async () => {
    const { koAuszuege } = await import("@/lib/matching/imlrs")
    expect(koAuszuege(lena, "Führerschein Klasse B")).toEqual(["Hinweis: Ich besitze keinen Führerschein und nutze ausschließlich öffentliche Verkehrsmittel."])
    expect(koAuszuege(ohne, "Führerschein Klasse B")).toEqual([])
    expect(koAuszuege("Lenkberechtigung B vorhanden.", "Führerschein Klasse B")).toEqual(["Lenkberechtigung B vorhanden."])
  })
})
