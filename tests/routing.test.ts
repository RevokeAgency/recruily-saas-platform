import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  RESERVED_SUBDOMAINS,
  addressLocalPart,
  buildJobEmailAddress,
  matchJobByKey,
  parseInboundRecipient,
} from "@/lib/email/routing"

const JOB_ID = "4f2a9c00-0000-4000-8000-000000000001"

describe("Bewerbungsadresse bauen", () => {
  it("nutzt den Kurznamen der Stelle, ohne (m/w/d) und ohne Pluszeichen", () => {
    expect(buildJobEmailAddress("autohaus-berger", "kfz-mechatroniker-in-m-w-d", JOB_ID)).toBe("kfz-mechatroniker-in@autohaus-berger.revetly.ai")
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
    expect(buildJobEmailAddress("autohaus-berger", null, JOB_ID, "Kfz-Mechatroniker")).toBe(`kfz-mechatroniker+${JOB_ID}@autohaus-berger.revetly.ai`)
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

describe("Reservierte Subdomains", () => {
  it("stimmen in App und Migration überein", () => {
    const sql = readFileSync("scripts/034_inbound_addresses.sql", "utf8")
    const block = sql.slice(sql.indexOf("any (array["), sql.indexOf("]);", sql.indexOf("any (array[")))
    const inSql = [...block.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).sort()
    expect(inSql).toEqual([...RESERVED_SUBDOMAINS].sort())
  })
})
