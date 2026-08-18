import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

// Missbrauchsschutz für die Endpunkte, die ohne Anmeldung erreichbar sind.
//
// Die öffentlichen Routen sind per Design von jedem aufrufbar, der einen
// Stellen- oder Buchungslink hat. Zwei davon kosten bei jedem Aufruf echtes
// Geld: /api/public/apply verbraucht einen Match aus dem Kontingent des Kunden
// und startet einen Modelllauf, und jede Route schreibt in die Datenbank oder
// verschickt Mail. Ohne Begrenzung lässt sich ein Kontingent in Minuten
// leerschießen.

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Absenderkennung aus den Proxy-Kopfzeilen.
 *
 * Zurückgegeben wird ein Hash, nie die Adresse selbst: Eine IP ist ein
 * personenbezogenes Datum, und für das Zählen genügt ein Pseudonym. Mit
 * RATE_LIMIT_SALT ist der Hash auch gegen das Durchprobieren des IPv4-Raums
 * geschützt, falls jemand die Tabelle in die Hände bekommt.
 */
export function requesterKey(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim()
  if (!ip) return null
  return createHash("sha256")
    .update(`${process.env.RATE_LIMIT_SALT ?? "revetly"}:${ip}`)
    .digest("hex")
    .slice(0, 32)
}

/** Stabiler Schlüssel für eine E-Mail-Adresse (ebenfalls nur als Hash). */
export function emailKey(email: string): string {
  return createHash("sha256")
    .update(`${process.env.RATE_LIMIT_SALT ?? "revetly"}:${email.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32)
}

/**
 * Zählt einen Zugriff. Schlägt die Zählung selbst fehl (fehlende Migration,
 * Datenbank nicht erreichbar), wird der Zugriff ERLAUBT.
 *
 * Das ist eine bewusste Entscheidung. Ein Zähler, der bei einer Störung alle
 * Bewerbungen abweist, richtet mehr Schaden an als der Missbrauch, den er
 * verhindern soll. Die Grenzen sind eine Bremse, keine Zugangskontrolle; die
 * echten Schranken (Kontingent, Signaturprüfung, Token) liegen woanders.
 */
export async function consumeRateLimit(
  db: SupabaseClient,
  bucket: string,
  subject: string | null,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!subject) return { allowed: true, remaining: limit, retryAfterSeconds: 0 }

  try {
    const { data, error } = await db.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_subject: subject,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error || !data) {
      console.error("[rate-limit] Zählung fehlgeschlagen, Zugriff erlaubt:", error?.message)
      return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
    }
    const d = data as Record<string, unknown>
    return {
      allowed: d.allowed !== false,
      remaining: Number(d.remaining ?? 0),
      retryAfterSeconds: Number(d.retry_after_seconds ?? windowSeconds),
    }
  } catch (err) {
    console.error("[rate-limit] Zählung fehlgeschlagen, Zugriff erlaubt:", err)
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
  }
}

/** Einheitliche Antwort, wenn eine Grenze erreicht ist. */
export function tooManyRequests(result: RateLimitResult, message: string): Response {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dateiprüfung
// ─────────────────────────────────────────────────────────────────────────────

/** Obergrenze je Datei. Ein Lebenslauf über 10 MB ist kein Lebenslauf. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const ERLAUBTE_TYPEN = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
  "text/rtf",
])

const ERLAUBTE_ENDUNGEN = ["pdf", "doc", "docx", "txt", "rtf"]

/**
 * Prüft eine hochgeladene Bewerbungsdatei auf Größe und Art.
 *
 * Der Dateityp wird über Endung ODER gemeldeten MIME-Typ akzeptiert: Browser
 * melden bei .docx gelegentlich einen leeren oder generischen Typ, und eine
 * gültige Bewerbung soll nicht an einer Kopfzeile scheitern. Die Größe ist
 * dagegen hart.
 */
export function pruefeDatei(file: File, feld: string): { ok: true } | { ok: false; fehler: string } {
  if (file.size === 0) return { ok: false, fehler: `${feld} ist leer.` }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      fehler: `${feld} ist zu groß (${Math.round(file.size / 1024 / 1024)} MB). Erlaubt sind ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    }
  }

  const endung = file.name.split(".").pop()?.toLowerCase() ?? ""
  const typOk = ERLAUBTE_TYPEN.has(file.type)
  const endungOk = ERLAUBTE_ENDUNGEN.includes(endung)

  if (!typOk && !endungOk) {
    return { ok: false, fehler: `${feld}: Nur PDF, Word, RTF oder Text sind erlaubt.` }
  }
  return { ok: true }
}
