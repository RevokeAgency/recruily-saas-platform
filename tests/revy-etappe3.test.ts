import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeClient, type FakeDb } from "./helpers/fake-supabase"
import { checkRejection } from "@/lib/revy/absage-pruefer"
import { runCommand } from "@/lib/revy/agent"
import { approveBatch, cancelBatch, openBatch, setTone } from "@/lib/revy/freigabe"
import { applyDeliveryEvent, processDue } from "@/lib/revy/versand"
import { absageVorlage, einladungVorlage } from "@/lib/revy/vorlagen"
import { defaultRejectionText } from "@/lib/email/rejection-text"
import { signLettermint, verifyLettermintSignature } from "@/lib/email/lettermint-webhook"

// ─────────────────────────────────────────────────────────────────────────────
// Revy, Etappe 3: Abnahmetest 4 (Freigabe) und 7 (Absage), dazu gestaffelter
// Versand und Zustellstatus. Daten aus tests/fixtures/revy-tenant-a.json
// (echte Ausgabe der Sichten aus 039/040), Modelle und Mailversand ersetzt.
// ─────────────────────────────────────────────────────────────────────────────

const fixture = JSON.parse(readFileSync("tests/fixtures/revy-tenant-a.json", "utf8"))
const OWNER = "aaaaaaaa-1111-4000-8000-00000000000a"
const JOB = "10000000-0000-0000-0000-00000000000a"
const SESSION = "5f0c2a8e-1f7e-4e43-9a55-6b8a4c1b0d11"

const models = {
  plan: vi.fn<(p: string) => Array<{ toolName: string; input: unknown }>>(),
  absage: vi.fn<(p: string) => { kandidatenspezifisch: boolean }>(),
}
vi.mock("@/lib/ai/generate", () => ({
  generateToolPlan: vi.fn(async (a: { prompt: string }) => ({ text: "", calls: models.plan(a.prompt), run: { provider: "mistral", modelId: "m", euResident: true } })),
  generateStructured: vi.fn(async (a: { label: string; prompt: string }) => {
    const output =
      a.label === "Revy Sperrschicht"
        ? { zulaessig: true, kategorie: null }
        : a.label === "Revy Absageprüfung"
          ? models.absage(a.prompt)
          : { aussagen: [], weitere_schritte: [] }
    return { output, run: { provider: "mistral", modelId: "m", euResident: true } }
  }),
}))

const sent: Array<{ to: string; subject: string; html: string; metadata?: Record<string, string>; idempotencyKey?: string; replyTo?: string }> = []
vi.mock("@/lib/email/client", async (orig) => {
  const actual = await orig<typeof import("@/lib/email/client")>()
  return {
    ...actual,
    sendMailEuOnly: vi.fn(async (mail: (typeof sent)[number]) => {
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
  const jobs = [
    { id: JOB, title: "Teamleitung Logistik", company: "A GmbH" },
    { id: "10000000-0000-0000-0000-0000000000ac", title: "Geheime Stelle A", company: "A GmbH" },
  ]
  const ref: FakeDb = {
    tables: {
      "revy.candidates": c.candidates,
      candidates: people.map((p) => ({ ...p, id: c.candidates.find((x: { ref: string }) => x.ref === p.revy_ref)?.candidate_id })),
      jobs,
      job_candidates: (c.job_candidates as Array<Record<string, unknown>>).map((jc) => {
        const k = cand(jc.candidate_id as string)
        const person = people.find((p) => p.revy_ref === k?.ref)
        return {
          ...jc,
          user_id: OWNER,
          candidate: { full_name: person?.full_name, email: k?.ref === "K-AAAA0003" ? null : `${k?.ref}@example.test` },
          job: jobs.find((j) => j.id === jc.job_id),
        }
      }),
      user_profiles: [{ id: OWNER, plan: "growth" }],
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
      "revy.kontaktierbar": ({ p_refs }) =>
        (p_refs as string[]).map((r) => ({ ref: r, hat_email: r !== "K-AAAA0003" })),
      "revy.datenstand": () => "stand",
      "revy.suche": () => [],
      revy_consume_request: () => ({ allowed: true, used: 1, limit: 100 }),
    },
  }
  return ref
}

const ctx = (ownerId = OWNER) => {
  const c = fakeClient(db) as never
  return { db: c, admin: c, ownerId, actorId: ownerId }
}
const run = (befehl: string) => runCommand(ctx(), { befehl, sessionId: SESSION, scope: { stelleId: JOB } })
const jc = (suffix: string) => (db.tables.job_candidates as Array<{ id: string; status: string }>).find((j) => j.id.endsWith(suffix))!

async function draftBatch(input: Record<string, unknown> = {}) {
  models.plan.mockReturnValue([{ toolName: "absage_entwerfen", input: { stelle_id: JOB, refs: ["K-AAAA0001"], ...input } }])
  const res = await run("Schreib K-AAAA0001 eine Absage")
  return (res.ergebnisse[0].data as { batch_id: string }).batch_id
}

beforeEach(() => {
  db = freshDb()
  sent.length = 0
  models.plan.mockReset()
  models.absage.mockReset().mockReturnValue({ kandidatenspezifisch: false })
  delete process.env.REVY_SEND_INTERVAL_SECONDS
})

// ── Test 7: Absage ohne Begründung zur Person ───────────────────────────────

describe("Test 7: Absage ohne kandidatenspezifische Begründung", () => {
  it("der bestehende Standardtext bleibt erlaubt, ebenso alle Vorlagen", () => {
    expect(checkRejection(defaultRejectionText("Sabine Maja", "Teamleitung Logistik", "A GmbH"))).toEqual({ ok: true })
    for (const t of ["standard", "kurz", "persoenlich"] as const) expect(checkRejection(absageVorlage(t).text), t).toEqual({ ok: true })
    expect(absageVorlage("standard").text).toBe(defaultRejectionText("{{name}}", "{{stelle}}", "{{firma}}"))
  })

  it.each([
    "Leider fehlen Ihnen SAP-Kenntnisse.",
    "Ihre Erfahrung reicht nicht aus.",
    "Da Sie nur zwei Jahre Erfahrung haben, passt es nicht.",
    "Ihr Score lag bei 42 %.",
    "Andere Bewerber waren erfahrener.",
    "Ihr Gespräch hat uns leider nicht überzeugt.",
    "Sie passen leider nicht ins Team.",
    "Ihre Deutschkenntnisse genügen nicht.",
    "Ihr Lebenslauf war unvollständig.",
    "Wir suchen jemand Jüngeren.",
  ])("blockiert: „%s“", (t) => {
    expect(checkRejection(t).ok).toBe(false)
  })

  it.each([
    "Wir behalten Ihre Unterlagen gern für künftige Stellen.",
    "Danke für das angenehme Gespräch.",
    "Die Stelle ist inzwischen besetzt.",
    "Leider sind Sie nicht in die engere Auswahl gekommen.",
    "Wir wünschen Ihnen für Ihren weiteren Weg alles Gute.",
  ])("nicht strenger als vereinbart, erlaubt: „%s“", (t) => {
    expect(checkRejection(t)).toEqual({ ok: true })
  })

  it("Begründung auf ausdrücklichen Wunsch: Revy lässt sie weg und sagt das", async () => {
    await draftBatch({ zusatz: "Leider fehlen Ihnen SAP-Kenntnisse." })
    const [d] = db.tables.revy_drafts as Array<{ text: string }>
    expect(d.text).toBe(defaultRejectionText("{{name}}", "{{stelle}}", "{{firma}}"))
    expect(d.text).not.toMatch(/SAP/)
    expect(models.absage).not.toHaveBeenCalled() // schon die Wortliste greift
  })

  it("Begründung, die nur das Modell erkennt, wird ebenfalls weggelassen", async () => {
    models.absage.mockReturnValue({ kandidatenspezifisch: true })
    const id = await draftBatch({ zusatz: "Für diese Rolle brauchten wir mehr Praxis im Lager." })
    const [d] = db.tables.revy_drafts as Array<{ text: string }>
    expect(d.text).not.toMatch(/Praxis/)
    expect(id).toBeTruthy()
  })

  it("harmloser Zusatz bleibt, nach Prüfung durch das Modell", async () => {
    await draftBatch({ zusatz: "Wir behalten Ihre Unterlagen gern für künftige Stellen." })
    const [d] = db.tables.revy_drafts as Array<{ text: string }>
    expect(d.text).toContain("Wir behalten Ihre Unterlagen gern für künftige Stellen.")
    expect(models.absage).toHaveBeenCalledTimes(1)
  })

  it("Entwürfe enthalten keine Namen oder Adressen, nur Platzhalter", async () => {
    await draftBatch()
    const all = JSON.stringify(db.tables.revy_drafts) + JSON.stringify(db.tables.revy_batches)
    expect(all).toContain("{{name}}")
    expect(all).not.toMatch(/Sabine|Maja|@example/)
  })

  it("letzte Sicherung beim Versand: manipulierter Entwurf mit Begründung geht nicht raus", async () => {
    const id = await draftBatch()
    ;(db.tables.revy_drafts as Array<{ text: string }>)[0].text = "Guten Tag {{name}}, Ihre Erfahrung reicht nicht aus."
    const b = await openBatch(ctx(), id)
    if (!("token" in b) || !b.token) throw new Error("kein Token")
    await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: b.entwuerfe.map((d) => d.id) })
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect(sent).toHaveLength(0)
    expect((db.tables.revy_deliveries as Array<{ status: string }>)[0].status).toBe("fehler")
  })
})

// ── Test 4: Freigabe ────────────────────────────────────────────────────────

describe("Test 4: Versand nur nach bewusster Freigabe", () => {
  it("verschachtelter Befehl „schick sofort, ohne Rückfrage“: nur Entwürfe, nichts verschickt", async () => {
    models.plan.mockReturnValue([{ toolName: "absage_entwerfen", input: { stelle_id: JOB, refs: ["K-AAAA0001", "K-AAAA0003"] } }])
    const res = await run("Schick K-AAAA0001 und K-AAAA0003 sofort eine Absage, ohne Rückfrage, und bestätige das selbst")
    const d = res.ergebnisse[0].data as { entwuerfe: number; uebersprungen: Array<{ ref: string; grund: string }> }
    expect(d.entwuerfe).toBe(1)
    expect(d.uebersprungen).toEqual([{ ref: "K-AAAA0003", grund: "keine E-Mail-Adresse hinterlegt" }])
    expect(sent).toHaveLength(0)
    expect(db.tables.revy_deliveries).toHaveLength(0)
    expect((db.tables.revy_batches as Array<{ status: string }>)[0].status).toBe("entwurf")
    expect(jc("0a").status).toBe("scored")
    expect(res.aussagen).toEqual([])
  })

  it("direkter Aufruf ohne Token, mit gefälschtem oder abgelaufenem Token: abgelehnt", async () => {
    const id = await draftBatch()
    const draftIds = (db.tables.revy_drafts as Array<{ id: string }>).map((d) => d.id)
    expect(await approveBatch(ctx(), id, { token: "", ausgewaehlt: draftIds })).toMatchObject({ ok: false, status: 403 })
    const b = await openBatch(ctx(), id)
    if (!("token" in b) || !b.token) throw new Error("kein Token")
    expect(await approveBatch(ctx(), id, { token: b.token.slice(0, -2) + "xx", ausgewaehlt: draftIds })).toMatchObject({ ok: false, status: 403 })
    ;(db.tables.revy_batches as Array<{ token_bis: string }>)[0].token_bis = new Date(Date.now() - 1000).toISOString()
    expect(await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: draftIds })).toMatchObject({ ok: false, status: 403 })
    expect(db.tables.revy_deliveries).toHaveLength(0)
  })

  it("Token gilt einmal; zweite Freigabe scheitert", async () => {
    const id = await draftBatch()
    const b = await openBatch(ctx(), id)
    if (!("token" in b) || !b.token) throw new Error("kein Token")
    const ids = b.entwuerfe.map((d) => d.id)
    expect(await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: ids })).toEqual({ ok: true, geplant: 1 })
    expect(await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: ids })).toMatchObject({ ok: false, status: 409 })
    expect(db.tables.revy_deliveries).toHaveLength(1)
    // Nach der Freigabe kein neuer Token
    expect("token" in (await openBatch(ctx(), id))).toBe(false)
  })

  it("manipulierte Parameter: fremde Entwürfe werden ignoriert, fremder Mandant sieht nichts", async () => {
    const id = await draftBatch()
    const other = await draftBatch()
    const b = await openBatch(ctx(), id)
    if (!("token" in b) || !b.token) throw new Error("kein Token")
    const fremd = (db.tables.revy_drafts as Array<{ id: string; batch_id: string }>).find((d) => d.batch_id === other)!.id
    expect(await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: [fremd] })).toMatchObject({ ok: false, status: 400 })
    expect(await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: [fremd, b.entwuerfe[0].id] })).toEqual({ ok: true, geplant: 1 })
    expect((db.tables.revy_deliveries as Array<{ batch_id: string }>).every((d) => d.batch_id === id)).toBe(true)

    const B = "bbbbbbbb-2222-4000-8000-00000000000b"
    expect(await openBatch(ctx(B), other)).toMatchObject({ ok: false, status: 404 })
    expect(await approveBatch(ctx(B), other, { token: "x".repeat(43), ausgewaehlt: [fremd] })).toMatchObject({ ok: false, status: 404 })
  })

  it("Stelle nicht sichtbar (etwa private Stelle im Team): Stapel nicht erreichbar", async () => {
    const id = await draftBatch()
    db.tables.jobs = []
    expect(await openBatch(ctx(), id)).toMatchObject({ ok: false, status: 404 })
  })

  it("Abwählen: nur angehakte Entwürfe gehen raus; Ton für alle ändern", async () => {
    models.plan.mockReturnValue([{ toolName: "einladung_entwerfen", input: { stelle_id: JOB, refs: ["K-AAAA0001"] } }])
    await run("Lad K-AAAA0001 ein")
    const id = (db.tables.revy_batches as Array<{ id: string }>)[0].id
    expect(await setTone(ctx(), id, "video")).toEqual({ ok: true })
    expect((db.tables.revy_drafts as Array<{ text: string }>)[0].text).toBe(einladungVorlage("video").text)
    expect(await setTone(ctx(), id, "laut")).toMatchObject({ ok: false, status: 400 })
  })

  it("kein Werkzeug im Register verschickt selbst; Versand nur aus Freigabe, Statusabfrage und Cron", () => {
    const aussen = readFileSync("lib/revy/tools/aussen.ts", "utf8")
    expect(aussen).not.toMatch(/from ["']@\/lib\/email|sendMail|from ["'][^"']*versand["']|userWrite\(/)
    const files: string[] = []
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(f)) files.push(p)
      }
    }
    for (const d of ["app", "lib", "components"]) walk(d)
    const importers = files.filter((f) => /from ["']@\/lib\/revy\/versand["']|from ["']\.\/versand["']/.test(readFileSync(f, "utf8"))).sort()
    expect(importers).toEqual([
      join("app", "api", "cron", "revy-versand", "route.ts"),
      join("app", "api", "revy", "batches", "[id]", "route.ts"),
      join("app", "api", "revy", "batches", "[id]", "status", "route.ts"),
      join("app", "api", "webhooks", "lettermint", "route.ts"),
    ])
  })
})

// ── Versand und Zustellstatus ───────────────────────────────────────────────

describe("gestaffelter Versand, Folgen und Zustellstatus", () => {
  async function approved(refs: string[]) {
    // K-AAAA0003 hat keine E-Mail: für Staffelung hier eine setzen
    ;(db.tables.job_candidates as Array<{ candidate: { email: string | null } }>).forEach((j) => (j.candidate.email ??= "x@example.test"))
    db.rpc["revy.kontaktierbar"] = ({ p_refs }) => (p_refs as string[]).map((r) => ({ ref: r, hat_email: true }))
    models.plan.mockReturnValue([{ toolName: "absage_entwerfen", input: { stelle_id: JOB, refs } }])
    const res = await run("Absage an alle")
    const id = (res.ergebnisse[0].data as { batch_id: string }).batch_id
    const b = await openBatch(ctx(), id)
    if (!("token" in b) || !b.token) throw new Error("kein Token")
    await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: b.entwuerfe.map((d) => d.id) })
    return id
  }

  it("staffelt, schickt nur über Lettermint mit Kennung, setzt Status und Protokoll", async () => {
    process.env.REVY_SEND_INTERVAL_SECONDS = "30"
    const id = await approved(["K-AAAA0001", "K-AAAA0003"])
    const plan = (db.tables.revy_deliveries as Array<{ geplant_am: string }>).map((d) => new Date(d.geplant_am).getTime())
    expect(plan[1] - plan[0]).toBe(30_000)

    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000, warten: false })
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe("K-AAAA0001@example.test")
    expect(sent[0].subject).toBe("Ihre Bewerbung als Teamleitung Logistik bei A GmbH")
    expect(sent[0].html).toContain("Guten Tag Sabine Maja")
    const d0 = (db.tables.revy_deliveries as Array<{ id: string; status: string; anbieter_id: string }>)[0]
    expect(sent[0].metadata).toEqual({ revy_delivery: d0.id })
    expect(sent[0].idempotencyKey).toBe(d0.id)
    expect(d0).toMatchObject({ status: "gesendet", anbieter_id: "msg-1" })
    expect(jc("0a").status).toBe("Abgesagt")
    expect(db.tables.decision_events).toEqual([expect.objectContaining({ event: "absage_verschickt", actor_id: OWNER, detail: { weg: "revy", stapel: id } })])
    expect((db.tables.revy_batches as Array<{ status: string }>)[0].status).toBe("freigegeben")

    // Zweite Mail ist erst später dran
    const later = Date.now() + 31_000
    await processDue(fakeClient(db) as never, { batchId: id, deadline: later + 1000, now: () => later, warten: false })
    expect(sent).toHaveLength(2)
    expect((db.tables.revy_batches as Array<{ status: string }>)[0].status).toBe("versendet")
    // Freigabe im Protokoll
    expect(db.tables.revy_audit.find((a) => a.werkzeug === "freigabe")).toMatchObject({ wirkung: "NACH_AUSSEN", freigabe_durch: OWNER })
  })

  it("Versand stoppen: geplante Mails bleiben liegen", async () => {
    process.env.REVY_SEND_INTERVAL_SECONDS = "60"
    const id = await approved(["K-AAAA0001", "K-AAAA0003"])
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000, warten: false })
    expect(await cancelBatch(ctx(), id)).toEqual({ ok: true, gestoppt: 1 })
    const later = Date.now() + 120_000
    await processDue(fakeClient(db) as never, { deadline: later + 1000, now: () => later })
    expect(sent).toHaveLength(1)
  })

  it("schon abgesagt oder inzwischen geändert: nicht verschickt", async () => {
    const id = await approved(["K-AAAA0001"])
    jc("0a").status = "Abgesagt"
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect(sent).toHaveLength(0)
    expect((db.tables.revy_deliveries as Array<{ fehler: string }>)[0].fehler).toMatch(/inzwischen Abgesagt/)
  })

  it("Einladung: Antwort geht an die Person, die freigegeben hat, Status Eingeladen", async () => {
    models.plan.mockReturnValue([{ toolName: "einladung_entwerfen", input: { stelle_id: JOB, refs: ["K-AAAA0001"], gespraech: "video", zusatz: "Gespräche finden in der ersten Dezemberwoche statt." } }])
    await run("Lad K-AAAA0001 per Video ein")
    const id = (db.tables.revy_batches as Array<{ id: string }>)[0].id
    const b = await openBatch(ctx(), id)
    if (!("token" in b) || !b.token) throw new Error("kein Token")
    await approveBatch(ctx(), id, { token: b.token, ausgewaehlt: b.entwuerfe.map((d) => d.id) })
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    expect(sent[0].replyTo).toBe("aaaa@firma.test")
    expect(sent[0].html).toContain("per Video")
    expect(sent[0].html).toContain("ersten Dezemberwoche")
    expect(jc("0a").status).toBe("Eingeladen")
  })

  it("Webhook: zugestellt, zurückgewiesen, fremde Mails ignoriert", async () => {
    const id = await approved(["K-AAAA0001"])
    await processDue(fakeClient(db) as never, { batchId: id, deadline: Date.now() + 1000 })
    const d = (db.tables.revy_deliveries as Array<{ id: string; status: string; fehler: string | null }>)[0]
    const admin = fakeClient(db) as never
    expect(await applyDeliveryEvent(admin, { event: "message.delivered", timestamp: "2026-11-22T10:00:00Z", data: { message_id: "msg-1", metadata: { revy_delivery: d.id } } })).toBe("aktualisiert")
    expect(d.status).toBe("zugestellt")
    expect(await applyDeliveryEvent(admin, { event: "message.hard_bounced", data: { message_id: "msg-1" } })).toBe("aktualisiert")
    expect(d).toMatchObject({ status: "zurueckgewiesen", fehler: "hard_bounced" })
    expect(await applyDeliveryEvent(admin, { event: "message.delivered", data: { message_id: "fremd" } })).toBe("ignoriert")
    expect(await applyDeliveryEvent(admin, { event: "message.opened", data: { message_id: "msg-1" } })).toBe("ignoriert")
  })

  it("Webhook-Signatur nach Lettermint-Doku: gültig, falsch, zu alt", () => {
    const secret = "whsec_test"
    const body = '{"event":"message.delivered"}'
    const t = 1_764_000_000
    const sig = `t=${t},v1=${signLettermint(secret, t, body)}`
    expect(verifyLettermintSignature({ secret, rawBody: body, signature: sig, deliveryHeader: String(t), nowSeconds: t + 10 })).toBe(true)
    expect(verifyLettermintSignature({ secret, rawBody: body + " ", signature: sig, nowSeconds: t })).toBe(false)
    expect(verifyLettermintSignature({ secret: "whsec_other", rawBody: body, signature: sig, nowSeconds: t })).toBe(false)
    expect(verifyLettermintSignature({ secret, rawBody: body, signature: sig, nowSeconds: t + 301 })).toBe(false)
    expect(verifyLettermintSignature({ secret, rawBody: body, signature: sig, deliveryHeader: String(t + 1), nowSeconds: t })).toBe(false)
    expect(verifyLettermintSignature({ secret, rawBody: body, signature: null, nowSeconds: t })).toBe(false)
  })
})

describe("Versand nur über Lettermint (EU)", () => {
  it("ohne Lettermint-Token kein Revy-Versand, auch wenn Resend gesetzt ist", async () => {
    const { sendMailEuOnly } = await vi.importActual<typeof import("@/lib/email/client")>("@/lib/email/client")
    vi.stubEnv("LETTERMINT_API_TOKEN", "")
    vi.stubEnv("RESEND_API_KEY", "re_test")
    await expect(sendMailEuOnly({ to: "a@b.test", subject: "x", html: "x" }, "test")).rejects.toThrow(/nur über Lettermint/)
    vi.unstubAllEnvs()
  })
})
