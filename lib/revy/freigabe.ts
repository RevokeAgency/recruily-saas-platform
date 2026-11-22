import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import type { RevyContext } from "./agent"
import { writeAudit } from "./audit"
import { GESPRAECH, TOENE, absageVorlage, einladungVorlage, type Gespraech, type Ton } from "./vorlagen"

// ─────────────────────────────────────────────────────────────────────────────
// Freigabe von Entwürfen (Etappe 3). Einziger Weg, auf dem Revy-Entwürfe
// verschickt werden.
//
//  1. Die Freigabe-Ansicht öffnet einen Stapel. Erst dann entsteht ein
//     Einmal-Token, gültig 15 Minuten. Gespeichert wird nur sein Hash. Der
//     Token erscheint nie im Chat und nie beim Modell.
//  2. Freigeben verlangt diesen Token. Er wird in derselben Abfrage
//     verbraucht, in der der Stapel auf "freigegeben" springt. Ein zweiter
//     Aufruf, ein gefälschter oder abgelaufener Token scheitern.
//  3. Verschickt werden nur Entwürfe dieses Stapels, die angehakt sind.
//     Fremde Entwurfs-IDs in der Anfrage werden ignoriert.
//  4. Danach plant die Freigabe die Zustellungen gestaffelt ein
//     (lib/revy/versand.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_MINUTES = 15
/** Abstand zwischen zwei Mails eines Stapels. */
export function sendIntervalSeconds(): number {
  const n = Number(process.env.REVY_SEND_INTERVAL_SECONDS)
  return Number.isFinite(n) && n >= 1 && n <= 600 ? n : 10
}

function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex")
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex")
  const y = Buffer.from(b, "hex")
  return x.length === y.length && timingSafeEqual(x, y)
}

interface BatchRow {
  id: string
  user_id: string
  art: "absage" | "einladung"
  stelle_id: string
  ton: string
  zusatz: string | null
  status: string
  token_hash: string | null
  token_bis: string | null
  freigegeben_am: string | null
}

export interface DraftView {
  id: string
  ref: string
  betreff: string
  text: string
  ausgewaehlt: boolean
  zustellung: { status: string; fehler: string | null; gesendet_am: string | null; zugestellt_am: string | null } | null
}

export interface BatchView {
  id: string
  art: "absage" | "einladung"
  status: string
  ton: string
  stelle: { id: string; titel: string; firma: string }
  entwuerfe: DraftView[]
  /** Nur solange der Stapel offen ist. Einmal verwendbar. */
  token?: string
}

export type FreigabeFehler = { ok: false; status: number; error: string }

async function loadBatch(ctx: RevyContext, id: string): Promise<BatchRow | null> {
  const { data } = await ctx.admin
    .from("revy_batches")
    .select("id, user_id, art, stelle_id, ton, zusatz, status, token_hash, token_bis, freigegeben_am")
    .eq("id", id)
    .eq("user_id", ctx.ownerId)
    .maybeSingle()
  return (data as BatchRow | null) ?? null
}

/** Stelle mit der Sitzung des Nutzers: Wer die Stelle nicht sieht, sieht auch den Stapel nicht. */
async function visibleJob(ctx: RevyContext, stelleId: string): Promise<{ titel: string; firma: string } | null> {
  const { data } = await ctx.db.from("jobs").select("title, company").eq("id", stelleId).maybeSingle()
  return data ? { titel: (data.title as string) || "die Stelle", firma: (data.company as string) || "unser Unternehmen" } : null
}

/** Freigabe-Ansicht: Stapel mit Entwürfen und, solange offen, ein frischer Einmal-Token. */
export async function openBatch(ctx: RevyContext, id: string): Promise<BatchView | FreigabeFehler> {
  const b = await loadBatch(ctx, id)
  if (!b) return { ok: false, status: 404, error: "Entwurf nicht gefunden" }
  const job = await visibleJob(ctx, b.stelle_id)
  if (!job) return { ok: false, status: 404, error: "Entwurf nicht gefunden" }

  const { data: drafts } = await ctx.admin
    .from("revy_drafts")
    .select("id, ref, betreff, text, ausgewaehlt, created_at")
    .eq("batch_id", id)
    .order("created_at", { ascending: true })
  const { data: deliveries } = await ctx.admin
    .from("revy_deliveries")
    .select("draft_id, status, fehler, gesendet_am, zugestellt_am")
    .eq("batch_id", id)
  const byDraft = new Map(((deliveries ?? []) as Array<{ draft_id: string; status: string; fehler: string | null; gesendet_am: string | null; zugestellt_am: string | null }>).map((d) => [d.draft_id, d]))

  let token: string | undefined
  if (b.status === "entwurf") {
    token = randomBytes(32).toString("base64url")
    await ctx.admin
      .from("revy_batches")
      .update({ token_hash: hashToken(token), token_bis: new Date(Date.now() + TOKEN_MINUTES * 60_000).toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "entwurf")
  }

  return {
    id: b.id,
    art: b.art,
    status: b.status,
    ton: b.ton,
    stelle: { id: b.stelle_id, ...job },
    entwuerfe: ((drafts ?? []) as Array<Omit<DraftView, "zustellung">>).map((d) => {
      const z = byDraft.get(d.id)
      return { ...d, zustellung: z ? { status: z.status, fehler: z.fehler, gesendet_am: z.gesendet_am, zugestellt_am: z.zugestellt_am } : null }
    }),
    ...(token ? { token } : {}),
  }
}

/** Ton für alle Entwürfe eines offenen Stapels ändern (feste Vorlagen). */
export async function setTone(ctx: RevyContext, id: string, ton: string): Promise<{ ok: true } | FreigabeFehler> {
  const b = await loadBatch(ctx, id)
  if (!b || !(await visibleJob(ctx, b.stelle_id))) return { ok: false, status: 404, error: "Entwurf nicht gefunden" }
  if (b.status !== "entwurf") return { ok: false, status: 409, error: "Der Stapel ist nicht mehr offen." }
  let vorlage: { betreff: string; text: string }
  if (b.art === "absage") {
    if (!(TOENE as readonly string[]).includes(ton)) return { ok: false, status: 400, error: "Unbekannter Ton" }
    vorlage = absageVorlage(ton as Ton, b.zusatz)
  } else {
    if (!(GESPRAECH as readonly string[]).includes(ton)) return { ok: false, status: 400, error: "Unbekannte Gesprächsform" }
    vorlage = einladungVorlage(ton as Gespraech, b.zusatz)
  }
  await ctx.admin.from("revy_drafts").update({ betreff: vorlage.betreff, text: vorlage.text }).eq("batch_id", id)
  await ctx.admin.from("revy_batches").update({ ton, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "entwurf")
  return { ok: true }
}

/**
 * Freigeben. Verbraucht den Einmal-Token, setzt den Stapel auf freigegeben
 * und plant die Zustellungen gestaffelt ein. Verschickt selbst nichts; das
 * übernimmt processDue in lib/revy/versand.ts.
 */
export async function approveBatch(
  ctx: RevyContext,
  id: string,
  input: { token: string; ausgewaehlt: string[] },
): Promise<{ ok: true; geplant: number } | FreigabeFehler> {
  const b = await loadBatch(ctx, id)
  if (!b || !(await visibleJob(ctx, b.stelle_id))) return { ok: false, status: 404, error: "Entwurf nicht gefunden" }
  if (b.status !== "entwurf") return { ok: false, status: 409, error: "Dieser Stapel ist schon freigegeben oder abgebrochen." }
  if (!input.token || !b.token_hash || !sameHash(hashToken(input.token), b.token_hash)) {
    return { ok: false, status: 403, error: "Freigabe nur aus der Freigabe-Ansicht. Bitte die Ansicht neu öffnen." }
  }
  if (!b.token_bis || new Date(b.token_bis).getTime() < Date.now()) {
    return { ok: false, status: 403, error: "Die Freigabe ist abgelaufen. Bitte die Ansicht neu öffnen." }
  }

  const { data: drafts } = await ctx.admin.from("revy_drafts").select("id, ref, job_candidate_id, created_at").eq("batch_id", id).order("created_at", { ascending: true })
  const wanted = new Set(input.ausgewaehlt)
  const selected = ((drafts ?? []) as Array<{ id: string; ref: string; job_candidate_id: string }>).filter((d) => wanted.has(d.id))
  if (selected.length === 0) return { ok: false, status: 400, error: "Kein Entwurf ausgewählt." }

  // Token verbrauchen und freigeben in einem Schritt: Nur wer den Hash noch
  // trifft, gewinnt. Ein zweiter Aufruf findet keinen offenen Stapel mehr.
  const jetzt = new Date().toISOString()
  const { data: claimed } = await ctx.admin
    .from("revy_batches")
    .update({ status: "freigegeben", token_hash: null, token_bis: null, freigegeben_durch: ctx.actorId, freigegeben_am: jetzt, updated_at: jetzt })
    .eq("id", id)
    .eq("status", "entwurf")
    .eq("token_hash", b.token_hash)
    .select("id")
  if (!claimed?.length) return { ok: false, status: 409, error: "Dieser Stapel ist schon freigegeben." }

  const selectedIds = new Set(selected.map((d) => d.id))
  for (const d of (drafts ?? []) as Array<{ id: string }>) {
    await ctx.admin.from("revy_drafts").update({ ausgewaehlt: selectedIds.has(d.id) }).eq("id", d.id)
  }
  const step = sendIntervalSeconds() * 1000
  const start = Date.now()
  const { error } = await ctx.admin.from("revy_deliveries").insert(
    selected.map((d, i) => ({
      user_id: ctx.ownerId,
      batch_id: id,
      draft_id: d.id,
      job_candidate_id: d.job_candidate_id,
      ref: d.ref,
      geplant_am: new Date(start + i * step).toISOString(),
    })),
  )
  if (error) throw new Error(`Zustellungen nicht angelegt: ${error.message}`)

  await writeAudit(ctx.admin, {
    user_id: ctx.ownerId,
    actor_id: ctx.actorId,
    run_id: null,
    werkzeug: "freigabe",
    parameter: { batch_id: id, art: b.art, ausgewaehlt: selected.length, abgewaehlt: ((drafts ?? []) as unknown[]).length - selected.length },
    wirkung: "NACH_AUSSEN",
    refs: selected.map((d) => d.ref),
    freigabe_durch: ctx.actorId,
    freigabe_am: jetzt,
    ergebnis: { geplant: selected.length, abstand_sekunden: step / 1000 },
  })
  return { ok: true, geplant: selected.length }
}

/** Offenen Stapel verwerfen oder laufenden Versand stoppen (noch nicht verschickte Mails). */
export async function cancelBatch(ctx: RevyContext, id: string): Promise<{ ok: true; gestoppt: number } | FreigabeFehler> {
  const b = await loadBatch(ctx, id)
  if (!b || !(await visibleJob(ctx, b.stelle_id))) return { ok: false, status: 404, error: "Entwurf nicht gefunden" }
  if (b.status !== "entwurf" && b.status !== "freigegeben") return { ok: false, status: 409, error: "Hier ist nichts mehr zu stoppen." }
  const jetzt = new Date().toISOString()
  const { data: gestoppt } = await ctx.admin
    .from("revy_deliveries")
    .update({ status: "abgebrochen", updated_at: jetzt })
    .eq("batch_id", id)
    .eq("status", "geplant")
    .select("id, ref")
  await ctx.admin.from("revy_batches").update({ status: "abgebrochen", token_hash: null, token_bis: null, updated_at: jetzt }).eq("id", id)
  await writeAudit(ctx.admin, {
    user_id: ctx.ownerId,
    actor_id: ctx.actorId,
    run_id: null,
    werkzeug: b.status === "entwurf" ? "entwurf_verworfen" : "versand_gestoppt",
    parameter: { batch_id: id, art: b.art },
    wirkung: "NACH_AUSSEN",
    refs: ((gestoppt ?? []) as Array<{ ref: string }>).map((g) => g.ref),
    ergebnis: { gestoppt: gestoppt?.length ?? 0 },
  })
  return { ok: true, gestoppt: gestoppt?.length ?? 0 }
}
