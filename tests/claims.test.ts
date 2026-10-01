import { describe, expect, it } from "vitest"

import { likelyMentioned, quoteFound } from "@/lib/interview/claims"

const CV = "2019 bis 2024 Projekt-\nleiterin bei Bau AG. Einsatz von SAP S/4HANA und MS Project. Englisch C1. Senior Entwickler bei Muster GmbH."
const COVER = "Seit fünf Jahren leite ich Teams von bis zu zwölf Personen und habe dabei den Umsatz um 30 % gesteigert."

describe("quoteFound", () => {
  it("findet Zitate trotz Silbentrennung, Umbruch und Anführungszeichen", () => {
    expect(quoteFound("Projektleiterin bei Bau AG", CV)).toBe(true)
    expect(quoteFound("„Seit fünf Jahren leite ich Teams von bis zu zwölf Personen“", COVER)).toBe(true)
    expect(quoteFound("habe dabei den Umsatz um 30% gesteigert", COVER)).toBe(true)
  })

  it("verwirft Zitate mit veränderten Zahlen oder erfundenem Inhalt", () => {
    expect(quoteFound("leite ich Teams von bis zu 12 Personen", COVER)).toBe(false)
    expect(quoteFound("den Umsatz um 50 % gesteigert", COVER)).toBe(false)
    expect(quoteFound("Ich habe den Umsatz verdoppelt", COVER)).toBe(false)
  })
})

describe("likelyMentioned", () => {
  it("erkennt, wenn alle Fachbegriffe im Lebenslauf stehen", () => {
    expect(likelyMentioned("Erfahrung mit SAP S/4HANA", CV)).toBe(true)
  })
  it("bleibt bei fehlenden Begriffen oder ohne Fachbegriffe vorsichtig", () => {
    expect(likelyMentioned("Erfahrung mit Salesforce und SAP", CV)).toBe(false)
    expect(likelyMentioned("Ich habe acht Entwickler geführt", "Buchhalter bei X")).toBe(false)
    expect(likelyMentioned("Den Umsatz um 30 % gesteigert.", CV)).toBe(false)
  })
})
