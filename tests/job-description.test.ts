import { describe, expect, it } from "vitest"

import { jobDescription } from "@/lib/seo/job-description"

describe("Meta-Beschreibung der Stellenseite", () => {
  it("bleibt bei kurzen Angaben vollständig", () => {
    const d = jobDescription({ title: "Tischler", company: "Holz GmbH", location: "Graz", employment_type: "full-time" })
    expect(d).toBe("Jetzt bewerben als Tischler bei Holz GmbH. Graz, Vollzeit. Bewerbung in wenigen Schritten, ohne Konto.")
  })

  it("lässt bei langen Angaben zuerst den Schlusssatz weg", () => {
    const d = jobDescription({
      title: "Sales Manager (m/w/d) B2B Software",
      company: "GAMED",
      location: "Graz, Österreich",
      employment_type: "full-time",
      salary_range: "ab €3.954,00 monatlich",
    })
    expect(d.length).toBeLessThanOrEqual(158)
    expect(d).not.toContain("ohne Konto")
    expect(d).toContain("ab €3.954,00 monatlich.")
  })

  it("kürzt an einer Wortgrenze, wenn auch der Kern zu lang ist", () => {
    const d = jobDescription({
      title: "Diplomierte/r Gesundheits- und Krankenpfleger/in (DGKP) für die interne Intensivstation mit Schwerpunkt Pflegedokumentation",
      company: "Landeskrankenhaus Musterstadt",
      location: "Musterstadt, Österreich",
      employment_type: "part-time",
      salary_range: "ab €3.200 brutto monatlich laut Kollektivvertrag",
    })
    expect(d.length).toBeLessThanOrEqual(158)
    expect(d.endsWith("…")).toBe(true)
  })
})
