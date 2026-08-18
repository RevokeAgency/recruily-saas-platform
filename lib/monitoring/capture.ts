import { createHash } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { anonymizeText } from "@/lib/training/anonymize"

// Fehler-Monitoring.
//
// Bis hierher endete jeder Fehler in console.error und damit in den
// Vercel-Logs, die niemand liest. Diese Datei ist die eine Stelle, über die
// Fehler erfasst werden.
//
// Drei Festlegungen:
//
//  1. console.error bleibt IMMER erhalten, zusätzlich zum Datenbankeintrag.
//     Die Datenbank ist die bequeme Sicht, die Logs sind der Rückfall. Wäre
//     die Datenbank die einzige Quelle, ginge ausgerechnet die Meldung über
//     eine kaputte Datenbank verloren.
//
//  2. Nichts hier darf werfen. Ein Monitoring, das den überwachten Vorgang
//     abbricht, ist schlimmer als keines.
//
//  3. Meldung, Stacktrace und Zusatzangaben werden vor dem Speichern
//     pseudonymisiert. Fehlermeldungen enthalten regelmäßig Bruchstücke der
//     verarbeiteten Daten, und das sind hier Bewerberdaten.

export type ErrorSource = "server" | "client" | "cron"

export interface CaptureContext {
  route?: string
  method?: string
  status?: number
  source?: ErrorSource
  level?: "error" | "warn"
  userId?: string | null
  /** Zusatzangaben. Werden pseudonymisiert und auf 4 KB gekürzt. */
  extra?: Record<string, unknown>
}

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Entfernt alles, was zwischen zwei Vorkommen desselben Fehlers wechselt, damit
 * gleichartige Fehler denselben Fingerabdruck bekommen: Kennungen, Zahlen,
 * Zeitstempel, Anführungszeichen-Inhalte.
 *
 * Ohne das erzeugt „Kandidat 7f3a… nicht gefunden" bei jedem Aufruf eine neue
 * Gruppe, und die Gruppierung wäre wertlos.
 */
export function normalizeMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, "<zeit>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    .replace(/"[^"]{0,200}"/g, '"<wert>"')
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400)
}

export function fingerprint(parts: {
  source: string
  route?: string
  name?: string
  message: string
}): string {
  return createHash("sha256")
    .update(
      [parts.source, parts.route ?? "", parts.name ?? "", normalizeMessage(parts.message)].join("|"),
    )
    .digest("hex")
    .slice(0, 40)
}

/** Kürzt und pseudonymisiert einen Text vor dem Speichern. */
function saeubern(text: string | null | undefined, maxLen: number): string | null {
  if (!text) return null
  return anonymizeText(text).slice(0, maxLen)
}

interface Erfasst {
  fingerprint: string
  name: string
  message: string
  isNew: boolean
}

/**
 * Erfasst einen Fehler. Gibt zurück, ob es sich um eine neue Fehlerart handelt,
 * damit der Aufrufer sofort benachrichtigen kann. Wirft nie.
 */
export async function captureError(
  error: unknown,
  ctx: CaptureContext = {},
): Promise<Erfasst | null> {
  const name = error instanceof Error ? error.name : typeof error
  const rawMessage = error instanceof Error ? error.message : String(error)
  const rawStack = error instanceof Error ? error.stack : undefined
  const source = ctx.source ?? "server"

  // Rückfall zuerst: Selbst wenn alles Weitere scheitert, steht der Fehler im Log.
  console.error(`[${source}]${ctx.route ? ` ${ctx.route}` : ""} ${name}: ${rawMessage}`, rawStack ?? "")

  const message = saeubern(rawMessage, 2000) || "Unbekannter Fehler"
  const fp = fingerprint({ source, route: ctx.route, name, message })

  try {
    const db = admin()
    if (!db) return null

    const extra = ctx.extra
      ? saeubern(JSON.stringify(ctx.extra), 4000)
      : null

    const { data, error: rpcError } = await db.rpc("record_error", {
      p_fingerprint: fp,
      p_level: ctx.level ?? "error",
      p_source: source,
      p_name: name.slice(0, 120),
      p_message: message,
      p_stack: saeubern(rawStack, 6000),
      p_route: ctx.route?.slice(0, 300) ?? null,
      p_method: ctx.method?.slice(0, 10) ?? null,
      p_status: ctx.status ?? null,
      p_user_id: ctx.userId ?? null,
      p_context: extra ? { extra } : null,
    })

    if (rpcError) {
      // Fehlt Migration 027, bleibt es beim Log. Kein zweiter Fehler daraus.
      console.error("[monitoring] Fehler nicht gespeichert:", rpcError.message)
      return null
    }

    const d = (data ?? {}) as Record<string, unknown>
    return { fingerprint: fp, name, message, isNew: d.is_new === true }
  } catch (err) {
    console.error("[monitoring] Erfassung fehlgeschlagen:", err)
    return null
  }
}

/**
 * Umhüllt einen Route-Handler. Erfasst alles, was durchschlägt, und antwortet
 * mit 500, statt den Fehler an Next weiterzureichen.
 *
 * Bewusst kein Ersatz für die bestehenden try/catch-Blöcke: Die fangen
 * erwartbare Fälle ab und geben brauchbare Meldungen. Diese Hülle ist das Netz
 * darunter, für das Unerwartete.
 */
export function withErrorCapture<T extends unknown[]>(
  route: string,
  handler: (req: Request, ...rest: T) => Promise<Response>,
): (req: Request, ...rest: T) => Promise<Response> {
  return async (req: Request, ...rest: T) => {
    try {
      return await handler(req, ...rest)
    } catch (err) {
      const erfasst = await captureError(err, {
        route,
        method: req.method,
        status: 500,
        source: route.startsWith("/api/cron") ? "cron" : "server",
      })
      if (erfasst?.isNew) await notifyNewError(erfasst, route)
      return Response.json({ error: "Unerwarteter Fehler." }, { status: 500 })
    }
  }
}

/**
 * Sofortmeldung bei einer NEUEN Fehlerart. Wiederholungen sammelt der
 * Tagesbericht, sonst kommt bei einem Fehler, der tausendmal auftritt,
 * tausendmal Post.
 */
export async function notifyNewError(erfasst: Erfasst, route?: string): Promise<void> {
  const to = process.env.ERROR_NOTIFY_EMAIL?.trim()
  if (!to) return

  try {
    const { sendMail, escapeHtml, shell } = await import("@/lib/email/client")
    const body = `
      <p style="margin:0 0 16px;">Ein neuer Fehler ist zum ersten Mal aufgetreten.</p>
      <p style="margin:0 0 8px;"><strong>${escapeHtml(erfasst.name)}</strong></p>
      <p style="margin:0 0 16px; font-family:monospace; font-size:13px; background:#F4F7F6; padding:12px; border-radius:8px;">
        ${escapeHtml(erfasst.message)}
      </p>
      ${route ? `<p style="margin:0 0 8px; color:#64707B;">Route: ${escapeHtml(route)}</p>` : ""}
      <p style="margin:0; color:#64707B; font-size:12px;">Kennung: ${escapeHtml(erfasst.fingerprint)}</p>
    `
    const ok = await sendMail(
      { to, subject: `Neuer Fehler: ${erfasst.name}`, html: shell("Revetly", body) },
      "Fehlermeldung",
    )
    if (ok) {
      const db = admin()
      await db?.rpc("mark_error_notified", { p_fingerprint: erfasst.fingerprint })
    }
  } catch (err) {
    console.error("[monitoring] Benachrichtigung fehlgeschlagen:", err)
  }
}

/** Erfassen und bei Bedarf benachrichtigen, in einem Aufruf. */
export async function captureAndNotify(error: unknown, ctx: CaptureContext = {}): Promise<void> {
  const erfasst = await captureError(error, ctx)
  if (erfasst?.isNew) await notifyNewError(erfasst, ctx.route)
}
