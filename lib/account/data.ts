import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsame Helfer für Datenexport und Kontolöschung (DSGVO Art. 17 und 20).
//
// Die Kerntabellen (jobs, candidates, job_candidates, user_profiles) hängen
// nicht per Fremdschlüssel mit "on delete cascade" am Nutzerkonto. Sie werden
// deshalb ausdrücklich über user_id gelöscht. Alle übrigen Tabellen mit
// Nutzerbezug (Terminplanung, Mail-Eingang, Protokoll, Feedback,
// Trainingsbeispiele) gehen beim Löschen des Auth-Kontos automatisch mit.
// ─────────────────────────────────────────────────────────────────────────────

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { persistSession: false } })
}

export { DELETE_CONFIRMATION } from "./constants"

/** Tabellen mit Spalte user_id, die zum Konto gehören. Reihenfolge = Export-Reihenfolge. */
export const ACCOUNT_TABLES = [
  "jobs",
  "candidates",
  "job_candidates",
  "decision_events",
  "inbound_emails",
  "scheduling_profiles",
  "meeting_types",
  "bookings",
  "booking_invites",
  "calendar_accounts",
  "product_feedback",
  "ai_training_examples",
] as const

/** Speicherbereiche, in denen Dateien unter "<user_id>/..." liegen. */
export const ACCOUNT_BUCKETS = ["resumes", "candidate-photos", "logos"] as const

/**
 * Spalten, die nie herausgegeben werden: verschlüsselte Kalender-Tokens und
 * Prüfwerte von Buchungslinks. Sie gehören zur Sicherheit des Systems, nicht
 * zu den Daten des Kontos, und wären außerhalb davon ein Risiko.
 */
export function stripSecrets<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (/token|secret|hash/i.test(k)) continue
    out[k] = v
  }
  return out as T
}

/**
 * Alle Dateipfade eines Kontos in einem Speicherbereich. Liegt die Datei in
 * einem Unterordner (resumes: <user>/<kandidat>/cv.pdf), wird eine Ebene tiefer
 * gesucht. Best-effort: Ein Fehler liefert, was bis dahin gefunden wurde.
 */
export async function listAccountFiles(db: SupabaseClient, bucket: string, userId: string): Promise<string[]> {
  const paths: string[] = []
  try {
    const { data: top } = await db.storage.from(bucket).list(userId, { limit: 1000 })
    for (const entry of top ?? []) {
      // Ordner haben kein id-Feld und keine Metadaten.
      if (!entry.id) {
        const { data: inner } = await db.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 })
        for (const f of inner ?? []) if (f.id) paths.push(`${userId}/${entry.name}/${f.name}`)
      } else {
        paths.push(`${userId}/${entry.name}`)
      }
    }
  } catch (err) {
    console.error(`[account] Dateien in ${bucket} nicht vollständig gelistet:`, err)
  }
  return paths
}

/** Gültigkeit der Download-Links im Export. */
export const EXPORT_LINK_SECONDS = 7 * 24 * 60 * 60

/** Baut den vollständigen Datenexport eines Kontos (DSGVO Art. 20). */
export async function buildAccountExport(
  db: SupabaseClient,
  user: { id: string; email?: string | null; created_at?: string | null },
  now = new Date(),
): Promise<Record<string, unknown>> {
  const { data: profile } = await db.from("user_profiles").select("*").eq("id", user.id).single()

  const tabellen: Record<string, unknown[]> = {}
  const fehlend: string[] = []
  for (const table of ACCOUNT_TABLES) {
    const { data, error } = await db.from(table).select("*").eq("user_id", user.id).limit(20000)
    if (error) {
      // Tabelle fehlt (Migration nicht eingespielt): kein Fehler, nur leer.
      fehlend.push(`${table}: nicht verfügbar`)
      continue
    }
    tabellen[table] = (data ?? []).map((r) => stripSecrets(r as Record<string, unknown>))
  }

  const dateien: Array<{ bereich: string; pfad: string; link: string | null }> = []
  for (const bucket of ACCOUNT_BUCKETS) {
    const paths = await listAccountFiles(db, bucket, user.id)
    if (paths.length === 0) continue
    const { data: signed } = await db.storage.from(bucket).createSignedUrls(paths, EXPORT_LINK_SECONDS)
    for (const p of paths) {
      dateien.push({ bereich: bucket, pfad: p, link: signed?.find((x) => x.path === p)?.signedUrl ?? null })
    }
  }

  return {
    export: {
      erstellt_am: now.toISOString(),
      links_gueltig_bis: new Date(now.getTime() + EXPORT_LINK_SECONDS * 1000).toISOString(),
      format: "Revetly-Datenexport, Version 1",
    },
    konto: { id: user.id, email: user.email ?? null, angelegt_am: user.created_at ?? null },
    profil: profile ? stripSecrets(profile as Record<string, unknown>) : null,
    ...tabellen,
    dateien,
    hinweise: [
      "Rechnungen findest du im Kundenportal unter Abonnement → Abo verwalten.",
      "Zugangsdaten verbundener Kalender und Prüfwerte von Buchungslinks sind aus Sicherheitsgründen nicht enthalten.",
      ...fehlend,
    ],
  }
}

export type DeleteResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Löscht ein Konto endgültig (DSGVO Art. 17). Reihenfolge mit Absicht:
 *   1. Laufende Abos kündigen. Scheitert das, bricht die Löschung ab: Ein
 *      gelöschtes Konto, das weiter abgerechnet wird, wäre der schlimmste
 *      Ausgang.
 *   2. Dateien entfernen (Lebensläufe, Anschreiben, Fotos, Logo).
 *   3. Kerntabellen über user_id löschen (ohne Fremdschlüssel-Kaskade).
 *   4. Auth-Konto löschen. Alles mit Fremdschlüssel auf auth.users geht mit.
 *
 * Bleibt bestehen: Rechnungen beim Zahlungsanbieter (Aufbewahrungspflicht)
 * und die Sperre der Firmendomain für die Probestelle (free_trial_domains,
 * ohne Personenbezug), damit sich niemand durch Löschen eine neue erschleicht.
 *
 * `cancelSubscriptions` ist übergeben statt fest verdrahtet, damit sich der
 * Abbruch bei einem Stripe-Fehler testen lässt.
 */
export async function deleteAccount(
  db: SupabaseClient,
  userId: string,
  cancelSubscriptions: (customerId: string) => Promise<void>,
): Promise<DeleteResult> {
  const { data: profile } = await db.from("user_profiles").select("stripe_customer_id").eq("id", userId).single()

  const customerId = (profile?.stripe_customer_id as string | null | undefined) ?? null
  if (customerId) {
    try {
      await cancelSubscriptions(customerId)
    } catch (err) {
      console.error("[account/delete] Abo-Kündigung fehlgeschlagen, Löschung abgebrochen:", err)
      return {
        ok: false,
        status: 502,
        error: "Dein Abo konnte nicht gekündigt werden. Das Konto wurde nicht gelöscht. Bitte versuche es erneut oder schreib uns.",
      }
    }
  }

  for (const bucket of ACCOUNT_BUCKETS) {
    const paths = await listAccountFiles(db, bucket, userId)
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) console.error(`[account/delete] ${bucket}:`, error.message)
    }
  }

  for (const table of ["job_candidates", "candidates", "jobs"]) {
    const { error } = await db.from(table).delete().eq("user_id", userId)
    if (error) {
      console.error(`[account/delete] ${table}:`, error.message)
      return { ok: false, status: 500, error: "Löschung unvollständig. Bitte erneut versuchen." }
    }
  }
  await db.from("user_profiles").delete().eq("id", userId)

  const { error: authError } = await db.auth.admin.deleteUser(userId)
  if (authError) {
    console.error("[account/delete] Auth-Konto:", authError.message)
    return { ok: false, status: 500, error: "Löschung unvollständig. Bitte erneut versuchen." }
  }
  return { ok: true }
}
