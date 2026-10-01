import { describe, expect, it } from "vitest"

import { jobPostingJsonLd, parseSalary } from "@/lib/seo/job-posting"

// Die Daten sind bewusst lose typisiert (schema.org), im Test reicht ein Index-Zugriff.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ld = Record<string, any>

describe("parseSalary", () => {
  it.each([
    ["ab € 3.200 brutto/Monat, Überzahlung möglich", { min: 3200, unit: "MONTH" }],
    ["€60.000 - €80.000", { min: 60000, max: 80000, unit: "YEAR" }],
    ["€ 22,50 pro Stunde", { min: 22.5, unit: "HOUR" }],
    ["EUR 45k–55k p.a.", { min: 45000, max: 55000, unit: "YEAR" }],
    ["Mindestgehalt laut KV € 2.450 brutto monatlich (14x)", { min: 2450, unit: "MONTH" }],
    ["€ 4.100,00 brutto/Monat", { min: 4100, unit: "MONTH" }],
  ])("liest %s", (text, want) => {
    expect(parseSalary(text)).toEqual(want)
  })

  it.each(["nach Vereinbarung", "ab 2026", "3.500 brutto", ""])("gibt bei unklarer Angabe nichts aus: %s", (text) => {
    expect(parseSalary(text)).toBeNull()
  })
})

describe("jobPostingJsonLd", () => {
  const base = {
    id: "j1", title: "Frontend Dev", company: "Muster GmbH", description: "Wir suchen dich.\n\n- <b>React</b>",
    location: "Wien", employment_type: "full-time", is_active: true, created_at: "2026-09-20T10:00:00Z",
  }

  it("baut gültige Daten mit Ort, Land und maskiertem HTML", () => {
    const d = jobPostingJsonLd(base, { url: "https://revetly.ai/jobs/x/y" }) as Ld
    expect(d["@type"]).toBe("JobPosting")
    expect(d.datePosted).toBe("2026-09-20")
    expect(d.jobLocation.address).toEqual({ "@type": "PostalAddress", addressLocality: "Wien", addressCountry: "AT" })
    expect(d.description).toContain("&lt;b&gt;React&lt;/b&gt;")
  })

  it("markiert nur echte Remote-Stellen als TELECOMMUTE", () => {
    const hybrid = jobPostingJsonLd({ ...base, location: "Wien (Remote möglich)" }, { url: "u" }) as Ld
    expect(hybrid.jobLocationType).toBeUndefined()
    const remote = jobPostingJsonLd({ ...base, employment_type: "remote" }, { url: "u" }) as Ld
    expect(remote.jobLocationType).toBe("TELECOMMUTE")
  })

  it("gibt für geschlossene Stellen und ohne Datum nichts aus", () => {
    expect(jobPostingJsonLd({ ...base, is_active: false }, { url: "u" })).toBeNull()
    expect(jobPostingJsonLd({ ...base, created_at: null }, { url: "u" })).toBeNull()
  })

  it("ergänzt baseSalary bei eindeutigem Gehalt", () => {
    const d = jobPostingJsonLd({ ...base, salary_range: "ab € 3.200 brutto/Monat" }, { url: "u" }) as Ld
    expect(d.baseSalary.value).toEqual({ "@type": "QuantitativeValue", value: 3200, unitText: "MONTH" })
  })
})
