import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  ALIAS_STOPWORDS,
  LEGAL_FORMS,
  RESERVED_SUBDOMAINS,
  addressLocalPart,
  customerSlugSuggestion,
  jobAliasBase,
  buildJobEmailAddress,
  matchJobByKey,
  parseInboundRecipient,
} from "@/lib/email/routing"

const JOB_ID = "4f2a9c00-0000-4000-8000-000000000001"

describe("Bewerbungsadresse bauen", () => {
  it("hat das Format stelle@firma.revetly.ai mit dem gespeicherten Adressnamen", () => {
    expect(buildJobEmailAddress("autohaus-berger", { inboundAlias: "kfz-mechatroniker", publicSlug: "kfz-mechatroniker-in-m-w-d", id: JOB_ID }))
      .toBe("kfz-mechatroniker@autohaus-berger.revetly.ai")
  })

  it("nimmt ohne Adressnamen den Kurznamen der Stellenseite", () => {
    expect(buildJobEmailAddress("autohaus-berger", { publicSlug: "kfz-mechatroniker-in-m-w-d", id: JOB_ID })).toBe("kfz-mechatroniker-in@autohaus-berger.revetly.ai")
  })

  it("behält die Laufnummer bei gleichnamigen Stellen", () => {
    expect(addressLocalPart("kfz-mechatroniker-in-m-w-d-2")).toBe("kfz-mechatroniker-in-2")
    expect(addressLocalPart("buchhaltung-w-m-d")).toBe("buchhaltung")
    expect(addressLocalPart("lagerlogistik")).toBe("lagerlogistik")
  })

  it("kürzt lange Titel an einem Bindestrich auf höchstens 40 Zeichen", () => {
    const local = addressLocalPart("senior-fachkraft-fuer-lagerlogistik-und-intralogistik-schwerpunkt-gefahrgut-m-w-d")
    expect(local.length).toBeLessThanOrEqual(40)
    expect(local).toBe("senior-fachkraft-fuer-lagerlogistik-und")
  })

  it("fällt ohne Kurznamen auf das alte Format zurück", () => {
    expect(buildJobEmailAddress("autohaus-berger", { id: JOB_ID, title: "Kfz-Mechatroniker" })).toBe(`kfz-mechatroniker+${JOB_ID}@autohaus-berger.revetly.ai`)
  })
})

describe("Kurze Namen", () => {
  it("macht aus dem Titel einen kurzen Adressnamen", () => {
    expect(jobAliasBase("Kfz-Mechatroniker:in (m/w/d)")).toBe("kfz-mechatroniker")
    expect(jobAliasBase("Senior Fachkraft für Lagerlogistik (m/w/d)")).toBe("fachkraft-lagerlogistik")
    expect(jobAliasBase("Mitarbeiter:in Kundenservice")).toBe("mitarbeiter-kundenservice")
    expect(jobAliasBase("Geschäftsführer für Österreich")).toBe("geschaeftsfuehrer")
    expect(jobAliasBase("Bäcker:in Groß")).toBe("baecker-gross")
    expect(jobAliasBase("(m/w/d)")).toBe("bewerbung")
  })

  it("bleibt kurz, auch bei langen Titeln", () => {
    for (const t of ["Außendienstmitarbeiterin Medizintechnikprodukte Region Süd", "Projektleiter Hochbau und Tiefbau mit Schwerpunkt Brückenbau"]) {
      expect(jobAliasBase(t).length).toBeLessThanOrEqual(28)
    }
  })

  it("schlägt für die Firma einen Namen ohne Rechtsform vor", () => {
    expect(customerSlugSuggestion("Autohaus Berger GmbH")).toBe("autohaus-berger")
    expect(customerSlugSuggestion("Huber Transporte e.U.")).toBe("huber-transporte")
    expect(customerSlugSuggestion("Bäckerei Groß OG")).toBe("baeckerei-gross")
    expect(customerSlugSuggestion("GmbH")).toBe("gmbh")
  })
})

describe("Empfängeradresse lesen", () => {
  it("erkennt das neue Format", () => {
    expect(parseInboundRecipient("Kfz-Mechatroniker-in@Autohaus-Berger.revetly.ai")).toEqual({
      customerSlug: "autohaus-berger", jobId: null, jobKey: "kfz-mechatroniker-in",
    })
  })

  it("liest auch \"Name <adresse>\"", () => {
    expect(parseInboundRecipient("Bewerbungen <lagerlogistik@spedition-huber.revetly.ai>").jobKey).toBe("lagerlogistik")
  })

  it("erkennt weiter beide alten Formate mit Stellen-ID", () => {
    expect(parseInboundRecipient(`kfz+${JOB_ID}@autohaus-berger.revetly.ai`)).toEqual({ customerSlug: "autohaus-berger", jobId: JOB_ID, jobKey: null })
    expect(parseInboundRecipient(`autohaus-berger.kfz+${JOB_ID}@revetly.ai`)).toEqual({ customerSlug: "autohaus-berger", jobId: JOB_ID, jobKey: null })
  })

  it("ordnet fremde Domains nicht zu", () => {
    expect(parseInboundRecipient("kfz@autohaus-berger.example.com")).toEqual({ customerSlug: null, jobId: null, jobKey: null })
  })
})

describe("Stelle zur Adresse finden", () => {
  const jobs = [
    { id: "a", public_slug: "kfz-mechatroniker-in-m-w-d", is_active: true },
    { id: "b", public_slug: "kfz-mechatroniker-in-m-w-d-2", is_active: true },
    { id: "c", public_slug: "buchhaltung-m-w-d", is_active: false },
    { id: "d", public_slug: "buchhaltung-w-m-d", is_active: true },
    { id: "e", public_slug: "lager-m-w-d", is_active: false },
    { id: "f", public_slug: "lager-w-m-d", is_active: false },
  ]

  it("nimmt zuerst den gespeicherten Adressnamen", () => {
    const withAlias = [...jobs, { id: "g", public_slug: "kfz-mechatroniker-in-m-w-d-3", is_active: true, inbound_alias: "kfz-mechatroniker" }]
    expect(matchJobByKey(withAlias, "kfz-mechatroniker")?.id).toBe("g")
  })

  it("findet die Stelle eindeutig, auch bei gleichnamigen", () => {
    expect(matchJobByKey(jobs, "kfz-mechatroniker-in")?.id).toBe("a")
    expect(matchJobByKey(jobs, "kfz-mechatroniker-in-2")?.id).toBe("b")
  })

  it("nimmt bei Doppelungen die einzige offene Stelle", () => {
    expect(matchJobByKey(jobs, "buchhaltung")?.id).toBe("d")
  })

  it("ordnet nichts zu, wenn es nicht eindeutig ist", () => {
    expect(matchJobByKey(jobs, "lager")).toBeNull()
    expect(matchJobByKey(jobs, "gibt-es-nicht")).toBeNull()
  })
})

describe("Listen in App und Migration", () => {
  const sql = readFileSync("scripts/034_inbound_addresses.sql", "utf8")
  // n-te Liste "any (array[ … ])" in der Migration.
  const arrays = [...sql.matchAll(/any \(array\[([\s\S]*?)\]\)/g)].map((m) => [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]).sort())

  it("reservierte Subdomains stimmen überein", () => {
    expect(arrays[0]).toEqual([...RESERVED_SUBDOMAINS].sort())
  })
  it("Rechtsformen stimmen überein", () => {
    expect(arrays[1]).toEqual([...LEGAL_FORMS].sort())
  })
  it("Füllwörter stimmen überein", () => {
    expect(arrays[2]).toEqual([...ALIAS_STOPWORDS].sort())
  })
})
