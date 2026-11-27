import { z } from "zod"
import { checkRejectionWithModel, type Pruefung } from "../absage-pruefer"
import { checkText } from "../policy"
import { pickTerminart, terminStand, terminartText } from "../termine"
import { GESPRAECH, TOENE, absageVorlage, einladungVorlage, terminVorlage } from "../vorlagen"
import {
  APPLICATION_COLS,
  BEGRIFF,
  REF,
  def,
  describeRefs,
  noCost,
  refsUpperBound,
  resolveRefs,
  revy,
  statusLabel,
  type ApplicationRow,
  type StepResult,
  type ToolContext,
} from "./base"

// ─────────────────────────────────────────────────────────────────────────────
// Werkzeuge der Wirkungsklasse NACH_AUSSEN (Etappe 3).
//
// Sie erzeugen NUR Entwürfe in revy_batches und revy_drafts. Kein Werkzeug
// hier verschickt etwas, importiert den Mailversand oder ändert einen Status.
// Versendet wird ausschließlich über die Freigaberoute nach einem Klick
// (lib/revy/freigabe.ts). tests/revy-agent.test.ts prüft das im Quelltext.
// ─────────────────────────────────────────────────────────────────────────────

const MAX = 50
const aussenRefs = {
  refs: z.array(REF).min(1).max(MAX).optional(),
  refs_aus_schritt: z.number().int().min(1).max(10).optional().describe("Kürzel aus dem Ergebnis eines früheren Schritts (Nummer ab 1)"),
  anzahl: z.number().int().min(1).max(MAX).optional().describe("Wie viele Kürzel aus dem früheren Schritt, in dessen Reihenfolge"),
}

/** Status, bei denen eine Absage keinen Sinn ergibt oder schon passiert ist. */
const KEINE_ABSAGE = new Set(["Abgesagt", "rejected", "Eingestellt", "hired", "analyzing", "queued"])
/** Status, bei denen eine Einladung keinen Sinn ergibt. */
const KEINE_EINLADUNG = new Set(["Abgesagt", "rejected", "Eingestellt", "hired", "Eingeladen", "interviewed", "analyzing", "queued"])
/**
 * Status, bei denen ein Terminvorschlag keinen Sinn ergibt. Eingeladen und
 * Gespräch geführt bleiben möglich: Ein Buchungslink nach einer Einladung per
 * Mail oder für ein zweites Gespräch ist üblich. Ein neuer Link zieht den
 * alten zurück.
 */
export const KEIN_TERMIN = new Set(["Abgesagt", "rejected", "Eingestellt", "hired", "analyzing", "queued"])

type Art = "absage" | "einladung" | "termin"
const WERKZEUG: Record<Art, string> = { absage: "absage_entwerfen", einladung: "einladung_entwerfen", termin: "termin_vorschlagen" }

interface Entwurfsergebnis {
  /** Erster Stapel, für einfache Fälle. */
  batch_id: string | null
  /** Ein Stapel je Stelle. */
  stapel: Array<{ batch_id: string; stelle_id: string; entwuerfe: number }>
  art: Art
  entwuerfe: number
  uebersprungen: Array<{ ref: string; grund: string }>
}

/**
 * Bewerbungen zu den Kürzeln. Mit stelle_id genau diese Stelle; ohne sucht
 * Revy je Kandidat die eine offene Bewerbung. Gibt es mehrere, fragt Revy
 * nach der Stelle statt zu raten.
 */
async function targetApplications(
  ctx: ToolContext,
  refs: string[],
  stelleId: string | undefined,
  ausgeschlossen: Set<string>,
): Promise<{ ziele: ApplicationRow[]; uebersprungen: Array<{ ref: string; grund: string }> }> {
  const uebersprungen: Array<{ ref: string; grund: string }> = []
  let q = revy(ctx.db).from("applications").select(APPLICATION_COLS).in("ref", refs)
  if (stelleId) q = q.eq("stelle_id", stelleId)
  const { data, error } = await q
  if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
  const apps = (data ?? []) as ApplicationRow[]
  const { data: kontakt } = await revy(ctx.db).rpc("kontaktierbar", { p_refs: refs })
  const mitEmail = new Set(((kontakt ?? []) as Array<{ ref: string; hat_email: boolean }>).filter((k) => k.hat_email).map((k) => k.ref))

  const ziele: ApplicationRow[] = []
  for (const ref of refs) {
    const eigene = apps.filter((x) => x.ref === ref)
    const offen = eigene.filter((x) => !ausgeschlossen.has(x.status))
    if (eigene.length === 0) uebersprungen.push({ ref, grund: stelleId ? "nicht in dieser Stelle" : "keine Bewerbung gefunden" })
    else if (offen.length === 0) uebersprungen.push({ ref, grund: `Status ${statusLabel(eigene[0].status)} passt nicht` })
    else if (offen.length > 1) uebersprungen.push({ ref, grund: "in mehreren Stellen beworben, sag mir die Stelle" })
    else if (!mitEmail.has(ref)) uebersprungen.push({ ref, grund: "keine E-Mail-Adresse hinterlegt" })
    else ziele.push(offen[0])
  }
  return { ziele, uebersprungen }
}

async function createDrafts(
  ctx: ToolContext,
  schritt: number,
  art: Art,
  stelleId: string | undefined,
  refs: string[],
  ausgeschlossen: Set<string>,
  ton: string,
  zusatz: string | null,
  vorlage: { betreff: string; text: string },
  pruefung: Pruefung,
  extra: Record<string, unknown> = {},
): Promise<StepResult> {
  const { ziele, uebersprungen } = await targetApplications(ctx, refs, stelleId, ausgeschlossen)

  // Ein Stapel je Stelle: Freigabe und Vorschau gelten je Stelle.
  const stapel: Entwurfsergebnis["stapel"] = []
  const nachStelle = new Map<string, ApplicationRow[]>()
  for (const a of ziele) nachStelle.set(a.stelle_id, [...(nachStelle.get(a.stelle_id) ?? []), a])
  for (const [sid, gruppe] of nachStelle) {
    const { data: batch, error: bErr } = await ctx.admin
      .from("revy_batches")
      .insert({ user_id: ctx.ownerId, actor_id: ctx.actorId, run_id: ctx.runId, art, stelle_id: sid, ton, zusatz, ...extra })
      .select("id")
      .single()
    if (bErr || !batch) throw new Error(`Entwurf nicht angelegt: ${bErr?.message}`)
    const batchId = batch.id as string
    const { error: dErr } = await ctx.admin.from("revy_drafts").insert(
      gruppe.map((a) => ({
        batch_id: batchId,
        user_id: ctx.ownerId,
        job_candidate_id: a.bewerbung_id,
        ref: a.ref,
        betreff: vorlage.betreff,
        text: vorlage.text,
        pruefung,
      })),
    )
    if (dErr) throw new Error(`Entwürfe nicht angelegt: ${dErr.message}`)
    stapel.push({ batch_id: batchId, stelle_id: sid, entwuerfe: gruppe.length })
  }
  const data: Entwurfsergebnis = { batch_id: stapel[0]?.batch_id ?? null, stapel, art, entwuerfe: ziele.length, uebersprungen }
  return { schritt, werkzeug: WERKZEUG[art], refs: ziele.map((a) => a.ref), data, korpus: {} }
}

// ── absage_entwerfen ────────────────────────────────────────────────────────

const absageEntwerfen = def({
  name: "absage_entwerfen",
  effect: "NACH_AUSSEN",
  description:
    "Legt Absagen als Entwürfe an (feste Vorlage, nur der Ton ist wählbar). Revy verschickt nichts; der Nutzer prüft und gibt in der Freigabe-Ansicht frei. Absagen enthalten nie eine Begründung zur Person. zusatz nur, wenn der Nutzer ausdrücklich einen Satz dazu will.",
  params: z.object({
    stelle_id: z.string().uuid().optional().describe("Weglassen, wenn unklar: Revy nimmt die offene Bewerbung des Kandidaten"),
    ...aussenRefs,
    ton: z.enum(TOENE).optional(),
    zusatz: z.string().trim().max(500).optional().describe("Optionaler Satz aus dem Befehl, ohne Begründung zur Person"),
  }),
  describe: (p) => `Absagen als Entwurf anlegen (${describeRefs(p)})${p.ton && p.ton !== "standard" ? `, Ton ${p.ton}` : ""}`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    const hinweise: string[] = []
    let zusatz: string | null = p.zusatz?.trim() || null
    let pruefung: Pruefung = { ok: true }
    if (zusatz) {
      pruefung = await checkRejectionWithModel(zusatz)
      if (!pruefung.ok) {
        hinweise.push(
          pruefung.grund === "pruefung_nicht_moeglich"
            ? "Der Zusatz ließ sich gerade nicht prüfen und ist nicht im Entwurf."
            : "Absagen enthalten keine Begründung zur Person. Revy hat den Zusatz weggelassen und die Vorlage ohne Begründung verwendet.",
        )
        zusatz = null
      }
    }
    const vorlage = absageVorlage(p.ton ?? "standard", zusatz)
    const r = await createDrafts(ctx, schritt, "absage", p.stelle_id, resolveRefs(p, ctx), KEINE_ABSAGE, p.ton ?? "standard", zusatz, vorlage, pruefung)
    return { ...r, hinweise }
  },
})

// ── einladung_entwerfen ─────────────────────────────────────────────────────

const einladungEntwerfen = def({
  name: "einladung_entwerfen",
  effect: "NACH_AUSSEN",
  description:
    "Legt Einladungen zum Gespräch als Entwürfe an (feste Vorlage, Gesprächsform wählbar, optional ein Satz aus dem Befehl). Revy verschickt nichts; der Nutzer gibt in der Freigabe-Ansicht frei. Der Bewerber antwortet per Mail, ein Termin wird danach vereinbart.",
  params: z.object({
    stelle_id: z.string().uuid().optional().describe("Weglassen, wenn unklar: Revy nimmt die offene Bewerbung des Kandidaten"),
    ...aussenRefs,
    gespraech: z.enum(GESPRAECH).optional(),
    zusatz: z.string().trim().max(500).optional().describe("Optionaler Satz aus dem Befehl, etwa zum Zeitraum"),
  }),
  describe: (p) => `Einladungen als Entwurf anlegen (${describeRefs(p)})`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    const hinweise: string[] = []
    let zusatz: string | null = p.zusatz?.trim() || null
    if (zusatz && checkText(zusatz)) {
      hinweise.push("Der Zusatz betraf ein geschütztes Merkmal und ist nicht im Entwurf.")
      zusatz = null
    }
    const vorlage = einladungVorlage(p.gespraech ?? "offen", zusatz)
    const r = await createDrafts(ctx, schritt, "einladung", p.stelle_id, resolveRefs(p, ctx), KEINE_EINLADUNG, p.gespraech ?? "offen", zusatz, vorlage, { ok: true })
    return { ...r, hinweise }
  },
})

// ── termin_vorschlagen (Etappe 4) ───────────────────────────────────────────

const terminVorschlagen = def({
  name: "termin_vorschlagen",
  effect: "NACH_AUSSEN",
  description:
    "Legt Terminvorschläge als Entwürfe an: eine Mail mit persönlichem Buchungslink, über den der Bewerber selbst einen freien Termin aus deinem Kalender wählt. Nutzt deine Zeiten und Terminarten unter Termine. Revy verschickt nichts; der Link entsteht erst beim Versand nach der Freigabe.",
  params: z.object({
    stelle_id: z.string().uuid().optional().describe("Weglassen, wenn unklar: Revy nimmt die offene Bewerbung des Kandidaten"),
    ...aussenRefs,
    terminart: BEGRIFF.optional().describe("Name einer Terminart aus dem Befehl, sonst die Standard-Terminart"),
    zusatz: z.string().trim().max(500).optional().describe("Optionaler Satz aus dem Befehl"),
  }),
  describe: (p) => `Terminvorschläge mit Buchungslink als Entwurf anlegen (${describeRefs(p)})${p.terminart ? `, Terminart ${p.terminart}` : ""}`,
  impact: (p) => refsUpperBound(p),
  cost: noCost,
  async run(p, ctx, schritt) {
    const hinweise: string[] = []
    let zusatz: string | null = p.zusatz?.trim() || null
    if (zusatz && checkText(zusatz)) {
      hinweise.push("Der Zusatz betraf ein geschütztes Merkmal und ist nicht im Entwurf.")
      zusatz = null
    }
    const stand = await terminStand(ctx.admin, ctx.actorId)
    const { art, nichtGefunden } = pickTerminart(stand, p.terminart)
    const text = terminartText(art)
    if (nichtGefunden) hinweise.push(`Eine Terminart „${p.terminart}“ gibt es nicht. Revy nimmt „${text.name}“.`)
    if (!art) hinweise.push(`Du hast noch keine Terminart. Beim Versand legt Revetly „${text.name}“ an, ${text.dauer} Minuten ${text.ort}. Ändern kannst du das unter Termine.`)
    if (!stand.eingerichtet) hinweise.push("Du hast deine Zeiten noch nicht gespeichert. Der Link zeigt die Standardzeiten. Ändern kannst du das unter Termine.")
    const vorlage = terminVorlage(text, zusatz)
    const r = await createDrafts(ctx, schritt, "termin", p.stelle_id, resolveRefs(p, ctx), KEIN_TERMIN, "standard", zusatz, vorlage, { ok: true }, { meeting_type_id: art?.id ?? null })
    return { ...r, hinweise }
  },
})

export const AUSSEN = {
  absage_entwerfen: absageEntwerfen,
  einladung_entwerfen: einladungEntwerfen,
  termin_vorschlagen: terminVorschlagen,
}
