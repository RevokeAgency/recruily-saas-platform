import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeClient, type FakeDb } from "./helpers/fake-supabase"
import { runCommand } from "@/lib/revy/agent"
import { approveBatch, openBatch, setTone } from "@/lib/revy/freigabe"
import { describeWeeklyHours } from "@/lib/revy/termine"
import { processDue } from "@/lib/revy/versand"
import { renderDraft, terminVorlage } from "@/lib/revy/vorlagen"
import { hashBookingToken } from "@/lib/scheduling/crypto"

// ─────────────────────────────────────────────────────────────────────────────
// Revy, Etappe 4: Terminvorschläge mit Buchungslink und Anzeige der eigenen
// Zeiten. Gleiche Grundlage wie tests/revy-etappe3.test.ts: echte Ausgabe der
// Sichten aus 039/040, Modelle und Mailversand ersetzt.
// ─────────────────────────────────────────────────────────────────────────────

const fixture = JSON.parse(readFileSync("tests/fixtures/revy-tenant-a.json", "utf8"))
const OWNER = "aaaaaaaa-1111-4000-8000-00000000000a"
const KOLLEGIN = "cccccccc-3333-4000-8000-00000000000c"
const JOB = "10000000-0000-0000-0000-00000000000a"
const SESSION = "5f0c2a8e-1f7e-4e43-9a55-6b8a4c1b0d11"
const ERST = "e0000000-0000-4000-8000-000000000001"
const ZWEIT = "e0000000-0000-4000-8000-000000000002"

const models = { plan: vi.fn<(p: string) => Array<{ toolName: string; input: unknown }>>() }
vi.mock("@/lib/ai/generate", () => ({
  generateToolPlan: vi.fn(async (a: { prompt: string }) => ({ text: "", calls: models.plan(a.prompt), run: { provider: "mistral", modelId: "m", euResident: true } })),
  generateStructured: vi.fn(async (a: { label: string }) => ({
    output: a.label === "Revy Sperrschicht" ? { zulaessig: true, kategorie: null } : a.label === "Revy Absageprüfung" ? { kandidatenspezifisch: false } : { aussagen: [], weitere_schritte: [] },
    run: { provider: "mistral", modelId: "m", euResident: true },
  })),
}))

const sent: Array<{ to: string; subject: string; html: string; metadata?: Record<string, string>; replyTo?: string }> = []
const mailFehler = { an: false }
vi.mock("@/lib/email/client", async (orig) => {
  const actual = await orig<typeof import("@/lib/email/client")>()
  return {
    ...actual,
    sendMailEuOnly: vi.fn(async (mail: (typeof sent)[number]) => {
      if (mailFehler.an) throw new Error("Lettermint nicht erreichbar")
      sent.push(mail)
      return `msg-${sent.length}`
    }),
  }
})
vi.mock("@/lib/matching/link", () => ({ linkCandidateToJob: vi.fn(), scoreLinkInBackground: vi.fn() }))
vi.mock("@/lib/plans", async (orig) => {
  const actual = await orig<typeof import("@/lib/plans")>()
  return { ...actual, REVY_REQUESTS_PER_MONTH: { ...actual.REVY_REQUESTS_PER_MONTH, growth: 100 } }
})

let db: FakeDb

function freshDb(): FakeDb {
  const c = JSON.parse(JSON.stringify(fixture))
  const people = c.people as Array<{ full_name: string; revy_ref: string }>
  const cand = (id: string) => c.candidates.find((x: { candidate_id: string }) => x.candidate_id === id)
  const jobs = [{ id: JOB, title: "Teamleitung Logistik", company: "A GmbH" }]
  const ref: FakeDb = {
    tables: {
      "revy.candidates": c.candidates,
      candidates: people.map((p) => ({ ...p, id: c.candidates.find((x: { ref: string }) => x.ref === p.revy_ref)?.candidate_id })),
      jobs,
      job_candidates: (c.job_candidates as Array<Record<string, unknown>>).map((jc) => {
        const k = cand(jc.candidate_id as string)
        const person = people.find((p) => p.revy_ref === k?.ref)
        return { ...jc, user_id: OWNER, candidate: { full_name: person?.full_name, email: `${k?.ref}@example.test` }, job: jobs.find((j) => j.id === jc.job_id) }
      }),
      user_profiles: [{ id: OWNER, plan: "growth" }],
      scheduling_profiles: [
        {
          user_id: OWNER,
          timezone: "Europe/Vienna",
          weekly_hours: { mon: [{ start: "09:00", end: "12:00" }], tue: [{ start: "09:00", end: "12:00" }], wed: [{ start: "14:00", end: "16:00" }] },
          min_notice_minutes: 0,
          max_days_ahead: 30,
          buffer_before_minutes: 0,
          buffer_after_minutes: 0,
          slot_interval_minutes: 30,
          max_per_day: 6,
        },
      ],
      meeting_types: [
        { id: ERST, user_id: OWNER, name: "Erstgespräch", duration_minutes: 30, location_kind: "video_auto", is_default: true, active: true, created_at: "2026-01-01" },
        { id: ZWEIT, user_id: OWNER, name: "Zweitgespräch vor Ort", duration_minutes: 60, location_kind: "onsite", is_default: false, active: true, created_at: "2026-01-02" },
      ],
      calendar_accounts: [],
      bookings: [],
      booking_invites: [],
      revy_runs: [],
      revy_audit: [],
      revy_blocked_requests: [],
      revy_incidents: [],
      revy_cache: [],
      revy_actions: [],
      revy_batches: [],
      revy_drafts: [],
      revy_deliveries: [],
      decision_events: [],
    },
    defaults: {
      revy_batches: { status: "entwurf", ton: "standard" },
      revy_drafts: { ausgewaehlt: true },
      revy_deliveries: { status: "geplant" },
      booking_invites: { status: "open" },
    },
    views: {
      "revy.applications": () =>
        c.applications.map((a: { bewerbung_id: string }) => ({
          ...a,
          status: (ref.tables.job_candidates as Array<{ id: string; status: string }>).find((j) => j.id === a.bewerbung_id)?.status,
        })),
      "revy.tags": () => [],
    },
    rpc: {
      "revy.kontaktierbar": ({ p_refs }) => (p_refs as string[]).map((r) => ({ ref: r, hat_email: true })),
      "revy.datenstand": () => "stand",
      "revy.suche": () => [],
      revy_consume_request: () => ({ allowed: true, used: 1, limit: 100 }),
    },
  }
  return ref
}

const ctx = (actorId = OWNER) => {
  const c = fakeClient(db) as never
  return { db: c, admin: c, ownerId: OWNER, actorId }
}
const run = (befehl: string, actorId = OWNER) => runCommand(ctx(actorId), { befehl, sessionId: SESSION, scope: { stelleId: JOB } })
const jc = (suffix: string) => (db.tables.job_candidates as Array<{ id: string; status: string }>).find((j) => j.id.endsWith(suffix))!
const invites = () => db.tables.booking_invites as Array<{ id: string; user_id: string; status: string; token_hash: string; job_candidate_id: string; meeting_type_id: string; personal_note: string | null }>

async function vorschlag(input: Record<string, unknown> = {}, actorId = OWNER) {
  models.plan.mockReturnValue([{ toolName: "termin_vorschlagen", input: { stelle_id: JOB, refs: ["K-AAAA0001"], ...input } }])
  return run("Schick K-AAAA0001 einen Terminvorschlag", actorId)
}

async function freigeben(id: string, actorId = OWNER) {
  const b = await openBatch(ctx(actorId), id)
  if (!("token" in b) || !b.token) throw new Error("kein Token")
  return approveBatch(ctx(actorId), id, { token: b.token, ausgewaehlt: b.entwuerfe.map((d) => d.id) })
}

beforeEach(() => {
  db = freshDb()
  sent.length = 0
  mailFehler.an = false
  models.plan.mockReset()
})

describe("Terminvorschlag als Entwurf", () => {
  it("legt nur einen Entwurf an: Terminart im Text, Platzhalter statt Link und Namen, nichts verschickt", async () => {
    const res = await vorschlag()
    const d = res.ergebnisse[0].data as { art: string; entwuerfe: number; batch_id: string }
    expect(d).toMatchObject({ art: "termin", entwuerfe: 1 })
    const [batch] = db.tables.revy_batches as Array<{ art: string; meeting_type_id: string; status: string }>
    expect(batch).toMatchObject({ art: "termin", meeting_type_id: ERST, status: "entwurf" })
    const [draft] = db.tables.revy_drafts as Array<{ text: string; betreff: string }>
    expect(draft.text).toContain("Erstgespräch, 30 Minuten, per Video")
    expect(draft.text).toContain("{{link}}")
    expect(draft.text).toContain("{{gueltig_bis}}")
    expect(JSON.stringify(db.tables.revy_drafts)).not.toMatch(/Sabine|Maja|@example|\/termin\//)
    expect(sent).toHaveLength(0)
    expect(invites()).toHaveLength(0)
    expect(res.plan[0]).toMatchObject({ wirkung: "NACH_AUSSEN" })
  })

  it("Terminart aus dem Befehl; unbekannte Terminart: Standard und ein Hinweis", async () => {
    await vorschlag({ terminart: "Zweitgespräch" })
    expect((db.tables.revy_batches as Array<{ meeting_type_id: string }>)[0].meeting_type_id).toBe(ZWEIT)
    expect((db.tables.revy_drafts as Array<{ text: string }>)[0].text).toContain("Zweitgespräch vor Ort, 60 Minuten, vor Ort")

    db = freshDb()
    const res = await vorschlag({ terminart: "Kaffeeplausch" })
    expect((db.tables.revy_batches as Array<{ meeting_type_id: string }>)[0].meeting_type_id).toBe(ERST)
    expect(res.hinweise.join(" ")).toMatch(/„Kaffeeplausch“ gibt es nicht/)
  })

  it("ohne Terminart: Standard-Terminart, Hinweis, beim Versand angelegt", async () => {
    db.tables.meeting_types = []
    const res = await vorschlag()
    expect((db.tables.revy_batches as Array<{ meeting_type_id: string | null }>)[0].meeting_type_id).toBeNull()
    expect(res.hinweise.join(" ")).toMatch(/noch keine Terminart/)
    await freigeben((res.ergebnisse[0].data as { batch_id: string }).batch_id)
    await processDue(fakeClient(db) as never, { deadline: Date.now() + 1000 })
    expect(sent).toHaveLength(1)
    expect(db.tables.meeting_types).toEqual([expect.objectContaining({ user_id: OWNER, name: "Erstgespräch", duration_minutes: 30 })])
  })

  it("Ton gibt es nicht: Dauer und Ort kommen aus der Terminart", async () => {
    const res = await vorschlag()
    const id = (res.ergebnisse[0].data as { batch_id: string }).batch_id
    expect(await setTone(ctx(), id, "video")).toMatchObject({ ok: false, status: 400 })
  })

  it("abgesagte Bewerbung bekommt keinen Vorschlag, eingeladene schon", async () => {
    jc("0a").status = "Abgesagt"
    let d = (await vorschlag()).ergebnisse[0].data as { entwuerfe: number; uebersprungen: Array<{ grund: string }> }
    expect(d.entwuerfe).toBe(0)
    expect(d.uebersprungen[0].grund).toMatch(/Abgesagt/)
    db = freshDb()
    jc("0a").status = "Eingeladen"
    d = (await vorschlag()).ergebnisse[0].data as { entwuerfe: number; uebersprungen: Array<{ grund: string }> }
    expect(d.entwuerfe).toBe(1)
  })
})

describe("Freigabe und Versand mit Buchungslink", () => {
  it("Link entsteht erst beim Versand, nur als Hash gespeichert, Kalender der freigebenden Person", async () => {
    // Älterer offener Link zur selben Bewerbung
    invites().push({ id: "alt", user_id: OWNER, status: "open", token_hash: "x", job_candidate_id: jc("0a").id, meeting_type_id: ERST, personal_note: null })
    const res = await vorschlag({ zusatz: "Wir freuen uns auf das Gespräch." })
    const id = (res.ergebnisse[0].data as { batch_id: string }).batch_id
    expect(await freigeben(id)).toEqual({ ok: true, geplant: 1 })
    expect(invites().filter((i) => i.id !== "alt")).toHaveLength(0) // Freigabe allein legt keinen Link an

    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect(sent).toHaveLength(1)
    const neu = invites().find((i) => i.id !== "alt")!
    expect(neu).toMatchObject({ user_id: OWNER, status: "open", meeting_type_id: ERST, job_candidate_id: jc("0a").id, personal_note: "Wir freuen uns auf das Gespräch." })

    const url = sent[0].html.match(/href="([^"]+\/termin\/([A-Za-z0-9_-]+))"/)
    expect(url).not.toBeNull()
    expect(hashBookingToken(url![2])).toBe(neu.token_hash)
    // Klartext-Token nur in der Mail, nirgends in der Datenbank
    const token = url![2]
    for (const [name, rows] of Object.entries(db.tables)) expect(JSON.stringify(rows), name).not.toContain(token)

    expect(sent[0].subject).toBe("Terminvorschlag: Teamleitung Logistik bei A GmbH")
    expect(sent[0].html).toContain("Guten Tag Sabine Maja")
    expect(sent[0].html).toContain("Termin auswählen")
    expect(sent[0].html).toMatch(/Der Link gilt bis \S+/)
    expect(sent[0].html).not.toContain("{{")
    expect(sent[0].replyTo).toBe("aaaa@firma.test")

    const [d] = db.tables.revy_deliveries as Array<{ status: string; booking_invite_id: string }>
    expect(d).toMatchObject({ status: "gesendet", booking_invite_id: neu.id })
    expect(jc("0a").status).toBe("Eingeladen")
    expect(invites().find((i) => i.id === "alt")!.status).toBe("revoked")
  })

  it("Versand scheitert: neuer Link zurückgezogen, alter bleibt gültig", async () => {
    invites().push({ id: "alt", user_id: OWNER, status: "open", token_hash: "x", job_candidate_id: jc("0a").id, meeting_type_id: ERST, personal_note: null })
    const id = ((await vorschlag()).ergebnisse[0].data as { batch_id: string }).batch_id
    await freigeben(id)
    mailFehler.an = true
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect((db.tables.revy_deliveries as Array<{ status: string }>)[0].status).toBe("fehler")
    expect(invites().find((i) => i.id !== "alt")!.status).toBe("revoked")
    expect(invites().find((i) => i.id === "alt")!.status).toBe("open")
    expect(jc("0a").status).not.toBe("Eingeladen")
  })

  it("Kollegin sieht den Vorschlag, kann ihn aber nicht freigeben (fremder Kalender)", async () => {
    const id = ((await vorschlag()).ergebnisse[0].data as { batch_id: string }).batch_id
    const b = await openBatch(ctx(KOLLEGIN), id)
    expect(b).toMatchObject({ art: "termin", termin: { name: "Erstgespräch", dauer: 30, eigener_kalender: false } })
    expect("token" in b).toBe(false)
    expect(await approveBatch(ctx(KOLLEGIN), id, { token: "x".repeat(43), ausgewaehlt: [] })).toMatchObject({ ok: false, status: 403 })
    expect(await openBatch(ctx(), id)).toMatchObject({ termin: { eigener_kalender: true } })
  })

  it("Plan ohne Terminbuchung beim Versand: nicht verschickt, kein Link", async () => {
    const id = ((await vorschlag()).ergebnisse[0].data as { batch_id: string }).batch_id
    await freigeben(id)
    ;(db.tables.user_profiles as Array<{ plan: string }>)[0].plan = "free"
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect(sent).toHaveLength(0)
    expect(invites()).toHaveLength(0)
    expect((db.tables.revy_deliveries as Array<{ fehler: string }>)[0].fehler).toMatch(/nicht enthalten/)
  })

  it("manipulierter Entwurf ohne Platzhalter für den Link: nicht verschickt", async () => {
    const id = ((await vorschlag()).ergebnisse[0].data as { batch_id: string }).batch_id
    ;(db.tables.revy_drafts as Array<{ text: string }>)[0].text = "Guten Tag {{name}}, melden Sie sich."
    await freigeben(id)
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect(sent).toHaveLength(0)
    expect(invites()).toHaveLength(0)
  })
})

describe("eigene Zeiten zeigen", () => {
  it("Wochenzeiten, Terminarten und freie Termine; Zusammenfassung ohne Modell, nicht im Cache", async () => {
    models.plan.mockReturnValue([{ toolName: "verfuegbarkeit_zeigen", input: {} }])
    const res = await run("Wann habe ich nächste Woche Zeit?")
    const d = res.ergebnisse[0].data as { wochenzeiten: string[]; terminarten: unknown[]; frei: { gesamt: number; naechste: string[] }; einstellungen: string }
    expect(d.wochenzeiten).toEqual(["Mo bis Di 09:00 bis 12:00", "Mi 14:00 bis 16:00"])
    expect(d.terminarten).toHaveLength(2)
    expect(d.frei.gesamt).toBeGreaterThan(0)
    expect(d.frei.naechste[0]).toMatch(/^(Mo|Di|Mi)\., \d{2}\.\d{2}\., \d{2}:\d{2} Uhr$/)
    expect(d.einstellungen).toBe("/termine")
    expect(res.aussagen[0]).toMatchObject({ art: "zusammenfassung" })
    expect(res.aussagen[0].text).toMatch(/^Deine Zeiten: Mo bis Di 09:00 bis 12:00, Mi 14:00 bis 16:00\. Freie Termine für Erstgespräch \(30 Minuten\)/)
    expect(db.tables.revy_cache).toHaveLength(0)
  })

  it("belegte Termine zählen nicht als frei", async () => {
    models.plan.mockReturnValue([{ toolName: "verfuegbarkeit_zeigen", input: { tage: 7 } }])
    const vorher = ((await run("Freie Termine?")).ergebnisse[0].data as { frei: { gesamt: number } }).frei.gesamt
    const start = new Date(Date.now() + 86_400_000)
    db.tables.bookings.push({ id: "b1", user_id: OWNER, status: "confirmed", starts_at: new Date(start.getTime() - 30 * 86_400_000).toISOString(), ends_at: new Date(start.getTime() + 30 * 86_400_000).toISOString() })
    const nachher = ((await run("Freie Termine?")).ergebnisse[0].data as { frei: { gesamt: number } }).frei.gesamt
    expect(vorher).toBeGreaterThan(0)
    expect(nachher).toBe(0)
  })

  it("ohne gespeicherte Zeiten: Hinweis auf Termine", async () => {
    db.tables.scheduling_profiles = []
    models.plan.mockReturnValue([{ toolName: "verfuegbarkeit_zeigen", input: {} }])
    const res = await run("Wie sind meine Termine eingestellt?")
    expect(res.hinweise.join(" ")).toMatch(/noch nicht gespeichert.*unter Termine/)
  })

  it("Wochenzeiten in Worten, gleiche Tage zusammengefasst", () => {
    const b = [{ start: "09:00", end: "17:00" }]
    expect(describeWeeklyHours({ mon: b, tue: b, wed: b, thu: b, fri: b })).toEqual(["Mo bis Fr 09:00 bis 17:00"])
    expect(describeWeeklyHours({ mon: b, wed: b })).toEqual(["Mo 09:00 bis 17:00", "Mi 09:00 bis 17:00"])
    expect(describeWeeklyHours({})).toEqual([])
  })
})

describe("Vorlage", () => {
  it("Namen können keine Platzhalter einschleusen", () => {
    const v = terminVorlage({ name: "Erstgespräch", dauer: 30, ort: "per Video" })
    const out = renderDraft(v.text, { name: "{{link}}", stelle: "Lager", firma: "A GmbH" })
    expect(out.match(/\{\{link\}\}/g)).toHaveLength(1)
    expect(out).toContain("Guten Tag link,")
  })

  it("hält die Textregeln ein: kein Gedankenstrich, kein Ausrufezeichen", () => {
    const v = terminVorlage({ name: "Erstgespräch", dauer: 30, ort: "per Video" }, "Wir freuen uns.")
    expect(v.text + v.betreff).not.toMatch(/[–—!]/)
  })
})
