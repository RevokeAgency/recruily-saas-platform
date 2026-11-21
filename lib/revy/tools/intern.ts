import { z } from "zod"
import { checkText } from "../policy"
import {
  APPLICATION_COLS,
  BEGRIFF,
  REF,
  candidatesByRefs,
  def,
  describeRefs,
  noCost,
  refsUpperBound,
  resolveRefs,
  revy,
  statusLabel,
  userWrite,
  type ApplicationRow,
  type StepResult,
  type ToolContext,
} from "./base"

// ─────────────────────────────────────────────────────────────────────────────
// Werkzeuge der Wirkungsklasse INTERN (Etappe 2). Sie ändern nur Daten in
// Revetly, nichts geht nach außen. Jede Änderung steht mit vorher und nachher
// in revy_actions und lässt sich einzeln zurücknehmen (lib/revy/actions.ts).
// Ausnahme: korrektur_melden ist Trainingsmaterial und nur zum Anhängen.
//
// Geschrieben wird mit der Sitzung des Nutzers (userWrite): RLS entscheidet,
// was er ändern darf, und die Datenbank-Trigger halten ihn als Akteur fest
// (Entscheidungsprotokoll 031).
// ─────────────────────────────────────────────────────────────────────────────

/** Mehr Kandidaten pro Schritt gibt es nicht. Ab 11 fragt Revy vorher (gate.ts). */
const MAX_REFS = 50
const internRefs = {
  refs: z.array(REF).min(1).max(MAX_REFS).optional(),
  refs_aus_schritt: z.number().int().min(1).max(10).optional().describe("Kürzel aus dem Ergebnis eines früheren Schritts (Nummer ab 1)"),
  anzahl: z.number().int().min(1).max(MAX_REFS).optional().describe("Wie viele Kürzel aus dem früheren Schritt, in dessen Reihenfolge"),
}

/** Status, die Revy setzen darf. Absage und Einstellung nie (Entscheidung des Menschen, Etappe 3). */
const ZIELSTATUS = { shortlist: "shortlisted", bewertet: "scored" } as const
/** Von diesen Status aus darf Revy umstellen. Laufende Analysen und Entscheidungen bleiben. */
const VON_STATUS = new Set(["new", "scored", "shortlisted"])

interface Aenderung {
  ref: string
  aktion_id: string | null
  vorher: unknown
  nachher: unknown
}

async function recordAction(
  ctx: ToolContext,
  werkzeug: string,
  ref: string,
  ziel: Record<string, unknown>,
  vorher: unknown,
  nachher: unknown,
): Promise<string | null> {
  const { data, error } = await ctx.admin
    .from("revy_actions")
    .insert({ user_id: ctx.ownerId, actor_id: ctx.actorId, run_id: ctx.runId, werkzeug, ref, ziel, vorher, nachher })
    .select("id")
    .single()
  if (error || !data) {
    console.error("[revy] Aktion nicht protokolliert:", error?.message)
    return null
  }
  return data.id as string
}

function result(schritt: number, werkzeug: string, geaendert: Aenderung[], uebersprungen: Array<{ ref: string; grund: string }>): StepResult {
  return {
    schritt,
    werkzeug,
    refs: geaendert.map((g) => g.ref),
    data: { geaendert, uebersprungen },
    korpus: {},
  }
}

async function applicationsFor(ctx: ToolContext, refs: string[], stelleId: string): Promise<ApplicationRow[]> {
  if (refs.length === 0) return []
  const { data, error } = await revy(ctx.db).from("applications").select(APPLICATION_COLS).eq("stelle_id", stelleId).in("ref", refs)
  if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
  return (data ?? []) as ApplicationRow[]
}

// ── status_setzen ───────────────────────────────────────────────────────────

const statusSetzen = def({
  name: "status_setzen",
  effect: "INTERN",
  description:
    "Setzt den Status von Bewerbungen einer Stelle auf Shortlist oder zurück auf Bewertet. Absagen und Einstellen kann Revy nicht. Laufende Analysen, Einladungen, Absagen und Einstellungen bleiben unverändert.",
  params: z.object({ stelle_id: z.string().uuid(), status: z.enum(["shortlist", "bewertet"]), ...internRefs }),
  describe: (p) => `Status auf ${p.status === "shortlist" ? "Shortlist" : "Bewertet"} setzen (${describeRefs(p)})`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    const refs = resolveRefs(p, ctx)
    const apps = await applicationsFor(ctx, refs, p.stelle_id)
    const nach = ZIELSTATUS[p.status]
    const geaendert: Aenderung[] = []
    const uebersprungen: Array<{ ref: string; grund: string }> = []
    for (const ref of refs) {
      const a = apps.find((x) => x.ref === ref)
      if (!a) {
        uebersprungen.push({ ref, grund: "nicht in dieser Stelle" })
        continue
      }
      if (a.status === nach) {
        uebersprungen.push({ ref, grund: `schon ${statusLabel(nach)}` })
        continue
      }
      if (!VON_STATUS.has(a.status)) {
        uebersprungen.push({ ref, grund: `Status ${statusLabel(a.status)} ändert Revy nicht` })
        continue
      }
      const { data, error } = await userWrite(ctx)
        .from("job_candidates")
        .update({ status: nach })
        .eq("id", a.bewerbung_id)
        .eq("status", a.status)
        .select("id")
      if (error || !data?.length) {
        uebersprungen.push({ ref, grund: "keine Berechtigung oder inzwischen geändert" })
        continue
      }
      const id = await recordAction(ctx, "status_setzen", ref, { tabelle: "job_candidates", id: a.bewerbung_id, stelle_id: p.stelle_id }, { status: a.status }, { status: nach })
      geaendert.push({ ref, aktion_id: id, vorher: statusLabel(a.status), nachher: statusLabel(nach) })
    }
    return result(schritt, "status_setzen", geaendert, uebersprungen)
  },
})

// ── tag_setzen / tag_entfernen ──────────────────────────────────────────────

const TAG = BEGRIFF.describe("Kurzes Etikett, etwa „Runde 2“ oder „Rückruf“")

const tagSetzen = def({
  name: "tag_setzen",
  effect: "INTERN",
  description: "Setzt ein Tag bei Kandidaten, mit stelle_id nur für diese Stelle (etwa „Runde 2“), sonst für den ganzen Pool.",
  params: z.object({ tag: TAG, stelle_id: z.string().uuid().optional(), ...internRefs }),
  describe: (p) => `Tag „${p.tag}“ setzen (${describeRefs(p)})${p.stelle_id ? " in der Stelle" : ""}`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    const geaendert: Aenderung[] = []
    const uebersprungen: Array<{ ref: string; grund: string }> = []
    if (checkText(p.tag)) {
      return { ...result(schritt, "tag_setzen", [], []), hinweise: ["Dieses Tag betrifft ein geschütztes Merkmal. Revy setzt es nicht."] }
    }
    const rows = await candidatesByRefs(ctx, resolveRefs(p, ctx))
    for (const c of rows) {
      const { data, error } = await userWrite(ctx)
        .from("candidate_tags")
        .insert({ user_id: ctx.ownerId, candidate_id: c.candidate_id, job_id: p.stelle_id ?? null, tag: p.tag.trim() })
        .select("id")
        .single()
      if (error || !data) {
        uebersprungen.push({ ref: c.ref, grund: error?.code === "23505" ? "Tag schon vorhanden" : "keine Berechtigung" })
        continue
      }
      const id = await recordAction(ctx, "tag_setzen", c.ref, { tabelle: "candidate_tags", id: data.id }, null, { tag: p.tag.trim(), stelle_id: p.stelle_id ?? null })
      geaendert.push({ ref: c.ref, aktion_id: id, vorher: null, nachher: p.tag.trim() })
    }
    return result(schritt, "tag_setzen", geaendert, uebersprungen)
  },
})

const tagEntfernen = def({
  name: "tag_entfernen",
  effect: "INTERN",
  description: "Entfernt ein Tag bei Kandidaten (mit stelle_id nur das Tag dieser Stelle, sonst überall).",
  params: z.object({ tag: TAG, stelle_id: z.string().uuid().optional(), ...internRefs }),
  describe: (p) => `Tag „${p.tag}“ entfernen (${describeRefs(p)})`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    const geaendert: Aenderung[] = []
    const uebersprungen: Array<{ ref: string; grund: string }> = []
    const rows = await candidatesByRefs(ctx, resolveRefs(p, ctx))
    for (const c of rows) {
      const { data: tags } = await userWrite(ctx).from("candidate_tags").select("id, job_id, tag, created_at").eq("candidate_id", c.candidate_id)
      const hits = ((tags ?? []) as Array<{ id: string; job_id: string | null; tag: string; created_at: string }>).filter(
        (t) => t.tag.trim().toLowerCase() === p.tag.trim().toLowerCase() && (!p.stelle_id || t.job_id === p.stelle_id),
      )
      if (hits.length === 0) {
        uebersprungen.push({ ref: c.ref, grund: "Tag nicht vorhanden" })
        continue
      }
      const { data: del, error } = await userWrite(ctx).from("candidate_tags").delete().in("id", hits.map((h) => h.id)).select("id")
      if (error || !del?.length) {
        uebersprungen.push({ ref: c.ref, grund: "keine Berechtigung" })
        continue
      }
      const vorher = hits.map((h) => ({ tag: h.tag, job_id: h.job_id }))
      const id = await recordAction(ctx, "tag_entfernen", c.ref, { tabelle: "candidate_tags", candidate_id: c.candidate_id }, { tags: vorher }, null)
      geaendert.push({ ref: c.ref, aktion_id: id, vorher: p.tag, nachher: null })
    }
    return result(schritt, "tag_entfernen", geaendert, uebersprungen)
  },
})

// ── notiz_anlegen ───────────────────────────────────────────────────────────

/** Notizen landen im bestehenden Notizfeld der Bewerbung, sichtbar in der Stelle. */
export function appendNote(old: string | null, text: string, now = new Date()): string {
  const datum = now.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Vienna" })
  const zeile = `[${datum}, Revy] ${text.trim()}`
  return old?.trim() ? `${old.trimEnd()}\n\n${zeile}` : zeile
}

const notizAnlegen = def({
  name: "notiz_anlegen",
  effect: "INTERN",
  description:
    "Hängt eine Notiz an die Bewerbung in einer Stelle an. Der Text kommt wörtlich oder sinngemäß aus dem Befehl des Nutzers, nie aus Unterlagen.",
  params: z.object({ stelle_id: z.string().uuid(), text: z.string().trim().min(2).max(500), ...internRefs }),
  describe: (p) => `Notiz anlegen (${describeRefs(p)}): „${p.text}“`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    if (checkText(p.text)) {
      return { ...result(schritt, "notiz_anlegen", [], []), hinweise: ["Die Notiz betrifft ein geschütztes Merkmal. Revy legt sie nicht an."] }
    }
    const refs = resolveRefs(p, ctx)
    const apps = await applicationsFor(ctx, refs, p.stelle_id)
    const geaendert: Aenderung[] = []
    const uebersprungen: Array<{ ref: string; grund: string }> = []
    for (const ref of refs) {
      const a = apps.find((x) => x.ref === ref)
      if (!a) {
        uebersprungen.push({ ref, grund: "nicht in dieser Stelle" })
        continue
      }
      const { data: cur } = await userWrite(ctx).from("job_candidates").select("id, notes").eq("id", a.bewerbung_id).maybeSingle()
      if (!cur) {
        uebersprungen.push({ ref, grund: "keine Berechtigung" })
        continue
      }
      const vorher = (cur.notes as string | null) ?? null
      const nachher = appendNote(vorher, p.text)
      const { data, error } = await userWrite(ctx).from("job_candidates").update({ notes: nachher }).eq("id", a.bewerbung_id).select("id")
      if (error || !data?.length) {
        uebersprungen.push({ ref, grund: "keine Berechtigung" })
        continue
      }
      const id = await recordAction(ctx, "notiz_anlegen", ref, { tabelle: "job_candidates", id: a.bewerbung_id, stelle_id: p.stelle_id }, { notes: vorher }, { notes: nachher })
      geaendert.push({ ref, aktion_id: id, vorher: null, nachher: p.text })
    }
    return result(schritt, "notiz_anlegen", geaendert, uebersprungen)
  },
})

// ── korrektur_melden ────────────────────────────────────────────────────────

export const KATEGORIEN = ["fachlich", "erfahrung", "ausbildung", "soft_skills", "sprachen", "standort", "branche", "gehalt", "kultur"] as const

const korrekturMelden = def({
  name: "korrektur_melden",
  effect: "INTERN",
  description:
    "Hält fest, dass der Nutzer einer Einschätzung widerspricht: Kategorie, Bewertung vorher und nachher (0 bis 100) und die Belegstelle, auf die er sich stützt. Ändert keinen Score. Wird ohne Namen, Firmennamen und Kürzel als Trainingsmaterial gespeichert und lässt sich nicht zurücknehmen.",
  params: z.object({
    ref: REF,
    kategorie: z.enum(KATEGORIEN),
    score_vorher: z.number().int().min(0).max(100),
    score_nachher: z.number().int().min(0).max(100),
    belegstelle: z.string().trim().max(300).optional().describe("Zeugnisformulierung oder Stelle aus den Unterlagen, auf die sich der Nutzer stützt"),
  }),
  describe: (p) => `Korrektur festhalten: ${p.kategorie} von ${p.score_vorher} auf ${p.score_nachher} (${p.ref})`,
  impact: () => 1,
  cost: noCost,
  async run(p, ctx, schritt) {
    const [c] = await candidatesByRefs(ctx, [p.ref])
    if (!c) return result(schritt, "korrektur_melden", [], [{ ref: p.ref, grund: "Kandidat nicht sichtbar" }])
    let beleg: string | null = null
    if (p.belegstelle) {
      const { data, error } = await revy(ctx.db).rpc("korrektur_text", { p_ref: p.ref, p_text: p.belegstelle })
      if (error) throw new Error(`Belegstelle nicht geschwärzt: ${error.message}`)
      beleg = (data as string) || null
    }
    const { error } = await ctx.admin.from("revy_corrections").insert({
      user_id: ctx.ownerId,
      kategorie: p.kategorie,
      score_vorher: p.score_vorher,
      score_nachher: p.score_nachher,
      belegstelle: beleg,
    })
    if (error) throw new Error(`Korrektur nicht gespeichert: ${error.message}`)
    return result(schritt, "korrektur_melden", [{ ref: p.ref, aktion_id: null, vorher: p.score_vorher, nachher: p.score_nachher }], [])
  },
})

export const INTERN = {
  status_setzen: statusSetzen,
  tag_setzen: tagSetzen,
  tag_entfernen: tagEntfernen,
  notiz_anlegen: notizAnlegen,
  korrektur_melden: korrekturMelden,
}
