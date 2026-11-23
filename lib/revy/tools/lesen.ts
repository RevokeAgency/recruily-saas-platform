import { z } from "zod"
import { getMatchUsage } from "@/lib/quota"
import { linkCandidateToJob, scoreLinkInBackground } from "@/lib/matching/link"
import { checkText } from "../policy"
import { ensureDocumentPages } from "../pages"
import {
  APPLICATION_COLS,
  BEGRIFF,
  CANDIDATE_COLS,
  REF,
  STATUS_GRUPPEN,
  STATUS_PARAM,
  candidatesByRefs,
  def,
  describeRefs,
  flattenStrings,
  fold,
  noCost,
  refsParams,
  resolveRefs,
  revy,
  statusLabel,
  type ApplicationRow,
  type CandidateRow,
  type ToolContext,
} from "./base"

// ─────────────────────────────────────────────────────────────────────────────
// Werkzeuge der Wirkungsklasse LESEND (Etappe 1, Suche überarbeitet in
// Etappe 2).
// ─────────────────────────────────────────────────────────────────────────────

/** Kurzprofil für Listen. Nie candidate_id: Das Modell sieht nur Kürzel. */
function brief(c: CandidateRow) {
  return {
    ref: c.ref,
    position: c.position,
    ort: c.ort,
    berufsjahre: years(c),
    stufe: c.stufe,
    skills: (c.skills ?? []).slice(0, 15),
  }
}

/** Berufsjahre aus dem Profil, sonst aus dem Dossier. */
function years(c: CandidateRow): number | null {
  if (c.berufsjahre != null) return c.berufsjahre
  const g = Number((c.dossier as { gesamtjahre?: unknown } | null)?.gesamtjahre)
  return Number.isFinite(g) && g > 0 ? g : null
}

/** Alles, was im bereinigten Profil steht, als ein Suchtext. */
function profileText(c: CandidateRow): string {
  return fold([c.position, ...(c.skills ?? []), c.ausbildung, ...flattenStrings(c.dossier)].join(" "))
}

async function tagsByRef(ctx: ToolContext, refs: string[], stelleId?: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (refs.length === 0) return out
  const { data, error } = await revy(ctx.db).from("tags").select("ref, stelle_id, tag").in("ref", refs)
  if (error) return out // 040 noch nicht eingespielt: ohne Tags weiter
  for (const t of (data ?? []) as Array<{ ref: string; stelle_id: string | null; tag: string }>) {
    if (t.stelle_id && stelleId && t.stelle_id !== stelleId) continue
    out.set(t.ref, [...(out.get(t.ref) ?? []), t.tag])
  }
  return out
}

// ── pool_suchen ─────────────────────────────────────────────────────────────

/** Wörter, die in fast jedem Profil stehen und als Suchbegriff nichts filtern. */
const FUELLWOERTER = new Set(
  ["bewerber", "bewerberin", "bewerberinnen", "kandidat", "kandidaten", "kandidatin", "kandidatinnen", "leute", "person", "personen", "mitarbeiter", "mitarbeiterin", "erfahrung", "berufserfahrung", "jemand", "alle", "pool", "talent", "stelle", "job"].map(fold),
)

const POOL_PARAMS = z.object({
  begriffe: z.array(BEGRIFF).max(10).optional().describe("Suchbegriffe, gern mit Varianten (SAP, SAP EWM, Lagerlogistik). Keine Füllwörter wie Bewerber oder Erfahrung."),
  skills: z.array(BEGRIFF).max(10).optional().describe("Wie begriffe"),
  modus: z.enum(["mindestens_einer", "alle"]).optional().describe("alle nur, wenn der Nutzer ausdrücklich jeden Begriff verlangt"),
  position: BEGRIFF.optional().describe("Teil der Positionsbezeichnung"),
  ort: BEGRIFF.optional().describe("Stadt (Wohnort laut Profil)"),
  min_berufsjahre: z.number().int().min(0).max(50).optional(),
  stelle_id: z.string().uuid().optional().describe("Nur Bewerbungen dieser Stelle"),
  status: STATUS_PARAM.optional().describe("Nur Bewerbungen mit diesem Status, ohne stelle_id über alle Stellen"),
  min_score: z.number().int().min(0).max(100).optional().describe("Score mindestens (Prozent)"),
  max_score: z.number().int().min(0).max(100).optional().describe("Score höchstens (Prozent)"),
  eingang_aelter_als_tage: z.number().int().min(1).max(3650).optional().describe("Bewerbung vor mehr als so vielen Tagen eingegangen"),
  eingang_juenger_als_tage: z.number().int().min(1).max(3650).optional().describe("Bewerbung vor höchstens so vielen Tagen eingegangen"),
  tag: BEGRIFF.optional().describe("Nur Kandidaten mit diesem Tag"),
  nur_talent_pool: z.boolean().optional().describe("Nur wenn der Nutzer den Talent-Pool ausdrücklich nennt"),
  sortierung: z.enum(["relevanz", "score", "berufsjahre", "eingang"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
})
type PoolParams = z.infer<typeof POOL_PARAMS>

/** Filter, die Revy bei null Treffern einzeln lockert, mit Klartext. */
const LOCKERBAR: Array<{ key: keyof PoolParams; text: (p: PoolParams) => string; drop: (p: PoolParams) => PoolParams }> = [
  { key: "nur_talent_pool", text: () => "nur Talent-Pool", drop: (p) => ({ ...p, nur_talent_pool: undefined }) },
  { key: "modus", text: () => "alle Begriffe zugleich", drop: (p) => ({ ...p, modus: undefined }) },
  { key: "min_berufsjahre", text: (p) => `mindestens ${p.min_berufsjahre} Jahre`, drop: (p) => ({ ...p, min_berufsjahre: undefined }) },
  { key: "ort", text: (p) => `Ort ${p.ort}`, drop: (p) => ({ ...p, ort: undefined }) },
  { key: "position", text: (p) => `Position „${p.position}“`, drop: (p) => ({ ...p, position: undefined }) },
  { key: "tag", text: (p) => `Tag „${p.tag}“`, drop: (p) => ({ ...p, tag: undefined }) },
]

const DAY = 86_400_000

async function search(p: PoolParams, ctx: ToolContext) {
  const hinweise: string[] = []
  let apps: ApplicationRow[] = []
  const brauchtBewerbungen = !!(p.stelle_id || p.status || p.min_score != null || p.max_score != null || p.eingang_aelter_als_tage || p.eingang_juenger_als_tage)
  if (brauchtBewerbungen) {
    let q = revy(ctx.db).from("applications").select(APPLICATION_COLS).limit(2000)
    if (p.stelle_id) q = q.eq("stelle_id", p.stelle_id)
    if (p.status) q = q.in("status", [...STATUS_GRUPPEN[p.status]])
    const { data, error } = await q
    if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
    apps = ((data ?? []) as ApplicationRow[]).filter((a) => {
      if (p.min_score != null && (a.score == null || a.score < p.min_score)) return false
      if (p.max_score != null && (a.score == null || a.score > p.max_score)) return false
      const alter = (Date.now() - new Date(a.eingang).getTime()) / DAY
      if (p.eingang_aelter_als_tage && alter <= p.eingang_aelter_als_tage) return false
      if (p.eingang_juenger_als_tage && alter > p.eingang_juenger_als_tage) return false
      return true
    })
  }
  let rows: CandidateRow[]
  if (brauchtBewerbungen) {
    rows = await candidatesByRefs(ctx, [...new Set(apps.map((a) => a.ref))])
  } else {
    const { data, error } = await revy(ctx.db).from("candidates").select(CANDIDATE_COLS).limit(2000)
    if (error) throw new Error(`Kandidaten nicht lesbar: ${error.message}`)
    rows = (data ?? []) as CandidateRow[]
  }

  const tags = await tagsByRef(ctx, rows.map((r) => r.ref), p.stelle_id)
  if (p.tag) rows = rows.filter((c) => (tags.get(c.ref) ?? []).some((t) => fold(t) === fold(p.tag)))

  // Begriffe: keine Füllwörter, nie gesperrte Merkmale
  const raw = [...new Set([...(p.begriffe ?? []), ...(p.skills ?? [])].map((t) => t.trim()))].filter((t) => !FUELLWOERTER.has(fold(t)))
  const terms = raw.filter((t) => !checkText(t))
  if (terms.length < raw.length) hinweise.push("Ein Suchbegriff betraf ein geschütztes Merkmal und wurde nicht verwendet.")

  const imText = new Map<string, string[]>()
  if (terms.length) {
    const { data, error } = await revy(ctx.db).rpc("suche", { p_begriffe: terms })
    if (error) hinweise.push("Die Suche im Text der Unterlagen ist noch nicht eingerichtet (Migration 040). Gesucht wurde nur im Profil.")
    else for (const r of (data ?? []) as Array<{ ref: string; begriffe: string[] }>) imText.set(r.ref, r.begriffe.map(fold))
  }

  const scored = rows
    .filter((c) => !p.nur_talent_pool || c.talent_pool)
    .filter((c) => !p.ort || fold(c.ort).includes(fold(p.ort)))
    .filter((c) => !p.position || fold(c.position).includes(fold(p.position)))
    .filter((c) => {
      if (p.min_berufsjahre == null) return true
      const y = years(c)
      return y == null || y >= p.min_berufsjahre // unbekannt bleibt drin, wird markiert
    })
    .map((c) => {
      const profil = profileText(c)
      const text = imText.get(c.ref) ?? []
      const treffer = terms
        .map((t) => {
          const f = fold(t)
          const inProfil = profil.includes(f)
          const inText = text.some((x) => fold(x) === f)
          return inProfil || inText ? `${t} (${inProfil ? "Profil" : "Unterlagen"})` : null
        })
        .filter((x): x is string => !!x)
      return { c, treffer }
    })
    .filter(({ treffer }) => terms.length === 0 || (p.modus === "alle" ? treffer.length === terms.length : treffer.length > 0))

  return { scored, rows, apps, tags, terms, hinweise }
}

const poolSuchen = def({
  name: "pool_suchen",
  effect: "LESEND",
  description:
    "Sucht Kandidaten. begriffe werden im bereinigten Profil (Position, Skills, Stationen, Ausbildung, Zertifikate) UND im Text von Lebenslauf und Anschreiben gesucht; Treffer werden nach Anzahl gefundener Begriffe sortiert. Filter für Ort, Mindestjahre, Status, Score, Eingang, Tag und Stelle. Mit stelle_id nur die Bewerbungen dieser Stelle. Findet Revy mit allen Filtern nichts, lockert es einzelne Filter und sagt welche. Liefert Kürzel, Kurzprofil, gefundene Begriffe, Score, Status und Tags.",
  params: POOL_PARAMS,
  describe: (p) => {
    const terms = [...(p.begriffe ?? []), ...(p.skills ?? [])]
    const teile = [
      p.stelle_id ? "Bewerbungen der Stelle" : p.status || p.min_score != null || p.max_score != null ? "Bewerbungen aller Stellen" : "Pool",
      terms.length ? `${p.modus === "alle" ? "alle von" : "Begriffe"} ${terms.join(", ")}` : null,
      p.position ? `Position „${p.position}“` : null,
      p.ort ? `Ort ${p.ort}` : null,
      p.min_berufsjahre != null ? `mindestens ${p.min_berufsjahre} Jahre Erfahrung` : null,
      p.status ? `Status ${p.status}` : null,
      p.min_score != null ? `Score ab ${p.min_score} %` : null,
      p.max_score != null ? `Score bis ${p.max_score} %` : null,
      p.eingang_aelter_als_tage ? `eingegangen vor mehr als ${p.eingang_aelter_als_tage} Tagen` : null,
      p.eingang_juenger_als_tage ? `eingegangen in den letzten ${p.eingang_juenger_als_tage} Tagen` : null,
      p.tag ? `Tag „${p.tag}“` : null,
      p.nur_talent_pool ? "nur Talent-Pool" : null,
      p.sortierung ? `sortiert nach ${{ relevanz: "Treffern", score: "Score", berufsjahre: "Berufsjahren", eingang: "Eingang" }[p.sortierung]}` : null,
    ].filter(Boolean)
    return `Durchsuchen: ${teile.join(", ")}`
  },
  cost: noCost,
  async run(p, ctx, schritt) {
    const limit = p.limit ?? 20
    let used: PoolParams = p
    let r = await search(p, ctx)
    const hinweise = [...r.hinweise]

    // Nichts gefunden: Filter einzeln lockern und sagen, welcher gefehlt hat.
    if (r.scored.length === 0) {
      for (const f of LOCKERBAR) {
        if (p[f.key] == null) continue
        const versuch = f.drop(p)
        const r2 = await search(versuch, ctx)
        if (r2.scored.length > 0) {
          hinweise.push(`Mit allen Filtern gab es keinen Treffer. Ohne „${f.text(p)}“ sind es ${r2.scored.length}, die stehen in der Liste.`)
          used = versuch
          r = r2
          break
        }
      }
    }

    const app = (ref: string) => {
      const list = r.apps.filter((a) => a.ref === ref)
      return list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0]
    }
    const sort = used.sortierung ?? (r.terms.length ? "relevanz" : used.stelle_id || used.status || used.max_score != null || used.min_score != null ? "score" : "berufsjahre")
    r.scored.sort((a, b) => {
      const byScore = (app(b.c.ref)?.score ?? -1) - (app(a.c.ref)?.score ?? -1)
      const byYears = (years(b.c) ?? -1) - (years(a.c) ?? -1)
      if (sort === "relevanz") return b.treffer.length - a.treffer.length || byScore || byYears
      if (sort === "score") return byScore || b.treffer.length - a.treffer.length
      if (sort === "eingang") return b.c.eingang.localeCompare(a.c.eingang)
      return byYears || b.treffer.length - a.treffer.length
    })

    const list = r.scored.slice(0, limit).map(({ c, treffer }) => {
      const a = app(c.ref)
      const y = years(c)
      return {
        ...brief(c),
        ...(treffer.length ? { treffer } : {}),
        ...(used.min_berufsjahre != null && y == null ? { berufsjahre_unbekannt: true } : {}),
        ...(a ? { score: a.score, status: statusLabel(a.status), ko: a.ko, stelle_id: a.stelle_id } : {}),
        ...(r.tags.get(c.ref)?.length ? { tags: r.tags.get(c.ref) } : {}),
      }
    })
    const korpus: Record<string, string[]> = {}
    for (const item of list) korpus[item.ref] = flattenStrings(item)
    return {
      schritt,
      werkzeug: "pool_suchen",
      refs: list.map((c) => c.ref),
      data: { gefunden: r.scored.length, durchsucht: r.rows.length, liste: list },
      korpus,
      hinweise,
    }
  },
})

// ── ueberblick ──────────────────────────────────────────────────────────────

const ueberblick = def({
  name: "ueberblick",
  effect: "LESEND",
  description:
    "Zahlen über Stellen und Bewerbungen: je Stelle Bewerbungen nach Status, Durchschnittsscore, neue der letzten 7 Tage und Bewerbungen, die seit mehr als 14 Tagen auf eine Entscheidung warten. Für Fragen wie „Wie viele habe ich eingeladen?“ oder „Was ist offen?“.",
  params: z.object({
    stelle_id: z.string().uuid().optional(),
    nur_aktive: z.boolean().optional().describe("Standard: nur aktive Stellen"),
  }),
  describe: (p) => `Überblick ${p.stelle_id ? "über die Stelle" : "über alle Stellen"}`,
  cost: noCost,
  async run(p, ctx, schritt) {
    let jq = revy(ctx.db).from("jobs").select("stelle_id, titel, ort, aktiv").limit(200)
    if (p.stelle_id) jq = jq.eq("stelle_id", p.stelle_id)
    const { data: jobs, error: jErr } = await jq
    if (jErr) throw new Error(`Stellen nicht lesbar: ${jErr.message}`)
    const stellen = ((jobs ?? []) as Array<{ stelle_id: string; titel: string; ort: string | null; aktiv: boolean }>).filter(
      (j) => p.stelle_id || p.nur_aktive === false || j.aktiv,
    )
    const ids = stellen.map((j) => j.stelle_id)
    const { data: apps, error } = ids.length
      ? await revy(ctx.db).from("applications").select("bewerbung_id, stelle_id, ref, status, score, eingang").in("stelle_id", ids).limit(5000)
      : { data: [], error: null }
    if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
    const rows = (apps ?? []) as Array<{ stelle_id: string; ref: string; status: string; score: number | null; eingang: string }>
    const jetzt = Date.now()
    const OFFEN = new Set(["new", "scored", "shortlisted"])

    const proStelle = stellen.map((j) => {
      const a = rows.filter((r) => r.stelle_id === j.stelle_id)
      const status: Record<string, number> = {}
      for (const r of a) status[statusLabel(r.status)] = (status[statusLabel(r.status)] ?? 0) + 1
      const scores = a.map((r) => r.score).filter((x): x is number => x != null)
      return {
        stelle_id: j.stelle_id,
        titel: j.titel,
        aktiv: j.aktiv,
        bewerbungen: a.length,
        status,
        durchschnitt_score: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null,
        neu_7_tage: a.filter((r) => jetzt - new Date(r.eingang).getTime() <= 7 * DAY).length,
        wartet_ueber_14_tage: a.filter((r) => OFFEN.has(r.status) && jetzt - new Date(r.eingang).getTime() > 14 * DAY).length,
      }
    })
    const summe = (k: "bewerbungen" | "neu_7_tage" | "wartet_ueber_14_tage") => proStelle.reduce((x, s) => x + s[k], 0)
    const statusGesamt: Record<string, number> = {}
    for (const s of proStelle) for (const [k, v] of Object.entries(s.status)) statusGesamt[k] = (statusGesamt[k] ?? 0) + v
    const data = {
      stellen: proStelle.length,
      bewerbungen: summe("bewerbungen"),
      status: statusGesamt,
      neu_7_tage: summe("neu_7_tage"),
      wartet_ueber_14_tage: summe("wartet_ueber_14_tage"),
      pro_stelle: proStelle,
    }
    const korpus: Record<string, string[]> = {}
    for (const s of proStelle) korpus[`stelle:${s.stelle_id}`] = flattenStrings(s)
    return { schritt, werkzeug: "ueberblick", refs: [], data, korpus }
  },
})

// ── stelle_details ──────────────────────────────────────────────────────────

const stelleDetails = def({
  name: "stelle_details",
  effect: "LESEND",
  description: "Anforderungen einer Stelle: Titel, Ort, Muss- und Kann-Skills, Erfahrung, Ausbildung, Sprachen, K.O.-Kriterien, Beschreibung.",
  params: z.object({ stelle_id: z.string().uuid() }),
  describe: () => "Anforderungen der Stelle lesen",
  cost: noCost,
  async run(p, ctx, schritt) {
    const { data, error } = await revy(ctx.db)
      .from("jobs")
      .select("stelle_id, titel, ort, anstellung, muss_skills, kann_skills, erfahrung, ausbildung, sprachen, ko_kriterien, beschreibung, aktiv")
      .eq("stelle_id", p.stelle_id)
      .maybeSingle()
    if (error) throw new Error(`Stelle nicht lesbar: ${error.message}`)
    const stelle = data ? { ...data, beschreibung: String(data.beschreibung ?? "").slice(0, 4000) } : null
    return {
      schritt,
      werkzeug: "stelle_details",
      refs: [],
      data: stelle ?? { hinweis: "Stelle nicht gefunden oder nicht sichtbar" },
      korpus: stelle ? { [`stelle:${p.stelle_id}`]: flattenStrings(stelle) } : {},
    }
  },
})

// ── kandidat_details ────────────────────────────────────────────────────────

const kandidatDetails = def({
  name: "kandidat_details",
  effect: "LESEND",
  description:
    "Profil von Kandidaten: Stationen, Skills mit Beleg, Sprachen, Abschlüsse, Zertifikate, Führung, Tags. Mit stelle_id zusätzlich Score, Status, Kategorien und Belege aus dem Matching für diese Stelle, sonst für alle Stellen.",
  params: z.object({ ...refsParams, stelle_id: z.string().uuid().optional() }),
  describe: (p) => `Profile lesen (${describeRefs(p)})${p.stelle_id ? " mit Matching zur Stelle" : ""}`,
  cost: noCost,
  async run(p, ctx, schritt) {
    const refs = resolveRefs(p, ctx)
    const rows = await candidatesByRefs(ctx, refs)
    let apps: ApplicationRow[] = []
    if (rows.length) {
      let q = revy(ctx.db).from("applications").select(APPLICATION_COLS).in("ref", rows.map((r) => r.ref))
      if (p.stelle_id) q = q.eq("stelle_id", p.stelle_id)
      const { data, error } = await q
      if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
      apps = (data ?? []) as ApplicationRow[]
    }
    const tags = await tagsByRef(ctx, rows.map((r) => r.ref))
    const profiles = rows.map((c) => ({
      ...brief(c),
      ausbildung: c.ausbildung,
      dossier: c.dossier,
      ...(tags.get(c.ref)?.length ? { tags: tags.get(c.ref) } : {}),
      bewerbungen: apps
        .filter((a) => a.ref === c.ref)
        .map((a) => ({
          stelle_id: a.stelle_id,
          status: statusLabel(a.status),
          score: a.score,
          ko: a.ko,
          kategorien: a.kategorien,
          belege_matching: a.detail,
        })),
    }))
    const korpus: Record<string, string[]> = {}
    for (const pr of profiles) korpus[pr.ref] = flattenStrings(pr)
    return {
      schritt,
      werkzeug: "kandidat_details",
      refs: profiles.map((x) => x.ref),
      data: profiles.length ? profiles : { hinweis: "Keine sichtbaren Kandidaten zu diesen Kürzeln" },
      korpus,
      bewerbertext: profiles.flatMap((x) => flattenStrings(x.dossier)),
    }
  },
})

// ── belege_suchen ───────────────────────────────────────────────────────────

const belegeSuchen = def({
  name: "belege_suchen",
  effect: "LESEND",
  description:
    "Sucht in Lebenslauf und Anschreiben von Kandidaten nach Begriffen und liefert Ausschnitte mit Seite. Name, Kontaktdaten und gesperrte Merkmale sind geschwärzt.",
  params: z.object({ ...refsParams, begriffe: z.array(BEGRIFF).min(1).max(8) }),
  describe: (p) => `Unterlagen nach ${p.begriffe.map((b) => `„${b}“`).join(", ")} durchsuchen (${describeRefs(p)})`,
  cost: noCost,
  async run(p, ctx, schritt) {
    const refs = resolveRefs(p, ctx)
    const rows = await candidatesByRefs(ctx, refs)
    const out: Array<{ ref: string; dokument: string; seite: number; ausschnitt: string }> = []
    const korpus: Record<string, string[]> = {}
    for (const c of rows) {
      await ensureDocumentPages(ctx.db, ctx.admin, c.candidate_id)
      const { data, error } = await revy(ctx.db).rpc("belege", { p_ref: c.ref, p_begriffe: p.begriffe })
      if (error) throw new Error(`Belege nicht lesbar: ${error.message}`)
      for (const b of (data ?? []) as Array<{ dokument: string; seite: number; ausschnitt: string }>) {
        out.push({ ref: c.ref, ...b })
        ;(korpus[c.ref] ??= []).push(b.ausschnitt)
      }
    }
    return {
      schritt,
      werkzeug: "belege_suchen",
      refs: rows.map((c) => c.ref),
      data: out.length ? out : { hinweis: "Keine Stelle in den Unterlagen gefunden" },
      korpus,
      bewerbertext: out.map((b) => b.ausschnitt),
    }
  },
})

// ── gegen_stelle_matchen ────────────────────────────────────────────────────

const gegenStelleMatchen = def({
  name: "gegen_stelle_matchen",
  effect: "LESEND",
  description:
    "Startet das Matching von Kandidaten gegen eine Stelle. Verbraucht je Kandidat ein Match aus dem Kontingent; vorher fragt Revetly den Nutzer. Bereits verknüpfte Kandidaten werden übersprungen. Das Ergebnis erscheint in der Stelle, sobald das Matching fertig ist.",
  params: z.object({
    stelle_id: z.string().uuid(),
    ...refsParams,
    refs: z.array(REF).min(1).max(50).optional(),
    anzahl: z.number().int().min(1).max(50).optional(),
  }),
  describe: (p) => `Gegen die Stelle matchen (${describeRefs(p)})`,
  async cost(p, ctx) {
    return (await pendingCandidates(p, ctx)).length
  },
  async run(p, ctx, schritt) {
    const pending = await pendingCandidates(p, ctx)
    const gestartet: string[] = []
    const uebersprungen: Array<{ ref: string; grund: string }> = []
    for (const c of pending) {
      const r = await linkCandidateToJob(ctx.db, { ownerId: ctx.ownerId, jobId: p.stelle_id, candidateId: c.candidate_id })
      if (r.ok) {
        scoreLinkInBackground(r.linkId)
        gestartet.push(c.ref)
      } else {
        const grund = r.body.error === "match_limit_reached" ? "Match-Kontingent erreicht" : String(r.body.error ?? "nicht möglich")
        uebersprungen.push({ ref: c.ref, grund })
        if (r.body.error === "match_limit_reached") break
      }
    }
    const data = { gestartet: gestartet.length, uebersprungen, hinweis: "Die Scores erscheinen in der Stelle, sobald das Matching fertig ist." }
    return { schritt, werkzeug: "gegen_stelle_matchen", refs: gestartet, data, korpus: {} }
  },
})

/** Kandidaten, die noch nicht mit der Stelle verknüpft sind. */
async function pendingCandidates(
  p: { stelle_id: string; refs?: string[]; refs_aus_schritt?: number; anzahl?: number },
  ctx: ToolContext,
): Promise<CandidateRow[]> {
  const refs = resolveRefs(p, ctx)
  const rows = await candidatesByRefs(ctx, refs)
  if (rows.length === 0) return []
  const { data } = await revy(ctx.db).from("applications").select("ref").eq("stelle_id", p.stelle_id).in("ref", rows.map((r) => r.ref))
  const linked = new Set(((data ?? []) as Array<{ ref: string }>).map((a) => a.ref))
  return rows.filter((r) => !linked.has(r.ref))
}

/** Freie Matches im Kontingent, für den Abrechnungsdialog. */
export async function remainingMatches(ctx: ToolContext): Promise<number | null> {
  const usage = await getMatchUsage(ctx.db, ctx.ownerId)
  return usage ? usage.remaining : null
}

export const LESEN = {
  ueberblick,
  pool_suchen: poolSuchen,
  stelle_details: stelleDetails,
  kandidat_details: kandidatDetails,
  belege_suchen: belegeSuchen,
  gegen_stelle_matchen: gegenStelleMatchen,
}
