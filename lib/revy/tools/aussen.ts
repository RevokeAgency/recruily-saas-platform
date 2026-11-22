import { z } from "zod"
import { checkRejectionWithModel, type Pruefung } from "../absage-pruefer"
import { checkText } from "../policy"
import { GESPRAECH, TOENE, absageVorlage, einladungVorlage } from "../vorlagen"
import {
  APPLICATION_COLS,
  REF,
  def,
  describeRefs,
  noCost,
  refsUpperBound,
  resolveRefs,
  revy,
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

interface Entwurfsergebnis {
  batch_id: string | null
  art: "absage" | "einladung"
  entwuerfe: number
  uebersprungen: Array<{ ref: string; grund: string }>
}

async function createDrafts(
  ctx: ToolContext,
  schritt: number,
  art: "absage" | "einladung",
  stelleId: string,
  refs: string[],
  ausgeschlossen: Set<string>,
  ton: string,
  zusatz: string | null,
  vorlage: { betreff: string; text: string },
  pruefung: Pruefung,
): Promise<StepResult> {
  const uebersprungen: Array<{ ref: string; grund: string }> = []
  const { data: appsData, error } = await revy(ctx.db).from("applications").select(APPLICATION_COLS).eq("stelle_id", stelleId).in("ref", refs)
  if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
  const apps = (appsData ?? []) as ApplicationRow[]
  const { data: kontakt } = await revy(ctx.db).rpc("kontaktierbar", { p_refs: refs })
  const mitEmail = new Set(((kontakt ?? []) as Array<{ ref: string; hat_email: boolean }>).filter((k) => k.hat_email).map((k) => k.ref))

  const ziele: ApplicationRow[] = []
  for (const ref of refs) {
    const a = apps.find((x) => x.ref === ref)
    if (!a) uebersprungen.push({ ref, grund: "nicht in dieser Stelle" })
    else if (ausgeschlossen.has(a.status)) uebersprungen.push({ ref, grund: `Status ${a.status} passt nicht` })
    else if (!mitEmail.has(ref)) uebersprungen.push({ ref, grund: "keine E-Mail-Adresse hinterlegt" })
    else ziele.push(a)
  }

  let batchId: string | null = null
  if (ziele.length) {
    const { data: batch, error: bErr } = await ctx.admin
      .from("revy_batches")
      .insert({ user_id: ctx.ownerId, actor_id: ctx.actorId, run_id: ctx.runId, art, stelle_id: stelleId, ton, zusatz })
      .select("id")
      .single()
    if (bErr || !batch) throw new Error(`Entwurf nicht angelegt: ${bErr?.message}`)
    batchId = batch.id as string
    const { error: dErr } = await ctx.admin.from("revy_drafts").insert(
      ziele.map((a) => ({
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
  }
  const data: Entwurfsergebnis = { batch_id: batchId, art, entwuerfe: ziele.length, uebersprungen }
  return { schritt, werkzeug: art === "absage" ? "absage_entwerfen" : "einladung_entwerfen", refs: ziele.map((a) => a.ref), data, korpus: {} }
}

// ── absage_entwerfen ────────────────────────────────────────────────────────

const absageEntwerfen = def({
  name: "absage_entwerfen",
  effect: "NACH_AUSSEN",
  description:
    "Legt Absagen als Entwürfe an (feste Vorlage, nur der Ton ist wählbar). Revy verschickt nichts; der Nutzer prüft und gibt in der Freigabe-Ansicht frei. Absagen enthalten nie eine Begründung zur Person. zusatz nur, wenn der Nutzer ausdrücklich einen Satz dazu will.",
  params: z.object({
    stelle_id: z.string().uuid(),
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
    stelle_id: z.string().uuid(),
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

export const AUSSEN = {
  absage_entwerfen: absageEntwerfen,
  einladung_entwerfen: einladungEntwerfen,
}
