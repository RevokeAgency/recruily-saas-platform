import type { SupabaseClient } from "@supabase/supabase-js"
import { logDecisions } from "@/lib/compliance/decision-log"
import { sendMailEuOnly } from "@/lib/email/client"
import { buildRejectionMail } from "@/lib/email/rejection"
import { buildInvitationMail } from "@/lib/email/revy"
import { checkRejection } from "./absage-pruefer"
import { renderDraft } from "./vorlagen"

// ─────────────────────────────────────────────────────────────────────────────
// Gestaffelter Versand freigegebener Revy-Entwürfe (Etappe 3).
//
// Läuft nur mit der Service-Rolle und nur für Zustellungen, die eine Freigabe
// angelegt hat (lib/revy/freigabe.ts). Jede Zustellung wird vor dem Versand
// beansprucht (geplant → in_versand), damit zwei gleichzeitige Läufe nie
// dieselbe Mail zweimal schicken. Versand nur über Lettermint (EU), mit der
// Zustellungs-ID als Idempotency-Key und als Metadatum für den Webhook.
//
// Angestoßen wird der Versand nach der Freigabe, solange die Freigabe-Ansicht
// den Fortschritt abfragt, und täglich durch /api/cron/revy-versand.
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryRow {
  id: string
  user_id: string
  batch_id: string
  draft_id: string
  job_candidate_id: string | null
  ref: string
  geplant_am: string
}

/** Ab so lange in_versand gilt eine Zustellung als hängengeblieben. */
const STUCK_MS = 10 * 60_000

function clean(msg: string): string {
  return msg.replace(/[^\s@]+@[^\s@]+/g, "[E-Mail]").slice(0, 300)
}

async function fail(admin: SupabaseClient, id: string, fehler: string) {
  await admin.from("revy_deliveries").update({ status: "fehler", fehler: clean(fehler), updated_at: new Date().toISOString() }).eq("id", id)
}

/** Eine beanspruchte Zustellung verschicken. */
async function deliver(admin: SupabaseClient, d: DeliveryRow): Promise<"gesendet" | "fehler" | "abgebrochen"> {
  const { data: batch } = await admin.from("revy_batches").select("id, art, status, freigegeben_durch, stelle_id").eq("id", d.batch_id).maybeSingle()
  if (!batch || batch.status === "abgebrochen") {
    await admin.from("revy_deliveries").update({ status: "abgebrochen", updated_at: new Date().toISOString() }).eq("id", d.id)
    return "abgebrochen"
  }
  const { data: draft } = await admin.from("revy_drafts").select("betreff, text").eq("id", d.draft_id).maybeSingle()
  const { data: link } = await admin
    .from("job_candidates")
    .select("id, status, job_id, user_id, candidate:candidates(full_name, email), job:jobs(title, company)")
    .eq("id", d.job_candidate_id ?? "")
    .maybeSingle()
  const candidate = (link?.candidate ?? null) as { full_name?: string | null; email?: string | null } | null
  const job = (link?.job ?? null) as { title?: string | null; company?: string | null } | null
  if (!draft || !link || !candidate || !job || link.user_id !== d.user_id) {
    await fail(admin, d.id, "Bewerbung nicht mehr vorhanden")
    return "fehler"
  }
  if (!candidate.email) {
    await fail(admin, d.id, "Keine E-Mail-Adresse hinterlegt")
    return "fehler"
  }
  const status = String(link.status)
  const art = batch.art as "absage" | "einladung"
  if (["Abgesagt", "rejected", "Eingestellt", "hired"].includes(status) || (art === "einladung" && ["Eingeladen", "interviewed"].includes(status))) {
    await fail(admin, d.id, `Status inzwischen ${status}, nicht verschickt`)
    return "fehler"
  }

  const werte = { name: candidate.full_name || "Bewerberin, Bewerber", stelle: job.title || "die ausgeschriebene Stelle", firma: job.company || "unser Unternehmen" }
  const text = renderDraft(draft.text as string, werte)
  const betreff = renderDraft(draft.betreff as string, werte)

  // Letzte Sicherung: Absagen ohne Begründung zur Person. Geprüft wird der
  // Vorlagentext; Name, Stelle und Firma selbst zählen nicht (eine Firma
  // "Hilfe für Kinder" ist kein geschütztes Merkmal des Bewerbers).
  if (art === "absage" && !checkRejection(renderDraft(draft.text as string, { name: "Name", stelle: "Stelle", firma: "Firma" })).ok) {
    await fail(admin, d.id, "Absageprüfung nicht bestanden, nicht verschickt")
    return "fehler"
  }

  let replyTo: string | null = null
  if (art === "einladung" && batch.freigegeben_durch) {
    const { data: u } = await admin.auth.admin.getUserById(batch.freigegeben_durch as string)
    replyTo = u?.user?.email ?? null
  }
  const mail =
    art === "absage"
      ? buildRejectionMail({ to: candidate.email, candidateName: werte.name, jobTitle: werte.stelle, companyName: werte.firma, text })
      : buildInvitationMail({ to: candidate.email, subject: betreff, text, companyName: werte.firma, replyTo })

  let anbieterId: string
  try {
    anbieterId = await sendMailEuOnly({ ...mail, metadata: { revy_delivery: d.id }, idempotencyKey: d.id }, art === "absage" ? "Revy-Absage" : "Revy-Einladung")
  } catch (err) {
    await fail(admin, d.id, err instanceof Error ? err.message : String(err))
    return "fehler"
  }
  const jetzt = new Date().toISOString()
  await admin.from("revy_deliveries").update({ status: "gesendet", gesendet_am: jetzt, anbieter_id: anbieterId, updated_at: jetzt }).eq("id", d.id)

  // Folgen wie beim Versand von Hand: Status der Bewerbung und Protokoll.
  if (art === "absage") {
    await admin.from("job_candidates").update({ status: "Abgesagt" }).eq("id", link.id)
    await logDecisions(admin, [
      {
        userId: d.user_id,
        actorId: (batch.freigegeben_durch as string | null) ?? null,
        jobId: (link.job_id as string) ?? null,
        jobCandidateId: link.id as string,
        event: "absage_verschickt",
        detail: { weg: "revy", stapel: d.batch_id },
      },
    ])
  } else {
    await admin.from("job_candidates").update({ status: "Eingeladen", invited_at: jetzt }).eq("id", link.id)
  }
  return "gesendet"
}

async function finishBatches(admin: SupabaseClient, batchIds: Set<string>) {
  for (const id of batchIds) {
    const { data: offen } = await admin.from("revy_deliveries").select("id").eq("batch_id", id).in("status", ["geplant", "in_versand"])
    if (!offen?.length) await admin.from("revy_batches").update({ status: "versendet", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "freigegeben")
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Fällige Zustellungen verschicken, bis die Zeit abläuft. Mit batchId nur
 * dieser Stapel; dann wird auf die nächste geplante Mail gewartet, solange
 * die Zeit reicht (Staffelung).
 */
export async function processDue(
  admin: SupabaseClient,
  opts: { batchId?: string; deadline: number; now?: () => number; warten?: boolean } = { deadline: Date.now() + 60_000 },
): Promise<{ gesendet: number; fehler: number }> {
  const now = opts.now ?? Date.now
  const touched = new Set<string>()
  let gesendet = 0
  let fehler = 0

  // Hängengebliebene Zustellungen nicht erneut senden: Status ist unklar.
  await admin
    .from("revy_deliveries")
    .update({ status: "fehler", fehler: "Versand unterbrochen, Zustellung unklar. Bitte von Hand prüfen.", updated_at: new Date().toISOString() })
    .eq("status", "in_versand")
    .lte("updated_at", new Date(now() - STUCK_MS).toISOString())

  while (now() < opts.deadline) {
    let q = admin.from("revy_deliveries").select("id, user_id, batch_id, draft_id, job_candidate_id, ref, geplant_am").eq("status", "geplant").order("geplant_am", { ascending: true }).limit(1)
    if (opts.batchId) q = q.eq("batch_id", opts.batchId)
    const { data } = await q
    const next = ((data ?? []) as DeliveryRow[])[0]
    if (!next) break
    const wait = new Date(next.geplant_am).getTime() - now()
    if (wait > 0) {
      if (!opts.batchId || opts.warten === false || now() + wait >= opts.deadline) break
      await sleep(wait)
      continue
    }
    const { data: claimed } = await admin
      .from("revy_deliveries")
      .update({ status: "in_versand", updated_at: new Date().toISOString() })
      .eq("id", next.id)
      .eq("status", "geplant")
      .select("id")
    if (!claimed?.length) continue
    touched.add(next.batch_id)
    const r = await deliver(admin, next)
    if (r === "gesendet") gesendet++
    if (r === "fehler") fehler++
  }
  await finishBatches(admin, touched)
  return { gesendet, fehler }
}

// ── Zustellstatus aus dem Lettermint-Webhook ─────────────────────────────────

const ZUGESTELLT = new Set(["message.delivered"])
const ZURUECK = new Set(["message.hard_bounced", "message.failed", "message.policy_rejected", "message.suppressed", "message.spam_complaint"])

/**
 * Wendet ein Lettermint-Ereignis auf die Zustellung an. Zuordnung über das
 * Metadatum revy_delivery, sonst über die Nachrichten-ID. Ereignisse anderer
 * Mails (nicht von Revy) werden ignoriert.
 */
export async function applyDeliveryEvent(
  admin: SupabaseClient,
  ev: { event?: string; timestamp?: string; data?: { message_id?: string; metadata?: Record<string, unknown> | null } },
): Promise<"aktualisiert" | "ignoriert"> {
  const typ = ev.event ?? ""
  if (!ZUGESTELLT.has(typ) && !ZURUECK.has(typ) && typ !== "message.soft_bounced") return "ignoriert"
  const deliveryId = typeof ev.data?.metadata?.revy_delivery === "string" ? (ev.data.metadata.revy_delivery as string) : null
  const messageId = ev.data?.message_id ?? null
  if (!deliveryId && !messageId) return "ignoriert"

  let q = admin.from("revy_deliveries").select("id, status")
  q = deliveryId ? q.eq("id", deliveryId) : q.eq("anbieter_id", messageId as string)
  const { data } = await q.maybeSingle()
  if (!data) return "ignoriert"

  const jetzt = new Date().toISOString()
  if (ZUGESTELLT.has(typ)) {
    await admin.from("revy_deliveries").update({ status: "zugestellt", zugestellt_am: ev.timestamp ?? jetzt, fehler: null, updated_at: jetzt }).eq("id", data.id)
  } else if (ZURUECK.has(typ)) {
    await admin.from("revy_deliveries").update({ status: "zurueckgewiesen", fehler: typ.replace("message.", ""), updated_at: jetzt }).eq("id", data.id)
  } else {
    // Vorübergehend nicht zustellbar: Lettermint versucht es weiter.
    await admin.from("revy_deliveries").update({ fehler: "vorübergehend nicht zustellbar, Anbieter versucht es weiter", updated_at: jetzt }).eq("id", data.id)
  }
  return "aktualisiert"
}
